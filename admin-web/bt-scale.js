/* 蓝牙电子秤（WXL-T12 / QDI-1）—— Web 管理后台注入模块
 * 独立于 React 主包，可整体移除（删除 index.html 中 <script src="bt-scale.js"> 即回退）
 *
 * 协议（与安卓端一致，见《蓝牙电子秤对接方案_20261012.md》）：
 *   Service   0000ffe0-0000-1000-8000-00805f9b34fb
 *   Character 0000ffe1-0000-1000-8000-00805f9b34fb（Notify 连续推送）
 *   帧1(实测) ST,NT,+  4.840kg\r\n   （ST 稳定 / US 动态；值+单位）
 *   帧2(文档) +0050.00,0000.00kg\r\n （逗号前净重 / 后皮重）
 *   电量帧    DC100%
 *   换算      kg×2、g÷500、jin×1、lb×0.90718474、t×2000（APP 计价单位为斤）
 *   说明      本秤蓝牙模块实测不接收下行指令（去皮/置零须按秤上按键）
 *
 * 注入方式：watch 录入渔获弹窗（重量输入框 placeholder「只填斤数，如 3.5」），
 *   在其下方插入 UI；「采用此重量」用 native setter + input 事件写回 antd InputNumber
 * 依赖：浏览器 Web Bluetooth（Chrome/Edge，HTTPS 安全上下文）；不需要后台 token
 *
 * 本地桥（2026-10-14 增）：Chrome 在黑苹果（BCM94352Z 模拟蓝牙）上 Web Bluetooth
 *   notify 载荷丢失（事件触发但 0 字节），而原生 CoreBluetooth 正常（bleak 实测全真帧）。
 *   本机运行 ~/tools/fytx_scale_bridge.py（原生 bleak 读秤 → 127.0.0.1:8765 HTTP），
 *   本页加载时自动探测：桥在且已连秤 → 直接拉帧（免系统弹窗）；否则回退原生 Web BLE。
 *   桥端口 8765: GET / 状态、GET /frames 取累积帧并清空、POST /stop 退出。
 */
