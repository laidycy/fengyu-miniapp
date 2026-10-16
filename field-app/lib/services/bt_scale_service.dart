import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:permission_handler/permission_handler.dart';

/// 无限量蓝牙电子秤（WXL-T12 / QDI-1）对接服务
///
/// 协议要点（见《蓝牙电子秤对接方案_20261012.md》）：
///  - Service   : 0000ffe0-0000-1000-8000-00805f9b34fb
///  - Character : 0000ffe1-0000-1000-8000-00805f9b34fb（写入 + Notify）
///  - 数据帧    : +0050.00,0000.00kg\r\n   （首字符 + 稳定 / - 动态；逗号前净重，逗号后皮重，尾 2 字符单位）
///  - 电量帧    : DC100%
///  - 指令      : P 读一次 / T 去皮 / Z 置零 / V 读电量 / QZ1000JS 设kg / QZ4000JS 设斤
class ScaleReading {
  /// 原始净重字符串（如 "4.840"）
  final String rawNet;
  final String sign; // '+' 正 / '-' 负
  final double net; // 原始单位净重
  final double tare; // 原始单位皮重
  final String unit; // kg / g / jin / lb
  final bool stable; // 是否稳定
  final double jin; // 换算成「斤」的实时值（APP 计价单位）
  final bool avgReady; // 近 3 秒滚动平均已就绪（波动时可用平均值录入）
  final double avgJin; // 近 3 秒滚动平均（斤）

  const ScaleReading({
    required this.rawNet,
    required this.sign,
    required this.net,
    required this.tare,
    required this.unit,
    required this.stable,
    required this.jin,
    required this.avgReady,
    required this.avgJin,
  });

  /// 展示用文本（斤，2 位小数）
  String get jinText => jin.toStringAsFixed(2);

  /// 平均值展示文本
  String get avgJinText => avgJin.toStringAsFixed(2);

  /// 波动中但平均值与实时值显示一致 → 视同已稳定
  bool get avgMatchesRealtime =>
      !stable && avgReady && avgJinText == jinText;

  /// 可录入的值：稳定 / 平均≈实时 用实时值；纯波动用近 3 秒平均值
  double get adoptJin => (stable || avgMatchesRealtime) ? jin : avgJin;

  /// 是否允许录入（稳定，或平均值已就绪）
  bool get adoptable => stable || avgReady;

  @override
  String toString() =>
      '${sign}${rawNet} ($unit) → ${jinText} 斤';
}

enum BtScaleStatus { disconnected, scanning, connecting, connected }

/// 蓝牙电子秤服务（单例，ChangeNotifier，页面直接监听刷新）
class BtScaleService extends ChangeNotifier {
  BtScaleService._();
  static final BtScaleService instance = BtScaleService._();

  static final Guid serviceUuid =
      Guid('0000ffe0-0000-1000-8000-00805f9b34fb');
  static final Guid notifyCharUuid =
      Guid('0000ffe1-0000-1000-8000-00805f9b34fb');

  BtScaleStatus _status = BtScaleStatus.disconnected;
  BtScaleStatus get status => _status;

  String? _deviceName;
  String? get deviceName => _deviceName;

  String? _error;
  String? get error => _error;

  List<ScanResult> _scanResults = [];
  List<ScanResult> get scanResults => List.unmodifiable(_scanResults);

  ScaleReading? _reading;
  ScaleReading? get reading => _reading;

  String? _battery; // 如 "DC100%"
  String? get battery => _battery;

  BluetoothDevice? _device;
  BluetoothCharacteristic? _char;
  StreamSubscription<List<int>>? _notifySub;
  StreamSubscription<BluetoothConnectionState>? _connSub;
  StreamSubscription<List<ScanResult>>? _scanSub;

  final StringBuffer _frameBuf = StringBuffer();

  /// 调试开关：强制视为“波动”，用于验证 3 秒平均录入链路（发布时保持 false）
  static const bool _forceUnstable = false;

  /// 最近若干次读数（3.5s 窗口：既用于稳定判定，也用于 3s 滚动平均）
  final List<({DateTime t, double v})> _hist = [];

  void _pushHist(double net) {
    final now = DateTime.now();
    _hist.add((t: now, v: net));
    _hist.removeWhere((e) => now.difference(e.t) >
        const Duration(milliseconds: 3500));
  }

