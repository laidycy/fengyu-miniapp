import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:image_picker/image_picker.dart';

import '../api/admin_api.dart';
import '../api/api_client.dart';
import '../config.dart';
import '../models/models.dart';
import '../services/bt_scale_service.dart';
import '../widgets/loading_overlay.dart';
import 'pay_qr_sheet.dart';

/// 渔获录入页（核心功能，自动结算）
/// 对齐 2026-09-07 设计定稿：
///  鱼种固定"混合鱼种"；积分=重量向下取整；优先抵福利鱼额度；
///  超出按卡种价(会员14.8/散客16/回收5元每斤)；费用>0 自动生成账单，可立即生成收款码。
class CatchEntryPage extends StatefulWidget {
  const CatchEntryPage({super.key});

  @override
  State<CatchEntryPage> createState() => _CatchEntryPageState();
}

class _CatchEntryPageState extends State<CatchEntryPage> {
  final _formKey = GlobalKey<FormState>();

  // 选中的用户
  UserSearchResult? _selectedUser;
  final _kwCtrl = TextEditingController();
  List<UserSearchResult> _searchResults = [];
  bool _searching = false;
  bool _searched = false;

  // 表单字段
  final _weightCtrl = TextEditingController();
  DateTime _catchDate = DateTime.now();
  bool _isRecycle = false;
  final _remarkCtrl = TextEditingController();

  // 备注开关（默认关闭）
  bool _remarkEnabled = false;

  // 渔获照片（强制项：必须拍照或从相册选择）
  File? _photoFile;
  final ImagePicker _picker = ImagePicker();

  bool _submitting = false;

  @override
  void dispose() {
    _kwCtrl.dispose();
    _weightCtrl.dispose();
    _remarkCtrl.dispose();
    super.dispose();
  }