(function () {
  'use strict';

  var SVC = '0000ffe0-0000-1000-8000-00805f9b34fb';
  var CHR = '0000ffe1-0000-1000-8000-00805f9b34fb';
  var SEL = '.ant-modal input[placeholder="只填斤数，如 3.5"]';
  var UI_ID = 'fytx-bt-scale-ui';
  var BRIDGE = 'http://127.0.0.1:8765';
  var decoder = new TextDecoder('utf-8');

  var st = {
    mode: 'idle', // idle | connecting | connected | unsupported
    device: null, server: null, char: null,
    buf: '', hist: [], frames: 0, firstFrameAt: 0,
    sign: '+', net: 0, tare: 0, unit: 'kg',
    jin: 0, stable: false, avg: 0, avgReady: false,
    err: '', flash: 0, sig: '',
    bridge: false, bridgeTimer: null, bridgeLastTs: 0
  };

  /* ── 协议解析 ─────────────────────────────────────── */
  function toJin(v, u) {
    switch (u) {
      case 'kg': return v * 2;
      case 'g': return v / 500;
      case 'jin': return v;
      case 'lb': return v * 0.90718474;
      case 't': return v * 2000;
      default: return v;
    }
  }

  // 时间实测稳定：最近 ≥1.2s 内波动 ≤0.04kg 且样本足够
  function isStable(net, ts) {
    var now = ts || Date.now();
    st.hist.push([now, net]);
    while (st.hist.length && now - st.hist[0][0] > 3500) st.hist.shift();
    var recent = st.hist.filter(function (e) { return now - e[0] <= 1200; });
    if (recent.length < 6) return false;
    if (now - recent[0][0] < 1200) return false;
    var mn = recent[0][1], mx = recent[0][1];
    for (var i = 1; i < recent.length; i++) {
      if (recent[i][1] < mn) mn = recent[i][1];
      if (recent[i][1] > mx) mx = recent[i][1];
    }
    return (mx - mn) <= 0.04;
  }

  // 近 3 秒滚动平均（鱼摆动等持续波动场景的录入值）
  function avg3s(ts) {
    var now = ts || Date.now();
    var win = st.hist.filter(function (e) { return now - e[0] <= 3000; });
    if (win.length < 8 || now - win[0][0] < 2000) {
      return { net: st.hist.length ? st.hist[st.hist.length - 1][1] : 0, ready: false };
    }
    var sum = 0;
    for (var i = 0; i < win.length; i++) sum += win[i][1];
    return { net: sum / win.length, ready: true };
  }

  function parseFrame(frame, ts) {
    if (frame.indexOf('DC') === 0) return; // 电量帧，忽略
    var fields = frame.split(',');
    if (fields.length < 2 || !/[0-9]/.test(frame)) return; // 非重量帧
    var sign = '+', unit = 'kg', net = 0, tare = 0, stable;

    if (fields.length >= 3) {
      // 帧1：ST,NT,+  4.840kg
      var status = fields[0].trim().toUpperCase();
      var vTok = fields[2].trim();
      sign = vTok.charAt(0) === '-' ? '-' : '+';
      var m = vTok.match(/[0-9]+(\.[0-9]+)?/);
      net = m ? parseFloat(m[0]) : 0;
      var um = vTok.toLowerCase().match(/(kg|jin|lb|g|t)$/);
      unit = um ? um[1] : 'kg';
      stable = isStable(net, ts) && status !== 'US';
    } else {
      // 帧2：+0050.00,0000.00kg
      var netRaw = fields[0], restRaw = fields[1];
      sign = netRaw.charAt(0) === '-' ? '-' : '+';
      net = parseFloat(netRaw.replace(/[^0-9.]/g, '')) || 0;
      tare = parseFloat(restRaw.replace(/[^0-9.]/g, '')) || 0;
      var um2 = restRaw.toLowerCase().match(/(kg|jin|lb|g|t)$/);
      unit = um2 ? um2[1] : 'kg';
      stable = isStable(net, ts);
    }
    st.sign = sign; st.net = net; st.tare = tare; st.unit = unit;
    st.jin = Math.round(toJin(net, unit) * 100) / 100;
    st.stable = stable;
    var a = avg3s(ts);
    st.avg = Math.round(toJin(a.net, unit) * 100) / 100;
    st.avgReady = a.ready;
  }

  function onBytes(dv) {
    st.buf += decoder.decode(new Uint8Array(dv));
    var parts = st.buf.split(/\r?\n/);
    st.buf = parts.pop();
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].trim()) parseFrame(parts[i].trim());
    }
  }

  /* ── 本地桥（绕开 Chrome 黑苹果 Web Bluetooth 载荷丢失） ─────────── */
  function bridgeProbe() {
    if (!window.fetch) return Promise.resolve(null);
    var opt = {};
    try { opt.signal = AbortSignal.timeout(2500); } catch (_) {}
    return fetch(BRIDGE + '/', opt)
      .then(function (r) { return r.json(); })
      .then(function (j) { return j && j.up ? j : null; })
      .catch(function () { return null; });
  }

  function startBridge() {
    st.bridge = true; st.buf = ''; st.hist = []; st.frames = 0;
    st.bridgeLastTs = 0; st.err = ''; st.mode = 'connected';
    startBridgePoll();
    fetch(BRIDGE + '/frames').then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.frame) onBridgeBatch(j.frame); })
      .catch(function () {});
  }

  function startBridgePoll() {
    if (st.bridgeTimer) return;
    st.bridgeTimer = setInterval(function () {
      var opt = {};
      try { opt.signal = AbortSignal.timeout(4000); } catch (_) {}
      fetch(BRIDGE + '/frames', opt)
        .then(function (r) { return r.json(); })
        .then(function (j) { if (j && j.frame) onBridgeBatch(j.frame); })
        .catch(function () { st.err = '本地桥中断，自动重试中…'; });
    }, 1500);
  }

  function stopBridgePoll() {
    if (st.bridgeTimer) { clearInterval(st.bridgeTimer); st.bridgeTimer = null; }
  }

  // 桥给一批文本：时间戳按批均摊（近似原生 notify 节奏），稳定判定照常工作
  function onBridgeBatch(text) {
    var lines = String(text).split(/\r?\n/);
    var n = 0;
    for (var i = 0; i < lines.length; i++) if (lines[i].trim()) n++;
    if (!n) return;
    st.err = '';
    var t1 = Date.now();
    var t0 = st.bridgeLastTs || (t1 - 1500);
    var step = (t1 - t0) / (n + 1);
    var k = 0;
    for (var j = 0; j < lines.length; j++) {
      var line = lines[j].trim();
      if (!line) continue;
      k++;
      parseFrame(line, t0 + step * k);
      st.frames++;
      if (!st.firstFrameAt) st.firstFrameAt = t1;
    }
    st.bridgeLastTs = t1;
  }

  /* ── 连接管理 ─────────────────────────────────────── */
  function connect() {
    if (st.mode === 'connecting') return;
    if (st.mode === 'connected') return;
    st.mode = 'connecting'; st.err = '';
    // 优先本机桥（Chrome 黑苹果 Web BLE 通知载荷丢失的绕行），失败再走原生
    bridgeProbe().then(function (info) {
      if (info && info.connected) { startBridge(); return; }
      if (info && !info.connected) st.err = '本地桥在运行但未连秤，回退浏览器直连…';
      if (!navigator.bluetooth) { st.mode = 'unsupported'; st.err = ''; return; }
      startNative();
    });
  }

  function startNative() {
    navigator.bluetooth
      .requestDevice({ filters: [{ services: [SVC] }] })
      .then(function (dev) {
        st.device = dev;
        st.buf = ''; st.hist = [];
        dev.addEventListener('gattserverdisconnected', function () {
          st.mode = 'idle'; st.device = null; st.server = null; st.char = null;
        });
        return dev.gatt.connect();
      })
      .then(function (server) {
        st.server = server;
        return server.getPrimaryService(SVC);
      })
      .then(function (svc) { return svc.getCharacteristic(CHR); })
      .then(function (chr) {
        st.char = chr;
        chr.addEventListener('characteristicvaluechanged', function (e) {
          st.frames++;
          if (!st.firstFrameAt) st.firstFrameAt = Date.now();
          onBytes(e.target.value);
        });
        return chr.startNotifications().then(function () {
          // 对齐厂商小程序Demo：连上后 read 一次特征值。
          // 部分秤（稳定输出模式/需唤醒）只在 read 或数值变化时推第一帧。
          try { return chr.readValue(); } catch (_) { return null; }
        }).catch(function () { return null; });
      })
      .then(function () { st.mode = 'connected'; })
      .catch(function (e) {
        var msg = e && e.name === 'NotFoundError'
          ? '已取消选择'
          : '连接失败：' + (e && e.message ? e.message : e);
        try { if (st.server) st.server.disconnect(); } catch (_) {}
        st.mode = 'idle'; st.device = null; st.server = null; st.char = null;
        st.err = msg;
      });
  }

  function disconnect() {
    stopBridgePoll();
    st.bridge = false; st.bridgeLastTs = 0;
    try { if (st.server) st.server.disconnect(); } catch (_) {}
    st.device = null; st.server = null; st.char = null;
    st.mode = 'idle'; st.buf = ''; st.hist = [];
    st.jin = 0; st.stable = false; st.err = ''; st.sig = '';
  }

  /* ── 写回表单 ─────────────────────────────────────── */
  // 波动中但平均值与实时值显示一致 → 视同已稳定
  function avgLike() { return !st.stable && st.avgReady && st.avg.toFixed(2) === st.jin.toFixed(2); }
  // 可录入值：稳定 / 平均≈实时 用实时值；纯波动用近 3 秒平均值
  function adoptJin() { return (st.stable || avgLike()) ? st.jin : st.avg; }

  function applyWeight() {
    var input = document.querySelector(SEL);
    if (!input) { st.err = '未找到重量输入框'; st.sig = ''; return; }
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, String(adoptJin()));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    st.flash = Date.now();
  }

  /* ── UI ───────────────────────────────────────────── */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function button(label, k, cls) {
    var style = cls === 'primary'
      ? 'background:#389e0d;border:1px solid #389e0d;color:#fff;padding:4px 16px;border-radius:6px;font-size:14px;cursor:pointer;'
      : cls === 'disabled'
        ? 'background:#f5f5f5;border:1px solid #d9d9d9;color:#bfbfbf;padding:4px 16px;border-radius:6px;font-size:14px;cursor:not-allowed;'
        : 'background:#fff;border:1px solid #d9d9d9;color:#595959;padding:4px 12px;border-radius:6px;font-size:13px;cursor:pointer;';
    return '<button type="button" data-k="' + k + '"' +
      (cls === 'disabled' ? ' disabled' : '') +
      ' style="' + style + '">' + esc(label) + '</button>';
  }

  function buildHtml() {
    if (st.mode === 'unsupported') {
      return '<div style="color:#faad14;font-size:13px;">浏览器不支持 Web Bluetooth，请用 Chrome / Edge 并通过 HTTPS 访问</div>' +
        errLine();
    }
    if (st.mode === 'connecting') {
      return '<div style="color:#8c8c8c;font-size:13px;">连接中…（请在浏览器弹窗中选择电子秤 WXL-T12）</div>' + errLine();
    }
    if (st.mode === 'idle') {
      return '<div style="display:flex;align-items:center;gap:10px;">' +
        button('⚖ 连接蓝牙秤', 'bt-connect', 'primary') +
        '<span style="color:#999;font-size:12px;">连接后实时读秤，自动换算成斤</span>' +
        '</div>' + errLine();
    }
    // connected
    var aLike = avgLike();
    var showAvg = !st.stable && !aLike && st.avgReady;
    var bigVal = showAvg ? st.avg.toFixed(2) : st.jin.toFixed(2);
    var bigColor = st.stable || aLike ? '#389e0d' : (showAvg ? '#1565C0' : '#fa8c16');
    var statusLine = st.stable
      ? '<span style="color:#389e0d;font-weight:600;">✔ 重量已稳定，可录入</span>'
      : aLike
        ? '<span style="color:#389e0d;font-weight:600;">✔ 已稳定，自动取稳定值 ' + st.jin.toFixed(2) + ' 斤</span>'
        : showAvg
          ? '<span style="color:#1565C0;font-weight:600;">⚖ 波动中 · 自动取近 3 秒平均值</span>'
          : '<span style="color:#fa8c16;font-weight:600;">称重中…（正在取样）</span>';
    var detailLine = (showAvg || aLike)
      ? '秤面 ' + st.sign + st.net + ' ' + esc(st.unit) + ' · 实时 ' + st.jin.toFixed(2) + ' 斤 · 3秒平均 ' + st.avg.toFixed(2) + ' 斤'
      : '秤面 ' + st.sign + st.net + ' ' + esc(st.unit) + ' · 皮重 ' + st.tare.toFixed(2) + ' ' + esc(st.unit);
    var applied = (st.flash && Date.now() - st.flash < 2500)
      ? ' <span style="color:#389e0d;font-size:12px;">已写入重量框 ✓</span>' : '';
    var adoptCls = (st.stable || st.avgReady) ? 'primary' : 'disabled';
    return '<div>' +
      '<div style="font-size:34px;font-weight:700;color:' + bigColor + ';line-height:1.15;">' +
        bigVal + ' <span style="font-size:14px;">斤</span></div>' +
      '<div style="font-size:13px;margin:4px 0;">' + statusLine + applied + '</div>' +
      '<div style="color:#999;font-size:12px;">' + detailLine + '</div>' +
      '<div style="margin-top:8px;display:flex;gap:8px;align-items:center;">' +
        button('采用此重量', 'bt-apply', adoptCls) +
        button('断开', 'bt-disconnect', 'default') +
      '</div>' +
      (st.bridge ? '<div style="margin-top:6px;color:#5470c6;font-size:12px;">本地桥模式（Mac fytx_scale_bridge 原生读秤）</div>' : '') +
      '<div style="margin-top:6px;color:#8d6e63;font-size:12px;">如需去皮/置零，请按电子秤上的按键（本秤不支持 App 下发指令）</div>' +
      errLine() +
      '</div>';
  }

  function errLine() {
    return st.err ? '<div style="color:#cf1322;font-size:12px;margin-top:4px;">' + esc(st.err) + '</div>' : '';
  }

  function onClick(e) {
    var b = e.target.closest('button[data-k]');
    if (!b) return;
    var k = b.getAttribute('data-k');
    if (k === 'bt-connect') connect();
    else if (k === 'bt-apply' && (st.stable || st.avgReady)) applyWeight();
    else if (k === 'bt-disconnect') disconnect();
  }

  function renderUI() {
    var input = document.querySelector(SEL);
    var wrap = input && input.closest('.ant-input-number');
    var ui = document.getElementById(UI_ID);
    if (!wrap) {
      if (ui && ui.parentNode) ui.parentNode.removeChild(ui);
      if (!st.bridge && (st.mode === 'connected' || st.mode === 'connecting')) disconnect(); // 弹窗已关，释放蓝牙（桥模式保持）
      return;
    }
    var sig = st.mode + '|' + st.stable + '|' + st.avgReady + '|' +
      (st.stable ? st.jin.toFixed(2) : st.avg.toFixed(2)) + '|' +
      (st.flash && Date.now() - st.flash < 2500 ? st.flash : 0) + '|' + st.err;
    if (ui && ui.parentNode && sig === st.sig) return; // 无变化不重绘
    st.sig = sig;
    if (!ui) {
      ui = document.createElement('div');
      ui.id = UI_ID;
      ui.style.marginTop = '8px';
      ui.onclick = onClick;
    }
    if (!ui.parentNode) {
      wrap.parentNode.insertBefore(ui, wrap.nextSibling);
    }
    ui.innerHTML = buildHtml();
  }

  // 本机桥已在读秤时，进桥模式（免系统弹窗；弹窗一开即显示实时重量）
  setTimeout(function () {
    bridgeProbe().then(function (info) { if (info && info.connected) startBridge(); });
  }, 600);
  setInterval(renderUI, 800);

  /* 调试钩子（CDP 验证用）：模拟一次读数，参数 斤/稳定/秤面kg/平均就绪/平均斤 */
  window.__btScaleSim = function (jin, stable, netKg, avgReady, avgJin) {
    st.mode = 'connected';
    st.jin = Math.round(parseFloat(jin) * 100) / 100;
    st.stable = !!stable;
    st.net = netKg != null ? netKg : st.jin / 2;
    st.unit = 'kg'; st.sign = '+';
    st.avgReady = avgReady == null ? !st.stable : !!avgReady;
    st.avg = avgJin != null ? Math.round(parseFloat(avgJin) * 100) / 100 : st.jin;
    st.sig = '';
    renderUI();
  };
  window.__btScaleState = function () {
    return { mode: st.mode, jin: st.jin, stable: st.stable, avg: st.avg, avgReady: st.avgReady,
             err: st.err, frames: st.frames, firstFrameAt: st.firstFrameAt,
             net: st.net, unit: st.unit, buf: st.buf };
  };
  // 调试句柄：不重连即可对实时连接 readValue / 下发指令做对照
  window.__btScaleDebug = {
    read: function () {
      if (!st.char) return Promise.resolve('not connected');
      return Promise.resolve(st.char.readValue()).then(function (v) {
        return v ? new TextDecoder('utf-8').decode(new Uint8Array(v)) : '(空值)';
      }).catch(function (e) { return 'read err: ' + (e && e.message || e); });
    },
    write: function (cmd) {
      if (!st.char) return Promise.resolve('not connected');
      var bytes = new TextEncoder().encode(cmd);
      return Promise.resolve(st.char.writeValue(bytes)).catch(function () {
        return st.char.writeValue(bytes, 'withoutResponse');
      }).catch(function (e) { return 'write err: ' + (e && e.message || e); });
    },
    disconnect: function () { disconnect(); }
  };
})();
