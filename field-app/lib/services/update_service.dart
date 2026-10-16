import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config.dart';

/// 远端版本信息（对应服务器 uploads/dl/app_version.json）
class RemoteVersion {
  final int versionCode;
  final String versionName;
  final String url;
  final String note;
  final bool forceUpdate;

  const RemoteVersion({
    required this.versionCode,
    required this.versionName,
    required this.url,
    this.note = '',
    this.forceUpdate = false,
  });

  factory RemoteVersion.fromJson(Map<String, dynamic> j) => RemoteVersion(
        versionCode: (j['versionCode'] as num?)?.toInt() ?? 0,
        versionName: j['versionName']?.toString() ?? '',
        url: j['url']?.toString() ?? '',
        note: j['note']?.toString() ?? '',
        forceUpdate: j['forceUpdate'] == true,
      );
}

/// 用户主动取消下载时抛出
class DownloadCancelled implements Exception {
  @override
  String toString() => '下载已取消';
}

/// App 内更新服务：检查远端版本 → 流式下载 APK（带进度、可取消）→ 触发系统安装
class UpdateService {
  UpdateService._();
  static final UpdateService instance = UpdateService._();

  /// 版本信息 JSON 地址（与 kApiBase 同主机；kApiBase 以 /api 结尾，需换 path）
  String get _versionJsonUrl {
    final base = Uri.parse(kApiBase);
    return Uri(
      scheme: base.scheme,
      host: base.host,
      path: '/uploads/dl/app_version.json',
    ).toString();
  }

  /// 检查更新；已是最新 / 网络失败返回 null
  Future<RemoteVersion?> checkUpdate() async {
    final res = await http
        .get(Uri.parse(_versionJsonUrl))
        .timeout(const Duration(seconds: 15));
    if (res.statusCode != 200) return null;
    final j = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    final remote = RemoteVersion.fromJson(j);
    if (remote.url.isEmpty || remote.versionCode <= kAppVersionCode) return null;
    return remote;
  }

  /// 流式下载 APK 到应用临时目录。
  /// [onProgress]：(已收字节, 总字节；未知时 total=-1)。
  /// [shouldCancel]：每次收到数据块时回调，返回 true 则停止并抛 [DownloadCancelled]。
  /// 失败/取消会删除已下载的部分文件。
  Future<File> downloadApk(
    String url, {
    void Function(int received, int total)? onProgress,
    bool Function()? shouldCancel,
  }) async {
    final dir = await getTemporaryDirectory();
    final file = File(
        '${dir.path}/fengyu_update_${DateTime.now().millisecondsSinceEpoch ~/ 1000}.apk');
    final client = http.Client();
    try {
      final req = http.Request('GET', Uri.parse(url));
      final streamReq = await client.send(req);
      if (streamReq.statusCode != 200) {
        throw Exception('下载失败（HTTP ${streamReq.statusCode}）');
      }
      final total = int.tryParse(streamReq.headers['content-length'] ?? '') ?? -1;
      var received = 0;
      final sink = file.openWrite();
      final sub = streamReq.stream.listen(
        (chunk) {
          if (shouldCancel?.call() == true) {
            throw DownloadCancelled();
          }
          sink.add(chunk);
          received += chunk.length;
          onProgress?.call(received, total);
        },
        onDone: () => sink.close(),
        onError: (Object _) => sink.close(),
        cancelOnError: true,
      );
      await sub.asFuture(); // onData 抛 DownloadCancelled 会让本 future 以该异常结束
      if (shouldCancel?.call() == true) throw DownloadCancelled();
      return file;
    } catch (e) {
      try {
        if (file.existsSync()) file.deleteSync();
      } catch (_) {}
      rethrow;
    } finally {
      client.close();
    }
  }

  /// 触发系统安装。Android：ACTION_VIEW 拉起安装器（open_filex 自带 FileProvider）。
  /// 返回 false 表示无法拉起，调用方应降级到浏览器打开下载页。
  Future<bool> install(File file) async {
    if (Platform.isAndroid) {
      try {
        await OpenFilex.open(file.path,
            type: 'application/vnd.android.package-archive');
        return true;
      } catch (_) {
        return false;
      }
    }
    return false; // iOS 无法侧载 APK，走浏览器
  }

  /// 降级方案：浏览器打开下载页
  Future<void> openInBrowser(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}