  /// 搜索用户
  Future<void> _search() async {
    final kw = _kwCtrl.text.trim();
    if (kw.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('请输入手机号/会员号/昵称搜索')));
      return;
    }
    setState(() {
      _searching = true;
      _searched = true;
    });
    try {
      final list = await AdminApi.instance.searchUsers(kw);
      if (!mounted) return;
      setState(() => _searchResults = list);
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
      if (mounted) setState(() => _searching = false);
    }
  }

  /// 打开蓝牙电子秤面板；用户点「采用」后把斤数写回重量输入框
  Future<void> _openScaleSheet() async {
    final jin = await showModalBottomSheet<double>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const ScaleSheet(),
    );
    if (jin != null && mounted) {
      setState(() => _weightCtrl.text = jin.toStringAsFixed(2));
    }
  }

  /// 切换日期
  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _catchDate,
      firstDate: DateTime(2024),
      lastDate: DateTime.now().add(const Duration(days: 1)),
      locale: const Locale('zh', 'CN'),
    );
    if (picked != null) setState(() => _catchDate = picked);
  }

  /// 前端预计结算（与后端规则一致，最终以后端返回为准）
  ({
    double useQuota,
    double overWeight,
    double unitPrice,
    double extraFee,
    int points,
  }) _preview() {
    final w = double.tryParse(_weightCtrl.text.trim()) ?? 0;
    final u = _selectedUser;
    // 福利鱼剩余额度(斤)；与后端 settleCatch 一致：有额度即抵扣（不按等级排除；散客额度一般为 0）
    final quota = u == null ? 0.0 : (double.tryParse(u.welfareFishQuota) ?? 0);
    final useQuota = min(w, max(0.0, quota));
    final overWeight = max(0.0, w - useQuota);
    // 单价：回收覆盖；会员 silver/gold/diamond 14.8；散客/普通 16
    double unitPrice;
    if (_isRecycle) {
      unitPrice = kRecyclePrice;
    } else if (u != null &&
        (u.level == 'silver' || u.level == 'gold' || u.level == 'diamond')) {
      unitPrice = kMemberPrice;
    } else {
      unitPrice = kGuestPrice;
    }
    final extraFee =
        double.parse((overWeight * unitPrice).toStringAsFixed(2));
    return (
      useQuota: useQuota,
      overWeight: overWeight,
      unitPrice: unitPrice,
      extraFee: extraFee,
      points: w.floor(),
    );
  }

  /// 拍照/选图（弹层二选一）
  Future<void> _pickPhoto() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(14),
              child: Text('添加渔获照片',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera, color: Color(kPrimaryColor)),
              title: const Text('拍照'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library, color: Color(kPrimaryColor)),
              title: const Text('从相册选择'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source == null) return;
    try {
      final shot = await _picker.pickImage(
        source: source,
        maxWidth: 1600,
        imageQuality: 80,
      );
      if (shot == null) return;
      setState(() => _photoFile = File(shot.path));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('获取照片失败：$e')));
      }
    }
  }

  /// 本地图片 → data url
  Future<String> _fileToDataUrl(File f) async {
    final bytes = await f.readAsBytes();
    return 'data:image/jpeg;base64,${base64Encode(bytes)}';
  }

  /// 提交
  Future<void> _submit() async {
    if (_selectedUser == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('请先选择录入人（会员/用户）')));
      return;
    }
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final weight = double.tryParse(_weightCtrl.text.trim());
    if (weight == null || weight <= 0) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('请输入有效的重量')));
      return;
    }
    // 强制拍照/选图
    if (_photoFile == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('请先拍照或选择渔获照片')));
      return;
    }

    setState(() => _submitting = true);
    try {
      final dateStr =
          '${_catchDate.year.toString().padLeft(4, '0')}-${_catchDate.month.toString().padLeft(2, '0')}-${_catchDate.day.toString().padLeft(2, '0')}';
      // 1) 上传照片 → 拿到 url
      final dataUrl = await _fileToDataUrl(_photoFile!);
      final photoUrl = await AdminApi.instance.uploadImage(dataUrl);
      if (photoUrl.isEmpty) {
        // 照片是必传项：上传失败不能静默继续（否则"必传"形同虚设）
        throw ApiException('渔获照片上传失败，请检查网络后重试');
      }
      // 2) 录入渔获（带照片）
      final result = await AdminApi.instance.addCatchRecord(
        userId: _selectedUser!.userId,
        weight: _weightCtrl.text.trim(),
        catchDate: dateStr,
        isRecycle: _isRecycle,
        remark: _remarkEnabled ? _remarkCtrl.text.trim() : '',
        photo: photoUrl,
      );
      if (!mounted) return;
      await _showSuccess(result);
      _resetForm();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('录入失败：$e')));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  /// 录入成功弹窗：展示结算 + 未付账单"立即收款"
  Future<void> _showSuccess(CatchSettleResult r) async {
    final fee = double.tryParse(r.extraFee) ?? 0;
    await showDialog<void>(
      context: context,
      barrierDismissible: fee <= 0 || r.billId == null,
      builder: (ctx) => AlertDialog(
        title: const Row(children: [
          Icon(Icons.check_circle, color: Color(kPrimaryColor)),
          SizedBox(width: 8),
          Text('渔获已录入'),
        ]),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _succRow('重量', '${r.weight} 斤'),
            _succRow('奖励积分', '+${r.pointsEarned}（锁定1年）'),
            if ((double.tryParse(r.useQuota) ?? 0) > 0)
              _succRow('抵扣福利鱼', '${r.useQuota} 斤'),
            if ((double.tryParse(r.overWeight) ?? 0) > 0)
              _succRow('超出重量', '${r.overWeight} 斤'),
            if (r.billNo != null) ...[
              const Divider(height: 20),
              _succRow('账单号', '${r.billNo}'),
              _succRow('应收费用', '¥${r.extraFee}',
                  money: true, bold: true),
              if (fee > 0 && r.billId != null)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text('客户微信扫码即可支付，当场收款',
                      style: TextStyle(
                          fontSize: 11, color: Colors.grey.shade600)),
                ),
            ] else
              const Padding(
                padding: EdgeInsets.only(top: 4),
                child: Text('本次无超出费用（福利鱼额度已覆盖），无需收款。',
                    style: TextStyle(fontSize: 12, color: Colors.grey)),
              ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('完成'),
          ),
          if (fee > 0 && r.billId != null)
            FilledButton.icon(
              style: FilledButton.styleFrom(
                  backgroundColor: const Color(kPrimaryColor)),
              onPressed: () {
                Navigator.pop(ctx);
                _showPayQr(r.billId!, r.billNo ?? '', r.extraFee,
                    _selectedUser?.nickName ?? '');
              },
              icon: const Icon(Icons.qr_code),
              label: const Text('生成收款码'),
            ),
        ],
      ),
    );
  }

  Widget _succRow(String k, String v,
      {bool money = false, bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(k, style: TextStyle(fontSize: 14, color: Colors.grey.shade700)),
          Text(v,
              style: TextStyle(
                  fontSize: 14,
                  fontWeight: bold ? FontWeight.bold : FontWeight.w500,
                  color: money ? const Color(0xFFC62828) : Colors.black87)),
        ],
      ),
    );
  }

  /// 展示收款二维码（底部弹层）
  Future<void> _showPayQr(
      int billId, String billNo, String amount, String who) async {
    final loading = ScaffoldMessenger.of(context)
      ..showSnackBar(const SnackBar(
          content: Text('正在生成收款码...'), duration: Duration(seconds: 30)));
    try {
      final qr = await AdminApi.instance.generatePayQr(billId);
      loading.hideCurrentSnackBar();
      if (!mounted) return;
      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => PayQrSheet(qr: qr, who: who, billId: billId),
      );
    } on ApiException catch (e) {
      loading.hideCurrentSnackBar();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  void _resetForm() {
    setState(() {
      _selectedUser = null;
      _kwCtrl.clear();
      _searchResults = [];
      _searched = false;
      _weightCtrl.clear();
      _remarkCtrl.clear();
      _remarkEnabled = false;
      _photoFile = null;
      _isRecycle = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(kBackgroundColor),
      appBar: AppBar(
        title: const Text('录入渔获'),
        backgroundColor: const Color(kPrimaryColor),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildMemberPicker(),
                const SizedBox(height: 16),
                // 表单卡片
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('渔获信息（鱼种：混合鱼种）',
                            style: TextStyle(
                                fontSize: 16, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 12),
                        // 重量（支持蓝牙电子秤直读）
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _weightCtrl,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                        decimal: true),
                                inputFormatters: [
                                  FilteringTextInputFormatter.allow(
                                      RegExp(r'[0-9.]')),
                                ],
                                onChanged: (_) => setState(() {}),
                                decoration: const InputDecoration(
                                    labelText: '重量(斤)',
                                    hintText: '如 3.5，超出福利鱼额度部分将自动计价',
                                    border: OutlineInputBorder()),
                                validator: (v) =>
                                    (v == null || v.trim().isEmpty) ? '必填' : null,
                              ),
                            ),
                            const SizedBox(width: 8),
                            SizedBox(
                              height: 58,
                              child: OutlinedButton.icon(
                                onPressed: _openScaleSheet,
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(kPrimaryColor),
                                  side: const BorderSide(
                                      color: Color(kPrimaryColor)),
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8)),
                                ),
                                icon: const Icon(Icons.bluetooth, size: 18),
                                label: const Text('蓝牙秤'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        // 日期
                        InkWell(
                          onTap: _pickDate,
                          child: InputDecorator(
                            decoration: const InputDecoration(
                                labelText: '捕捞日期',
                                border: OutlineInputBorder(),
                                suffixIcon: Icon(Icons.calendar_today_outlined)),
                            child: Text(
                                '${_catchDate.year}-${_catchDate.month.toString().padLeft(2, '0')}-${_catchDate.day.toString().padLeft(2, '0')}'),
                          ),
                        ),
                        const SizedBox(height: 8),
                        // 是否回收
                        Material(
                          color: Colors.transparent,
                          child: SwitchListTile(
                            contentPadding: EdgeInsets.zero,
                            title: const Text('回收（按 5 元/斤 收）'),
                            subtitle: const Text('开启后超出部分按回收价结算，而非带走价'),
                            value: _isRecycle,
                            activeTrackColor: const Color(kPrimaryColor),
                            onChanged: (v) => setState(() => _isRecycle = v),
                          ),
                        ),
                        const SizedBox(height: 8),
                        // 预计结算预览
                        if (_selectedUser != null &&
                            double.tryParse(_weightCtrl.text.trim()) != null &&
                            (double.tryParse(_weightCtrl.text.trim()) ?? 0) > 0)
                          _buildPreview(),
                        const SizedBox(height: 8),
                        // 渔获照片（强制项）
                        _buildPhotoField(),
                        const SizedBox(height: 8),
                        // 备注开关（默认关闭）
                        Material(
                          color: Colors.transparent,
                          child: SwitchListTile(
                            contentPadding: EdgeInsets.zero,
                            title: const Text('添加备注'),
                            subtitle: const Text('默认关闭；需要时开启再填写'),
                            value: _remarkEnabled,
                            activeTrackColor: const Color(kPrimaryColor),
                            onChanged: (v) => setState(() => _remarkEnabled = v),
                          ),
                        ),
                        if (_remarkEnabled) ...[
                          const SizedBox(height: 4),
                          TextFormField(
                            controller: _remarkCtrl,
                            maxLines: 2,
                            decoration: const InputDecoration(
                                labelText: '备注内容',
                                hintText: '如：客户要求、异常情况等',
                                border: OutlineInputBorder()),
                          ),
                        ],
                        const SizedBox(height: 20),
                        // 提交按钮
                        SizedBox(
                          height: 48,
                          child: ElevatedButton.icon(
                            onPressed: _submitting ? null : _submit,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(kPrimaryColor),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10)),
                            ),
                            icon: _submitting
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2, color: Colors.white))
                                : const Icon(Icons.check_circle_outline),
                            label: Text(_submitting ? '结算录入中...' : '确认录入并自动结算',
                                style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (_submitting)
            const LoadingOverlay(message: '正在录入并结算...'),
        ],
      ),
    );
  }

  /// 渔获照片字段（强制：拍照或相册）
  Widget _buildPhotoField() {
    final has = _photoFile != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text('渔获照片',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(width: 4),
            Text('*必传', style: TextStyle(fontSize: 12, color: Colors.red.shade600)),
          ],
        ),
        const SizedBox(height: 8),
        if (has)
          Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.file(
                  _photoFile!,
                  width: double.infinity,
                  height: 180,
                  fit: BoxFit.cover,
                ),
              ),
              Positioned(
                top: 6,
                right: 6,
                child: GestureDetector(
                  onTap: () => setState(() => _photoFile = null),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                        color: Colors.black54, shape: BoxShape.circle),
                    child: const Icon(Icons.close, color: Colors.white, size: 18),
                  ),
                ),
              ),
              Positioned(
                bottom: 6,
                right: 6,
                child: GestureDetector(
                  onTap: _pickPhoto,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(20)),
                    child: const Row(children: [
                      Icon(Icons.camera_alt, color: Colors.white, size: 15),
                      SizedBox(width: 4),
                      Text('重拍/重选',
                          style: TextStyle(color: Colors.white, fontSize: 12)),
                    ]),
                  ),
                ),
              ),
            ],
          )
        else
          InkWell(
            onTap: _pickPhoto,
            child: Container(
              width: double.infinity,
              height: 110,
              decoration: BoxDecoration(
                color: const Color(kPrimaryColor).withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                    color: const Color(kPrimaryColor).withValues(alpha: 0.4),
                    style: BorderStyle.solid),
              ),
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.add_a_photo_outlined,
                      size: 32, color: Color(kPrimaryColor)),
                  SizedBox(height: 6),
                  Text('拍照 / 从相册选择（必传）',
                      style: TextStyle(
                          fontSize: 13, color: Color(kPrimaryColor))),
                ],
              ),
            ),
          ),
      ],
    );
  }

  /// 预计结算预览
  Widget _buildPreview() {
    final p = _preview();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(kPrimaryColor).withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(10),
        border:
            Border.all(color: const Color(kPrimaryColor).withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('预计结算(实时)',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
          const SizedBox(height: 6),
          Text('奖励积分 +${p.points}（锁定1年）',
              style: const TextStyle(fontSize: 13)),
          Text('福利鱼抵扣 ${p.useQuota == 0 ? "0" : p.useQuota.toStringAsFixed(2)} 斤'
              ' / 超出 ${p.overWeight == 0 ? "0" : p.overWeight.toStringAsFixed(2)} 斤',
              style: const TextStyle(fontSize: 13)),
          Text(
              p.unitPrice == kRecyclePrice
                  ? '回收单价 5.00 元/斤'
                  : (p.unitPrice == kMemberPrice ? '会员单价 14.80 元/斤' : '散客单价 16.00 元/斤'),
              style: const TextStyle(fontSize: 13)),
          const Divider(height: 16),
          Text(
              p.extraFee > 0 ? '预计费用 ¥${p.extraFee.toStringAsFixed(2)}'
                  : '费用 ¥0.00（额度已覆盖）',
              style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: p.extraFee > 0
                      ? const Color(0xFFC62828)
                      : const Color(kPrimaryColor))),
          const SizedBox(height: 4),
          Text('点击"确认录入"后按后端实际结算为准，产生费用会生成账单可当场收款',
              style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
        ],
      ),
    );
  }

  /// 选择录入人
  Widget _buildMemberPicker() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('1. 选择录入人（会员）',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _kwCtrl,
                  onSubmitted: (_) => _search(),
                  decoration: const InputDecoration(
                    hintText: '手机号 / 会员号 / 昵称',
                    isDense: true,
                    prefixIcon: Icon(Icons.search, size: 20),
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: _searching ? null : _search,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(kPrimaryColor),
                  foregroundColor: Colors.white,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                ),
                child: _searching
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Text('搜索'),
              ),
            ],
          ),
          // 已选中
          if (_selectedUser != null)
            Container(
              margin: const EdgeInsets.only(top: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(kPrimaryColor).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                    color: const Color(kPrimaryColor).withValues(alpha: 0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const CircleAvatar(
                          radius: 18,
                          backgroundColor: Color(kPrimaryColor),
                          child: Icon(Icons.person, color: Colors.white)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_selectedUser!.nickName,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 15)),
                            Text(
                                '${_selectedUser!.memberNo} · ${_selectedUser!.phone.isEmpty ? "未绑手机" : _selectedUser!.phone}',
                                style: const TextStyle(
                                    fontSize: 12, color: Colors.black54)),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Color(kLevelColors[_selectedUser!.level] ??
                              kLevelColors['guest']!),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                            kMemberLevelNames[_selectedUser!.level] ??
                                _selectedUser!.level,
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (_selectedUser!.level != 'guest')
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(kPrimaryLight)
                            .withValues(alpha: 0.10),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                          '福利鱼剩余额度：${_selectedUser!.welfareFishQuota} 斤（可抵扣，超出自动计价）',
                          style: const TextStyle(fontSize: 12)),
                    )
                  else
                    const Text('散客：无福利鱼额度，渔获按 16 元/斤 计费',
                        style: TextStyle(fontSize: 12, color: Colors.grey)),
                  const SizedBox(height: 6),
                  Align(
                    alignment: Alignment.centerRight,
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedUser = null),
                      child: const Text('换人',
                          style: TextStyle(
                              fontSize: 12, color: Color(kPrimaryColor))),
                    ),
                  ),
                ],
              ),
            ),
          // 搜索结果
          if (_searched && !_searching)
            _searchResults.isEmpty
                ? Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Text('未找到匹配的用户',
                        style: TextStyle(
                            color: Colors.grey.shade600, fontSize: 13)),
                  )
                : Container(
                    margin: const EdgeInsets.only(top: 8),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      children: _searchResults
                          .map((u) => Material(
                                color: Colors.transparent,
                                child: ListTile(
                                  dense: true,
                                  title: Text(u.nickName),
                                  subtitle: Text(
                                      '${u.memberNo} · 剩余额度 ${u.level == "guest" ? "-" : u.welfareFishQuota}斤'),
                                  trailing: Text(
                                      kMemberLevelNames[u.level] ?? u.level,
                                      style: const TextStyle(
                                          color: Color(kPrimaryColor))),
                                  onTap: () =>
                                      setState(() => _selectedUser = u),
                                ),
                              ))
                          .toList(),
                    ),
                  ),
        ],
      ),
    );
  }
}