  /// 按时间/幅度判定是否稳定：最近 1.2s 内数值波动 ≤ 0.04kg 且样本足够
  bool _isStableNow(double net) {
    _pushHist(net);
    final now = DateTime.now();
    final recent = _hist
        .where((e) => now.difference(e.t) <=
            const Duration(milliseconds: 1200))
        .toList();
    if (recent.length < 6) return false;
    if (now.difference(recent.first.t) <
        const Duration(milliseconds: 1200)) {
      return false;
    }
    double mn = recent.first.v, mx = recent.first.v;
    for (final e in recent) {
      mn = math.min(mn, e.v);
      mx = math.max(mx, e.v);
    }
    return (mx - mn) <= 0.04;
  }

  /// 近 3 秒滚动平均（用于鱼摆动等持续波动场景的录入值）
  ({double net, bool ready}) _avg3s() {
    final now = DateTime.now();
    final win = _hist
        .where((e) => now.difference(e.t) <= const Duration(seconds: 3))
        .toList();
    if (win.length < 8 ||
        now.difference(win.first.t) < const Duration(seconds: 2)) {
      return (net: _hist.isEmpty ? 0 : _hist.last.v, ready: false);
    }
    double sum = 0;
    for (final e in win) {
      sum += e.v;
    }
    return (net: sum / win.length, ready: true);
  }

  // ── 权限 ──────────────────────────────────────────────
  /// 只负责触发系统权限弹窗（首次使用必弹），**不根据返回状态硬性拦截**：
  /// Android 12+（含鸿蒙4.x）只要「附近的设备」权限即可扫描，定位因 manifest
  /// maxSdkVersion=30 在 12+ 上不被声明，permission_handler 会误报未授权，
  /// 旧逻辑三项全过才放行 → 鸿蒙上被误杀。真正缺权限时由 startScan 抛错兜底。
  Future<void> _requestPermissions() async {
    if (!Platform.isAndroid) return;
    try {
      await [
        Permission.bluetoothScan,
        Permission.bluetoothConnect,
        Permission.locationWhenInUse,
      ].request();
    } catch (_) {}
  }

  // ── 扫描 ──────────────────────────────────────────────
  // 鸿蒙4.x / 部分安卓ROM：服务端 128-bit UUID 过滤扫描会静默失败（不抛异常、返回空），
  // 所以采用「全量扫描 + 客户端识别排序」策略（见 _rankResults）。
  static final List<String> _scaleNameHints = [
    'SCL', 'SCALE', 'WXL', 'QDI', 'T12', '电子秤',
  ];

  bool _looksLikeScale(ScanResult r) {
    final adv = r.advertisementData;
    if (adv.serviceUuids.contains(serviceUuid)) return true;
    final name =
        (adv.advName.isNotEmpty ? adv.advName : r.device.platformName)
            .toUpperCase();
    for (final h in _scaleNameHints) {
      if (name.contains(h.toUpperCase())) return true;
    }
    return false;
  }

  /// 供 UI 给疑似秤加标记
  bool isLikelyScale(ScanResult r) => _looksLikeScale(r);

  List<ScanResult> _rankResults(List<ScanResult> results) {
    final list = results.toList()
      ..sort((a, b) {
        final sa = _looksLikeScale(a) ? 0 : 1;
        final sb = _looksLikeScale(b) ? 0 : 1;
        if (sa != sb) return sa.compareTo(sb);
        return b.rssi.compareTo(a.rssi);
      });
    return list;
  }

