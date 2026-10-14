/* 渔具租赁结算 —— Web 后台注入模块（独立于 React 主包，可整体移除）
 * 入口：window.__gearSettle(order) 由订单页「渔具结算」按钮调用
 *       window.__gearText(order) / window.__gearFeeText(order) 供订单详情抽屉展示
 * 依赖：localStorage.admin_token；接口 /api/admin/orders/:id/gear-settle|gear-pay-qr
 */
(function () {
  var ITEMS = [
    ['chaowang', '抄网'], ['yuhu', '鱼护'], ['diaoxiang', '钓箱/钓椅'],
    ['san', '钓伞/遮阳伞'], ['ganjia', '竿架/炮台'], ['fupiao', '浮漂线组'],
    ['yedeng', '夜钓灯'], ['jiuyi', '救生衣'], ['yutong', '鱼桶/鱼篓'],
    ['shishou', '失手绳']
  ];
  var LABEL = {};
  ITEMS.forEach(function (x) { LABEL[x[0]] = x[1]; });

  function token() {
    try { return localStorage.getItem('admin_token') || ''; } catch (e) { return ''; }
  }
  function parseGear(raw) {
    if (!raw) return null;
    try {
      var o = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!o || o.need !== true) return null;
      return o;
    } catch (e) { return null; }
  }
  function gearText(o) {
    var g = parseGear(o && o.gear_rental);
    if (!g) return '不需要';
    var parts = [];
    if (g.rods > 0) parts.push('鱼竿×' + g.rods + '根');
    if (g.bait > 0) parts.push('鱼饵×' + g.bait + '份');
    (g.items || []).forEach(function (k) { parts.push(LABEL[k] || k); });
    if (!parts.length) return '已登记（未选具体项目）';
    var base = parts.join('、');
    return g.note ? base + '（' + g.note + '）' : base;
  }
  function gearFeeText(o) {
    var f = Number(o && o.gear_fee) || 0;
    if (f <= 0) return '—';
    var paid = (o.gear_fee_paid == 1 || o.gear_fee_paid === true);
    return '¥' + f.toFixed(2) + (paid ? '（已收）' : '（待收）');
  }
  window.__gearText = gearText;
  window.__gearFeeText = gearFeeText;

  function el(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.setAttribute('style', css);
    if (text != null) e.textContent = text;
    return e;
  }

  async function api(path, body) {
    var res = await fetch('/api' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() },
      body: JSON.stringify(body || {})
    });
    var j = null;
    try { j = await res.json(); } catch (e) { /* ignore */ }
    if (!res.ok || (j && j.code && j.code !== 0)) {
      throw new Error((j && j.message) || ('请求失败(' + res.status + ')'));
    }
    return j ? j.data : null;
  }

  function openModal(order) {
    if (document.getElementById('__gear_modal')) return;
    var gear = parseGear(order && order.gear_rental);
    var sel = {};
    (gear && gear.items || []).forEach(function (k) { sel[k] = true; });

    var overlay = el('div', 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center;');
    overlay.id = '__gear_modal';
    var box = el('div', 'background:#fff;border-radius:14px;width:440px;max-width:92vw;max-height:90vh;overflow:auto;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.25);font-size:14px;color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;');

    var head = el('div', 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;');
    head.appendChild(el('div', 'font-size:17px;font-weight:700;', '渔具租赁结算'));
    var close = el('div', 'cursor:pointer;color:#999;font-size:22px;line-height:1;padding:0 4px;', '×');
    close.onclick = function () { document.body.removeChild(overlay); };
    head.appendChild(close);
    box.appendChild(head);

    box.appendChild(el('div', 'color:#666;font-size:13px;margin-bottom:10px;',
      (order.nick_name || '用户') + ' · ' + (order.order_no || '')));
    box.appendChild(el('div', 'color:#444;font-size:13px;margin-bottom:2px;',
      '客户登记：' + gearText(order)));
    if (gear && gear.note) {
      box.appendChild(el('div', 'color:#999;font-size:12px;margin-bottom:10px;', '客户备注：' + gear.note));
    }

    var lbl1 = el('div', 'font-weight:600;margin:12px 0 8px;', '实际租用项目');
    box.appendChild(lbl1);
    var wrap = el('div', 'display:flex;flex-wrap:wrap;gap:8px;');
    ITEMS.forEach(function (x) {
      var chip = el('div', 'padding:6px 14px;border-radius:999px;border:1px solid ' + (sel[x[0]] ? '#2E7D32' : '#e0e0e0') + ';cursor:pointer;user-select:none;background:' + (sel[x[0]] ? '#E8F5E9' : '#f7f7f7') + ';color:' + (sel[x[0]] ? '#2E7D32' : '#555') + ';font-size:13px;', x[1]);
      chip.onclick = function () {
        sel[x[0]] = !sel[x[0]];
        var on = sel[x[0]];
        chip.style.borderColor = on ? '#2E7D32' : '#e0e0e0';
        chip.style.background = on ? '#E8F5E9' : '#f7f7f7';
        chip.style.color = on ? '#2E7D32' : '#555';
      };
      wrap.appendChild(chip);
    });
    box.appendChild(wrap);

    box.appendChild(el('div', 'font-weight:600;margin:14px 0 6px;', '应收金额（元）'));
    var amount = el('input', 'width:100%;box-sizing:border-box;height:38px;border:1px solid #d8d8dd;border-radius:8px;padding:0 10px;font-size:15px;outline:none;');
    amount.type = 'number'; amount.step = '0.01'; amount.min = '0'; amount.placeholder = '手工填写，如 38.50';
    var existFee = Number(order && order.gear_fee) || 0;
    if (existFee > 0 && !(order.gear_fee_paid == 1 || order.gear_fee_paid === true)) {
      amount.value = existFee.toFixed(2);
    }
    box.appendChild(amount);

    box.appendChild(el('div', 'font-weight:600;margin:12px 0 6px;', '备注（选填）'));
    var note = el('input', 'width:100%;box-sizing:border-box;height:38px;border:1px solid #d8d8dd;border-radius:8px;padding:0 10px;font-size:14px;outline:none;');
    note.placeholder = '如：按现场实际租用统计';
    box.appendChild(note);

    var msg = el('div', 'color:#C62828;font-size:13px;min-height:18px;margin-top:8px;');
    box.appendChild(msg);

    var bar = el('div', 'display:flex;gap:10px;margin-top:12px;');
    var btnSave = el('button', 'flex:1;height:40px;border:1px solid #2E7D32;background:#fff;color:#2E7D32;border-radius:8px;font-size:15px;cursor:pointer;', '仅保存');
    var btnQr = el('button', 'flex:1;height:40px;border:0;background:#2E7D32;color:#fff;border-radius:8px;font-size:15px;cursor:pointer;', '保存并生成收款码');
    bar.appendChild(btnSave); bar.appendChild(btnQr);
    box.appendChild(bar);

    function collect() {
      var fee = parseFloat(amount.value);
      if (isNaN(fee) || fee < 0) { msg.textContent = '请输入正确的应收金额'; return null; }
      var items = ITEMS.filter(function (x) { return sel[x[0]]; }).map(function (x) { return x[0]; });
      return { fee: fee, items: items, note: note.value.trim() };
    }
    function busy(b) {
      btnSave.disabled = b; btnQr.disabled = b;
      btnSave.style.opacity = b ? '.6' : '1'; btnQr.style.opacity = b ? '.6' : '1';
    }

    btnSave.onclick = async function () {
      var data = collect(); if (!data) return;
      busy(true); msg.textContent = '';
      try {
        await api('/admin/orders/' + order.id + '/gear-settle', data);
        document.body.removeChild(overlay);
        if (window.__gearToast) window.__gearToast('渔具结算已保存');
      } catch (e) { msg.textContent = e.message; }
      busy(false);
    };
    btnQr.onclick = async function () {
      var data = collect(); if (!data) return;
      busy(true); msg.textContent = '';
      try {
        await api('/admin/orders/' + order.id + '/gear-settle', data);
        var qr = await api('/admin/orders/' + order.id + '/gear-pay-qr', {});
        showQr(order, qr);
        document.body.removeChild(overlay);
      } catch (e) { msg.textContent = e.message; busy(false); }
    };

    overlay.appendChild(box);
    overlay.onclick = function (e) { if (e.target === overlay) document.body.removeChild(overlay); };
    document.body.appendChild(overlay);
    amount.focus();
  }

  function showQr(order, qr) {
    var overlay = el('div', 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100000;display:flex;align-items:center;justify-content:center;');
    var box = el('div', 'background:#fff;border-radius:14px;width:360px;max-width:92vw;padding:20px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;');
    box.appendChild(el('div', 'font-size:17px;font-weight:700;margin-bottom:4px;', qr && qr.alreadyPaid ? '本单已收款' : '微信扫码收款'));
    box.appendChild(el('div', 'color:#666;font-size:13px;margin-bottom:2px;', '渔具租赁 · ' + ((order && order.nick_name) || '')));
    if (qr && qr.orderNo) box.appendChild(el('div', 'color:#999;font-size:12px;', '单号 ' + qr.orderNo));
    if (qr && !qr.alreadyPaid && qr.qrcode) {
      var img = el('img', 'width:220px;height:220px;margin:12px auto;display:block;');
      img.src = qr.qrcode;
      box.appendChild(img);
    } else if (qr && qr.alreadyPaid) {
      box.appendChild(el('div', 'font-size:56px;color:#2E7D32;margin:16px 0;', '✓'));
    }
    box.appendChild(el('div', 'font-size:30px;font-weight:800;color:#C62828;margin:6px 0;', qr && qr.amount != null ? ('¥' + Number(qr.amount).toFixed(2)) : '—'));
    box.appendChild(el('div', 'color:#888;font-size:12px;margin-bottom:12px;', '请客户用微信「扫一扫」支付，钱直接入账该会员'));
    var btn = el('button', 'width:100%;height:40px;border:0;background:#2E7D32;color:#fff;border-radius:8px;font-size:15px;cursor:pointer;', '完成');
    btn.onclick = function () { document.body.removeChild(overlay); };
    box.appendChild(btn);
    overlay.appendChild(box);
    overlay.onclick = function (e) { if (e.target === overlay) document.body.removeChild(overlay); };
    document.body.appendChild(overlay);
  }

  // 简易 toast（无第三方依赖）
  window.__gearToast = function (text) {
    var t = el('div', 'position:fixed;left:50%;top:16%;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:10px 18px;border-radius:8px;z-index:100001;font-size:14px;font-family:-apple-system,"PingFang SC",sans-serif;', text);
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 1800);
  };

  window.__gearSettle = openModal;
})();
