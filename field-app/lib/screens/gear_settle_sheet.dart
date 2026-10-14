import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api/admin_api.dart';
import '../api/api_client.dart';
import '../config.dart';
import '../models/models.dart';
import 'pay_qr_sheet.dart';

/// 渔具租赁结算弹层（照渔获录入流程）
/// 展示客户登记的需求（只读）+ 实际租用项（可勾选）+ 手工填写应收金额 + 备注；
/// 可「仅保存」（写 orders.gear_fee）或「保存并收款」（生成微信 Native 收款码）。
class GearSettleSheet extends StatefulWidget {
  final Order order;

  const GearSettleSheet({super.key, required this.order});

  @override
  State<GearSettleSheet> createState() => _GearSettleSheetState();
}

class _GearSettleSheetState extends State<GearSettleSheet> {
  late final TextEditingController _amountCtrl;
  late final TextEditingController _noteCtrl;
  final Set<String> _selected = {};
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final g = widget.order.gear;
    // 预选客户登记的设备项；金额预填已有结算额（仅未收款时）
    for (final k in (g?.items ?? const <String>[])) {
      _selected.add(k);
    }
    final existing = double.tryParse(widget.order.gearFee) ?? 0;
    _amountCtrl = TextEditingController(
        text: (existing > 0 && !widget.order.gearFeePaid)
            ? existing.toStringAsFixed(2)
            : '');
    _noteCtrl = TextEditingController();
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _submit({required bool thenQr}) async {
    final fee = double.tryParse(_amountCtrl.text.trim());
    if (fee == null || fee < 0) {
      _snack('请输入正确的应收金额');
      return;
    }
    // 弹层 pop 后仍可用的 context（避免用已销毁的 context）
    final navCtx = Navigator.of(context, rootNavigator: true).context;
    setState(() => _busy = true);
    try {
      await AdminApi.instance.gearSettle(
        widget.order.id,
        fee,
        items: _selected.toList(),
        note: _noteCtrl.text.trim(),
      );
      if (!mounted) return;
      if (thenQr) {
        final qr = await AdminApi.instance.generateGearPayQr(widget.order.id);
        if (!mounted) return;
        Navigator.pop(context);
        showModalBottomSheet(
          context: navCtx,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (_) => PayQrSheet(
            qr: qr,
            who: '渔具租赁 · ${widget.order.nickName}',
            onRefresh: () =>
                AdminApi.instance.generateGearPayQr(widget.order.id),
          ),
        );
        return;
      }
      Navigator.pop(context);
      ScaffoldMessenger.of(navCtx).showSnackBar(const SnackBar(
          content: Text('渔具结算已保存'), backgroundColor: Color(kPrimaryColor)));
    } on ApiException catch (e) {
      _snack(e.message);
    } catch (e) {
      _snack('操作失败：$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final o = widget.order;
    final g = o.gear;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 12,
          right: 12,
          top: 12,
          bottom: MediaQuery.of(context).viewInsets.bottom + 12,
        ),
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
              color: Colors.white, borderRadius: BorderRadius.circular(20)),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  const Expanded(
                      child: Text('渔具租赁结算',
                          style: TextStyle(
                              fontSize: 17, fontWeight: FontWeight.bold))),
                  IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close, color: Colors.grey)),
                ]),
                Text('${o.nickName} · ${o.orderNo}',
                    style:
                        TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                const SizedBox(height: 6),
                Text(
                    g != null ? '客户登记：${g.display}' : '客户未登记渔具租赁需求',
                    style: TextStyle(
                        fontSize: 13, color: Colors.grey.shade700)),
                if (g != null && g.note.isNotEmpty)
                  Text('客户备注：${g.note}',
                      style: TextStyle(
                          fontSize: 12, color: Colors.grey.shade500)),
                const SizedBox(height: 14),
                const Text('实际租用项目',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: kGearItemLabels.entries.map((e) {
                    final on = _selected.contains(e.key);
                    return FilterChip(
                      label: Text(e.value),
                      selected: on,
                      selectedColor:
                          const Color(kPrimaryColor).withValues(alpha: 0.15),
                      onSelected: (v) => setState(
                          () => v ? _selected.add(e.key) : _selected.remove(e.key)),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _amountCtrl,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))
                  ],
                  decoration: const InputDecoration(
                    labelText: '应收金额（元）',
                    hintText: '手工填写，如 38.50',
                    prefixText: '¥ ',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _noteCtrl,
                  maxLength: 50,
                  decoration: const InputDecoration(
                    labelText: '备注（选填）',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 8),
                Row(children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _busy ? null : () => _submit(thenQr: false),
                      child: const Text('仅保存'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(
                          backgroundColor: const Color(kPrimaryColor)),
                      onPressed: _busy ? null : () => _submit(thenQr: true),
                      icon: _busy
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.qr_code_2, size: 18),
                      label: const Text('保存并收款'),
                    ),
                  ),
                ]),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