  Future<void> startScan({Duration timeout = const Duration(seconds: 15)}) async {
    _error = null;
    await _requestPermissions();
    if (!await FlutterBluePlus.isSupported) {
      _error = '当前设备不支持蓝牙';
      _status = BtScaleStatus.disconnected;
      notifyListeners();
      return;
    }
    final adapter = await FlutterBluePlus.adapterState.first;
    if (adapter != BluetoothAdapterState.on) {
      _error = '蓝牙未开启，请先打开蓝牙';
      _status = BtScaleStatus.disconnected;
      notifyListeners();
      return;
    }

    _scanResults = [];
    _status = BtScaleStatus.scanning;
    notifyListeners();

    _scanSub?.cancel();
    _scanSub = FlutterBluePlus.scanResults.listen((results) {
      // 全量接收，客户端识别/排序（鸿蒙兼容）
      _scanResults = _rankResults(results);
      notifyListeners();
    });

    // 不做服务端 128-bit UUID 过滤（鸿蒙4.x上会静默返回空），直接全量扫描
    try {
      await FlutterBluePlus.startScan(timeout: timeout);
    } catch (_) {
      // 退化为 legacy 扫描 API（部分 HarmonyOS/老 ROM 上更稳，单次上限~12s）
      try {
        await FlutterBluePlus.startScan(
          timeout: const Duration(seconds: 12),
          androidLegacy: true,
        );
        timeout = const Duration(seconds: 12);
      } catch (e) {
        // 走到这里一般是权限/系统层面拒绝（SecurityException）
        _error = '无法启动蓝牙扫描（$e）。请检查：'
            '①系统设置 → 应用和服务 → 应用管理 → 丰鱼管理 → 权限，'
            '允许「附近的设备」（鸿蒙）/ 蓝牙扫描、连接，以及「位置」权限 '
            '②关闭其他正连着秤的手机/App';
        _status = BtScaleStatus.disconnected;
        notifyListeners();
        return;
      }
    }

    // 扫描结束复位
    await Future.delayed(timeout + const Duration(milliseconds: 500));
    if (_status == BtScaleStatus.scanning) {
      await stopScan();
      _status = BtScaleStatus.disconnected;
      if (_scanResults.isEmpty) {
        _error = '未搜到任何蓝牙设备。请检查：①秤已开机且蓝牙已开启 ②秤与手机在3米内 '
            '③系统设置里已授予「附近的设备」和「位置」权限 ④已关闭其他连接着秤的手机/App';
      }
      notifyListeners();
    }
  }

  Future<void> stopScan() async {
    try {
      if (FlutterBluePlus.isScanningNow) await FlutterBluePlus.stopScan();
    } catch (_) {}
    await _scanSub?.cancel();
    _scanSub = null;
  }

  // ── 连接 ──────────────────────────────────────────────
  Future<void> connect(BluetoothDevice device) async {
    await stopScan();
    _error = null;
    _status = BtScaleStatus.connecting;
    _deviceName = device.platformName.isNotEmpty
        ? device.platformName
        : device.remoteId.str;
    notifyListeners();

    try {
      // 连接：GATT 133 多为瞬时错误，重试几次
      Object? lastErr;
      for (var attempt = 1; attempt <= 3; attempt++) {
        try {
          await device.connect(timeout: const Duration(seconds: 15));
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          try {
            await device.disconnect();
          } catch (_) {}
          await Future.delayed(const Duration(milliseconds: 700));
        }
      }
      if (lastErr != null) {
        _error = '连接失败：$lastErr';
        _onDisconnected();
        return;
      }
      _device = device;

      // 断连监听
      _connSub?.cancel();
      _connSub = device.connectionState.listen((s) {
        if (s == BluetoothConnectionState.disconnected) {
          _onDisconnected();
        }
      });

      final services = await device.discoverServices();
      BluetoothCharacteristic? target;
      for (final s in services) {
        if (s.serviceUuid == serviceUuid) {
          for (final c in s.characteristics) {
            if (c.characteristicUuid == notifyCharUuid) {
              target = c;
              break;
            }
          }
        }
      }
      if (target == null) {
        // 退一步：取任一可 notify 的特征值
        for (final s in services) {
          for (final c in s.characteristics) {
            if (c.properties.notify || c.properties.indicate) {
              target = c;
              break;
            }
          }
          if (target != null) break;
        }
      }
      if (target == null) {
        _error = '未找到称重数据通道，可能不是支持的电子秤';
        await device.disconnect();
        _onDisconnected();
        return;
      }

      _char = target;
      _hist.clear();
      _frameBuf.clear();
      _notifySub?.cancel();
      _notifySub = target.onValueReceived.listen(_onBytes);
      await target.setNotifyValue(true);

      _status = BtScaleStatus.connected;
      notifyListeners();

      // 连上先读一次电量
      unawaited(send('V'));
    } catch (e) {
      _error = '连接失败：$e';
      _onDisconnected();
    }
  }

  void _onDisconnected() {
    _notifySub?.cancel();
    _notifySub = null;
    _connSub?.cancel();
    _connSub = null;
    _char = null;
    _device = null;
    _reading = null;
    _battery = null;
    _status = BtScaleStatus.disconnected;
    notifyListeners();
  }

  Future<void> disconnect() async {
    try {
      await _device?.disconnect();
    } catch (_) {}
    _onDisconnected();
  }

