import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api/admin_api.dart';
import '../api/api_client.dart';
import '../config.dart';
import '../models/models.dart';

/// 现金收款二维码弹层（Native 微信扫码支付）
/// 传入已生成好的 [qr]；展示大二维码 + 金额 + 轮询/刷新按钮
class PayQrSheet extends StatefulWidget {
  final PayQr qr;
  final String who; // 收款对象展示（会员昵称/账单）
  final int? billId; // 有 billId 时可刷新（如客户未付、重进）
  final Future<PayQr> Function()? onRefresh; // 自定义刷新（如渔具费用收款）

  const PayQrSheet(
      {super.key, required this.qr, this.who = '', this.billId, this.onRefresh});

  @override
  State<PayQrSheet> createState() => _PayQrSheetState();
}

class _PayQrSheetState extends State<PayQrSheet> {
  late PayQr _qr;
  bool _refreshing = false;

  @override
  void initState() {
    super.initState();
    _qr = widget.qr;
  }

  /// 解码 dataURL 里的 base64 → Image
  Uint8List? _decodeImage(String dataUrl) {
    final idx = dataUrl.indexOf(',');
    if (idx < 0) return null;
    try {
      return base64Decode(dataUrl.substring(idx + 1));
    } catch (_) {
      return null;
    }
  }

  Future<void> _refresh() async {
    final fn = widget.onRefresh;
    final bid = widget.billId;
    if ((fn == null && bid == null) || _refreshing) return;
    setState(() => _refreshing = true);
    try {
      final q = fn != null
          ? await fn()
          : await AdminApi.instance.generatePayQr(bid!);
      if (mounted) {
        setState(() => _qr = q);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(q.alreadyPaid ? '该账单已支付' : '已刷新收款码'),
            backgroundColor: const Color(kPrimaryColor)));
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('操作失败：$e')));
      }
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  void _dismiss() => Navigator.of(context).pop();

  @override
  Widget build(BuildContext context) {
    final bytes = _qr.qrcode.isNotEmpty ? _decodeImage(_qr.qrcode) : null;
    final amount = double.tryParse(_qr.amount) ?? 0;

    return SafeArea(
      child: Container(
        margin: const EdgeInsets.all(12),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    _qr.alreadyPaid ? '本单已支付' : '微信扫码收款',
                    style: const TextStyle(
                        fontSize: 17, fontWeight: FontWeight.bold),
                  ),
                ),
                IconButton(
                    onPressed: _dismiss,
                    icon: const Icon(Icons.close, color: Colors.grey)),
              ],
            ),
            if (widget.who.isNotEmpty)
              Text(widget.who,
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
            if (_qr.billNo.isNotEmpty)
              Text('单号 ${_qr.billNo}',
                  style: TextStyle(
                      fontSize: 12, color: Colors.grey.shade500)),
            const SizedBox(height: 14),
            // 二维码
            if (_qr.alreadyPaid)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 30),
                child: Icon(Icons.check_circle,
                    color: Color(kPrimaryColor), size: 64),
              )
            else if (bytes != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  color: Colors.white,
                  child: Image.memory(
                    bytes,
                    width: 200,
                    height: 200,
                    fit: BoxFit.contain,
                    gaplessPlayback: true,
                    errorBuilder: (_, __, ___) => const Icon(
                        Icons.qr_code_2, size: 160, color: Colors.black26),
                  ),
                ),
              )
            else
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 30),
                child: Icon(Icons.qr_code_2, size: 120, color: Colors.black26),
              ),
            const SizedBox(height: 14),
            // 金额
            Text(
              amount > 0 ? '¥${amount.toStringAsFixed(2)}' : '—',
              style: const TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFFC62828)),
            ),
            const SizedBox(height: 6),
            Text('请客户打开微信「扫一扫」支付此账单，钱将直接入账',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
            const SizedBox(height: 6),
            Text('付款码 1 小时内有效，超时请点刷新重新生成',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
            const SizedBox(height: 14),
            // 操作
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: (_refreshing ||
                            (widget.billId == null && widget.onRefresh == null))
                        ? null
                        : _refresh,
                    icon: _refreshing
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                                strokeWidth: 2))
                        : const Icon(Icons.refresh, size: 18),
                    label: const Text('刷新'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(
                        backgroundColor: const Color(kPrimaryColor)),
                    onPressed: _dismiss,
                    icon: const Icon(Icons.done, size: 18),
                    label: const Text('完成收款'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
