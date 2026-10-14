import 'package:flutter/material.dart';

import '../api/admin_api.dart';
import '../api/api_client.dart';
import '../config.dart';
import '../models/models.dart';
import 'pay_qr_sheet.dart';

/// 渔获记录页（含账单结算与二维码收款）
/// 工作台 → "渔获记录"。等同线上线下"渔获订单"口径：录渔获即自动结算，
/// 未付账单可当场生成微信收款码。
class CatchHistoryPage extends StatefulWidget {
  const CatchHistoryPage({super.key});

  @override
  State<CatchHistoryPage> createState() => _CatchHistoryPageState();
}

class _CatchHistoryPageState extends State<CatchHistoryPage> {
  final ScrollController _scrollCtrl = ScrollController();
  List<CatchRecord> _records = [];
  bool _loading = true;      // 首屏加载
  bool _loadingMore = false; // 加载更多
  bool _hasMore = true;
  int _page = 1;
  static const int _pageSize = 20;
  int _total = 0;
  String? _error;
  String? _dateFilter;
  String? _billStatusFilter; // null=全部, 'unpaid'=未收款(含待收款/未生成), 'pending'=待收款, 'paid'=已支付

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(_onScroll);
    _load();
  }

  @override
  void dispose() {
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollCtrl.hasClients) return;
    final pos = _scrollCtrl.position;
    if (pos.pixels >= pos.maxScrollExtent - 200) {
      _loadMore();
    }
  }

  /// 首屏 / 刷新
  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _page = 1;
      _hasMore = true;
    });
    try {
      final res = await AdminApi.instance.catchRecords(
        date: _dateFilter,
        billStatus: _billStatusFilter,
        page: 1,
        pageSize: _pageSize,
      );
      if (mounted) {
        setState(() {
          _records = res.records;
          _total = res.total;
          _hasMore = res.hasMore;
          _page = 1;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = '加载失败：$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// 加载下一页
  Future<void> _loadMore() async {
    if (_loadingMore || !_hasMore || _loading) return;
    setState(() => _loadingMore = true);
    try {
      final next = _page + 1;
      final res = await AdminApi.instance.catchRecords(
        date: _dateFilter,
        billStatus: _billStatusFilter,
        page: next,
        pageSize: _pageSize,
      );
      if (mounted) {
        setState(() {
          _records = [..._records, ...res.records];
          _total = res.total;
          _hasMore = res.hasMore;
          _page = next;
        });
      }
    } on ApiException catch (_) {
      // 加载更多失败静默，用户可下拉重试
    } catch (_) {} finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2024, 1, 1),
      lastDate: DateTime.now().add(const Duration(days: 1)),
      locale: const Locale('zh', 'CN'),
    );
    if (picked != null) {
      setState(() {
        _dateFilter = picked.toIso8601String().substring(0, 10);
      });
      _load();
    }
  }

  double _totalWeight() {
    double t = 0;
    for (final r in _records) {
      t += double.tryParse(r.weight) ?? 0;
    }
    return t;
  }

  int get _unpaidCount =>
      _records.where((r) => r.hasUnpaidBill).length;

  double _unpaidAmount() {
    double t = 0;
    for (final r in _records) {
      if (r.hasUnpaidBill) t += double.tryParse(r.billAmount ?? r.extraFee) ?? 0;
    }
    return t;
  }

  /// 打开收款弹层
  Future<void> _showPayQr(CatchRecord r) async {
    final bid = r.billId;
    if (bid == null) return;
    final loading = ScaffoldMessenger.of(context)
      ..showSnackBar(const SnackBar(
          content: Text('正在生成收款码...'), duration: Duration(seconds: 30)));
    try {
      final q = await AdminApi.instance.generatePayQr(bid);
      loading.hideCurrentSnackBar();
      if (!mounted) return;
      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => PayQrSheet(
            qr: q, who: '${r.nickName}(${r.memberNo})', billId: bid),
      );
    } on ApiException catch (e) {
      loading.hideCurrentSnackBar();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(kBackgroundColor),
      appBar: AppBar(
        title: const Text('渔获记录'),
        backgroundColor: const Color(kPrimaryColor),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: Column(
        children: [
          // 汇总条
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                      '共 $_total 条 · 已载 ${_records.length} 条 · ${_totalWeight().toStringAsFixed(2)} 斤',
                      style: const TextStyle(fontSize: 13)),
                ),
                if (_unpaidCount > 0)
                  Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFC62828).withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text('未收(已载) $_unpaidCount 单 ${_unpaidAmount().toStringAsFixed(2)} 元',
                        style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFFC62828),
                            fontWeight: FontWeight.bold)),
                  ),
                TextButton.icon(
                  onPressed: _pickDate,
                  icon: const Icon(Icons.calendar_today_outlined, size: 16),
                  label: Text(
                      _dateFilter == null ? '全部日期' : _dateFilter!),
                ),
                if (_dateFilter != null)
                  IconButton(
                    icon: const Icon(Icons.clear, size: 18),
                    onPressed: () {
                      setState(() {
                        _dateFilter = null;
                        _records = [];
                      });
                      _load();
                    },
                  ),
              ],
            ),
          ),
          // 账单状态筛选（未收款订单永远可找）
          Container(
            color: Colors.white,
            padding: const EdgeInsets.only(left: 12, right: 12, bottom: 8),
            child: Row(
              children: [
                Expanded(
                  child: Wrap(
                    spacing: 8,
                    children: [
                      _filterChip('全部', null),
                      _filterChip('待收款', 'pending'),
                      _filterChip('已支付', 'paid'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(_error!,
                                  style:
                                      TextStyle(color: Colors.grey.shade700)),
                              const SizedBox(height: 12),
                              OutlinedButton(
                                  onPressed: _load,
                                  child: const Text('重试')),
                            ],
                          ),
                        ),
                      )
                    : _records.isEmpty
                        ? const Center(child: Text('暂无渔获记录'))
                        : RefreshIndicator(
                            onRefresh: _load,
                            color: const Color(kPrimaryColor),
                            child: ListView.separated(
                              controller: _scrollCtrl,
                              padding: const EdgeInsets.all(12),
                              itemCount: _records.length + 1,
                              separatorBuilder: (_, _) =>
                                  const SizedBox(height: 10),
                              itemBuilder: (_, i) {
                                if (i == _records.length) {
                                  return _buildFooter();
                                }
                                return _buildRecordCard(_records[i]);
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String label, String? value) {
    final selected = _billStatusFilter == value;
    return ChoiceChip(
      label: Text(label, style: const TextStyle(fontSize: 12)),
      selected: selected,
      onSelected: (_) {
        if (_billStatusFilter == value) return;
        setState(() => _billStatusFilter = value);
        _load();
      },
      selectedColor: const Color(kPrimaryColor).withValues(alpha: 0.15),
      labelStyle: TextStyle(
        color: selected ? const Color(kPrimaryColor) : Colors.black87,
        fontWeight: selected ? FontWeight.bold : FontWeight.normal,
      ),
      visualDensity: VisualDensity.compact,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }

  Widget _buildFooter() {
    if (_loadingMore) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Center(
          child: SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      );
    }
    if (!_hasMore) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Center(
          child: Text('已显示全部 $_total 条',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
        ),
      );
    }
    return TextButton(
      onPressed: _loadMore,
      child: const Text('加载更多'),
    );
  }

  Widget _buildRecordCard(CatchRecord r) {
    final date = r.catchDate.isNotEmpty ? r.catchDate.substring(0, 10) : '';
    final fee = double.tryParse(r.feeLabel) ?? 0;
    final overdue = double.tryParse(r.overWeight) ?? 0;
    final useQuota = double.tryParse(r.useQuota) ?? 0;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                  r.isRecycle
                      ? Icons.recycling
                      : Icons.phishing,
                  color: const Color(kPrimaryColor),
                  size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                    '${r.nickName}（${r.memberNo}）',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 15)),
              ),
              // 账单状态徽标
              if (r.billStatus != null)
                _statusChip(r.billStatus!)
              else if (fee > 0)
                const _Chip('待结算', Color(0xFFF57C00))
              else
                _chipGreen('已结清'),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _infoRow(Icons.scale, '${r.weight} 斤')),
              const SizedBox(width: 14),
              if (r.isRecycle)
                const _Chip('回收', Color(kPrimaryColor)),
            ],
          ),
          if (r.catchDate.isNotEmpty)
            _infoRow(Icons.event, '${date}${r.isRecycle ? "" : ""}'),
          // 结算明细
          if (useQuota > 0 || overdue > 0)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Text(
                '额度抵 ${useQuota.toStringAsFixed(2)} 斤'
                '${overdue > 0 ? " · 超出 ${overdue.toStringAsFixed(2)} 斤" : ""}'
                '${(double.tryParse(r.pointsEarned) ?? 0) > 0 ? " · +${r.pointsEarned}分" : ""}',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
              ),
            ),
          if (r.remark.isNotEmpty) _infoRow(Icons.notes, r.remark),
          // 账单 / 收款操作
          if (r.billStatus != null || fee > 0) ...[
            const Divider(height: 14),
            Row(
              children: [
                Expanded(
                  child: Text(
                    '账单 ${r.billNo ?? ""} · '
                    '应收 ¥${fee.toStringAsFixed(2)}',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: r.hasUnpaidBill
                            ? const Color(0xFFC62828)
                            : Colors.black87),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (r.hasUnpaidBill)
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(kPrimaryColor),
                      minimumSize: const Size(0, 32),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      textStyle: const TextStyle(fontSize: 13),
                    ),
                    onPressed: () => _showPayQr(r),
                    icon: const Icon(Icons.qr_code, size: 16),
                    label: const Text('生成收款码'),
                  )
                else if (r.billStatus == 'paid')
                  Text('已支付',
                      style: TextStyle(
                          fontSize: 12,
                          color: Colors.green.shade700,
                          fontWeight: FontWeight.w500)),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _statusChip(String status) {
    switch (status) {
      case 'paid':
        return _chipGreen('已支付');
      case 'pending':
        return const _Chip('待收款', Color(0xFFF57C00));
      case 'cancelled':
        return const _Chip('已取消', Colors.grey);
      default:
        return _chipGreen(status);
    }
  }

  Widget _chipGreen(String text) =>
      _Chip(text, const Color(kPrimaryLight));

  Widget _infoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Icon(icon, size: 15, color: Colors.grey.shade500),
          const SizedBox(width: 6),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String text;
  final Color color;
  const _Chip(this.text, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(text,
          style: TextStyle(
              fontSize: 11,
              color: color,
              fontWeight: FontWeight.bold)),
    );
  }
}