/// 蓝牙电子秤弹层：搜索 / 连接 / 实时重量 / 采用·去皮·置零·断开
class ScaleSheet extends StatefulWidget {
  const ScaleSheet({super.key});

  @override
  State<ScaleSheet> createState() => _ScaleSheetState();
}

class _ScaleSheetState extends State<ScaleSheet> {
  final _svc = BtScaleService.instance;

  @override
  void initState() {
    super.initState();
    _svc.addListener(_tick);
  }

  @override
  void dispose() {
    _svc.removeListener(_tick);
    super.dispose();
  }

  void _tick() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final r = _svc.reading;
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 22),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.bluetooth, color: Color(kPrimaryColor)),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text('蓝牙电子秤',
                      style: TextStyle(
                          fontSize: 17, fontWeight: FontWeight.bold)),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const Divider(height: 6),
            const SizedBox(height: 6),
            if (_svc.error != null)
              Container(
                padding: const EdgeInsets.all(10),
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFEBEE),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_svc.error!,
                    style: const TextStyle(
                        fontSize: 12, color: Color(0xFFC62828))),
              ),
            _buildBody(r),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(ScaleReading? r) {
    switch (_svc.status) {
      case BtScaleStatus.connected:
        return _buildConnected(r);
      case BtScaleStatus.connecting:
        return const Padding(
          padding: EdgeInsets.symmetric(vertical: 40),
          child: Center(child: CircularProgressIndicator()),
        );
      case BtScaleStatus.scanning:
      case BtScaleStatus.disconnected:
        return _buildScan();
    }
  }

  Widget _buildConnected(ScaleReading? r) {
    final stable = r?.stable ?? false;
    final avgLike = r?.avgMatchesRealtime ?? false; // 波动中但平均≈实时 → 视同已稳定
    final showAvg = !stable && !avgLike && (r?.avgReady ?? false);
    final adoptable = r?.adoptable ?? false;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Icon(Icons.bluetooth_connected,
                size: 16, color: Color(kPrimaryColor)),
            const SizedBox(width: 6),
            Expanded(
              child: Text('已连接：${_svc.deviceName ?? "电子秤"}',
                  style: const TextStyle(fontSize: 13, color: Colors.black54)),
            ),
            if (_svc.battery != null)
              Text('电量 ${_svc.battery}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.symmetric(vertical: 18),
          decoration: BoxDecoration(
            color: const Color(kPrimaryColor).withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Text(
                r == null
                    ? '--'
                    : (showAvg ? r.avgJinText : r.jinText),
                style: TextStyle(
                  fontSize: 52,
                  fontWeight: FontWeight.bold,
                  color: r == null
                      ? Colors.grey
                      : ((stable || avgLike)
                          ? const Color(kPrimaryColor)
                          : showAvg
                              ? const Color(0xFF1565C0)
                              : Colors.orange.shade700),
                ),
              ),
              const Text('斤',
                  style: TextStyle(fontSize: 14, color: Colors.black54)),
              const SizedBox(height: 6),
              Text(
                r == null
                    ? '等待数据…'
                    : (stable
                        ? '✔ 重量已稳定，可录入'
                        : avgLike
                            ? '✔ 已稳定，自动取稳定值 ${r.jinText} 斤'
                            : showAvg
                                ? '⚖ 波动中 · 自动取近 3 秒平均值'
                                : '称重中…（正在取样）'),
                style: TextStyle(
                  fontSize: 13,
                  color: (stable || avgLike)
                      ? const Color(kPrimaryColor)
                      : showAvg
                          ? const Color(0xFF1565C0)
                          : Colors.orange.shade700,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (r != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                      (showAvg || avgLike)
                          ? '秤面 ${r.sign}${r.rawNet} ${r.unit} · 实时 ${r.jinText} 斤 · 3秒平均 ${r.avgJinText} 斤'
                          : '秤面 ${r.sign}${r.rawNet} ${r.unit} · 皮重 ${r.tare.toStringAsFixed(2)} ${r.unit}',
                      style: const TextStyle(
                          fontSize: 11, color: Colors.grey)),
                ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: (r != null && adoptable)
                    ? () => Navigator.pop(context, r.adoptJin)
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(kPrimaryColor),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                icon: const Icon(Icons.check, size: 18),
                label: const Text('采用此重量'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF8E1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Row(
            children: [
              Icon(Icons.info_outline, size: 16, color: Color(0xFFB8860B)),
              SizedBox(width: 6),
              Expanded(
                child: Text('如需去皮/置零，请按电子秤上的按键（本秤不支持 App 下发指令）',
                    style: TextStyle(fontSize: 12, color: Color(0xFF8D6E63))),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        TextButton.icon(
          onPressed: () => _svc.disconnect(),
          icon: const Icon(Icons.link_off, size: 16, color: Colors.grey),
          label: const Text('断开连接',
              style: TextStyle(color: Colors.grey)),
        ),
      ],
    );
  }

  Widget _buildScan() {
    final scanning = _svc.status == BtScaleStatus.scanning;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ElevatedButton.icon(
          onPressed: scanning ? null : () => _svc.startScan(),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(kPrimaryColor),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 13),
          ),
          icon: scanning
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white))
              : const Icon(Icons.search, size: 18),
          label: Text(scanning ? '搜索中…' : '搜索电子秤'),
        ),
        const SizedBox(height: 12),
        if (_svc.scanResults.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Text(
              scanning ? '正在搜索附近蓝牙秤…' : '点上方按钮搜索；先把秤开机、靠近手机',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
            ),
          )
        else
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 300),
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: _svc.scanResults.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final sr = _svc.scanResults[i];
                final name = sr.device.platformName.isNotEmpty
                    ? sr.device.platformName
                    : '(未命名设备)';
                return ListTile(
                  dense: true,
                  leading: const Icon(Icons.scale,
                      color: Color(kPrimaryColor)),
                  title: Text(name),
                  subtitle: Text(sr.device.remoteId.str,
                      style: const TextStyle(fontSize: 11)),
                  trailing: Text('${sr.rssi} dBm',
                      style: const TextStyle(
                          fontSize: 12, color: Colors.grey)),
                  onTap: () => _svc.connect(sr.device),
                );
              },
            ),
          ),
      ],
    );
  }
}