  // ── 指令 ──────────────────────────────────────────────
  Future<void> send(String cmd) async {
    final c = _char;
    if (c == null) {
      _error = '未连接电子秤，无法发送指令';
      notifyListeners();
      return;
    }
    // 注意：本款 WXL-T12 实测蓝牙模块不回传下行指令（去皮/置零/读取无效），
    // 此处保留写入能力，以备后续批次支持。
    try {
      await c.write(utf8.encode('$cmd\r\n'), withoutResponse: true);
    } catch (_) {
      try {
        await c.write(utf8.encode('$cmd\r\n'), withoutResponse: false);
      } catch (e) {
        _error = '发送指令失败：$e';
        notifyListeners();
      }
    }
  }

  Future<void> readOnce() => send('P');
  Future<void> tare() => send('T');
  Future<void> zero() => send('Z');
  Future<void> readBattery() => send('V');

  // ── 接收解析 ──────────────────────────────────────────
  void _onBytes(List<int> bytes) {
    final text = utf8.decode(bytes, allowMalformed: true);
    _frameBuf.write(text);
    var buf = _frameBuf.toString();
    // 按行切分，防止粘包/半包
    while (true) {
      final sep = buf.indexOf(RegExp(r'[\r\n]'));
      if (sep < 0) break;
      final frame = buf.substring(0, sep);
      buf = buf.substring(sep + 1);
      if (frame.trim().isNotEmpty) _parseFrame(frame.trim());
    }
    _frameBuf.clear();
    if (buf.isNotEmpty) _frameBuf.write(buf);
  }

  /// 兼容两种帧格式：
  ///  1) 本机实测（WXL-T12 RS232 格式）：ST,NT,+  4.840kg   （ST 稳定 / US 动态；NT 净重，GS 毛重）
  ///  2) 文档称为“协议12”的通用格式：+0050.00,0000.00kg （逗号前净重 / 后皮重）
  void _parseFrame(String frame) {
    // 电量帧
    if (frame.startsWith('DC')) {
      _battery = frame;
      notifyListeners();
      return;
    }

    final fields = frame.split(',');
    // 非重量帧（指令回执等）忽略
    if (fields.length < 2 || !RegExp(r'[0-9]').hasMatch(frame)) {
      return;
    }
    String sign = '+';
    String unit = 'kg';
    double net = 0;
    double tare = 0;
    bool stable = false;

    if (fields.length >= 3) {
      // 格式一：ST,NT,+  4.840kg
      final status = fields[0].trim().toUpperCase();
      final vTok = fields[2].trim();
      sign = vTok.startsWith('-') ? '-' : '+';
      net = double.tryParse(
              RegExp(r'[0-9]+(\.[0-9]+)?').firstMatch(vTok)?.group(0) ??
                  '') ??
          0;
      unit = RegExp(r'(kg|jin|lb|g|t)$')
              .firstMatch(vTok.toLowerCase())
              ?.group(1) ??
          'kg';
      // 秤的 ST/US 标志不可靠，主要以时间/幅度判定；US 则强制视为不稳定
      stable = _isStableNow(net) && status != 'US';
    } else if (fields.length == 2) {
      // 格式二：+0050.00,0000.00kg
      final netRaw = fields[0];
      final restRaw = fields[1];
      sign = netRaw.startsWith('-') ? '-' : '+';
      net = double.tryParse(netRaw.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;
      tare =
          double.tryParse(restRaw.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;
      unit = RegExp(r'(kg|jin|lb|g|t)$')
              .firstMatch(restRaw.toLowerCase())
              ?.group(1) ??
          'kg';
      stable = _isStableNow(net);
    } else {
      return; // 无法识别的帧，忽略
    }

    if (_forceUnstable) stable = false;
    final avg = _avg3s();

    _reading = ScaleReading(
      rawNet: net.toStringAsFixed(3),
      sign: sign,
      net: net,
      tare: tare,
      unit: unit,
      stable: stable,
      jin: _toJin(net, unit),
      avgReady: avg.ready,
      avgJin: _toJin(avg.net, unit),
    );
    notifyListeners();
  }

  static double _toJin(double v, String unit) {
    switch (unit) {
      case 'kg':
        return v * 2;
      case 'g':
        return v / 500;
      case 'jin':
        return v;
      case 'lb':
        return v * 0.90718474;
      case 't':
        return v * 2000;
      default:
        return v * 2;
    }
  }

  @override
  void dispose() {
    _scanSub?.cancel();
    _notifySub?.cancel();
    _connSub?.cancel();
    super.dispose();
  }
}
