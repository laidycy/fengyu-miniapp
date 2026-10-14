import 'package:flutter/material.dart';

import '../api/admin_api.dart';
import '../api/api_client.dart';
import '../config.dart';
import '../models/models.dart';
import 'gear_settle_sheet.dart';

/// 订单管理页
class OrderPage extends StatefulWidget {
  /// 若传入则默认按该日期(YYYY-MM-DD)过滤，用于工作台"今日到场"快捷入口
  final String? initialDate;
  const OrderPage({super.key, this.initialDate});

  @override
  State<OrderPage> createState() => _OrderPageState();
}

class _OrderPageState extends State<OrderPage> {
  final ScrollController _scrollCtrl = ScrollController();
  List<Order> _orders = [];
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = true;
  int _page = 1;
  int _total = 0;
  static const int _pageSize = 20;
  String? _error;
  String? _statusFilter;
  String? _dateFilter;

  static const _statusOptions = [
    (null, '全部'),
    ('pending', '待确认'),
    ('confirmed', '已确认'),
    ('used', '已核销'),
    ('cancelled', '已取消'),
    ('refunded', '已退款'),
  ];

  @override
  void initState() {
    super.initState();
    _dateFilter = widget.initialDate;
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
    if (_scrollCtrl.position.pixels >=
        _scrollCtrl.position.maxScrollExtent - 120) {
      _loadMore();
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _page = 1;
      _hasMore = true;
    });
    try {
      final res = await AdminApi.instance.orders(
          status: _statusFilter, date: _dateFilter, page: 1, pageSize: _pageSize);
      if (mounted) {
        setState(() {
          _orders = res.orders;
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

  Future<void> _loadMore() async {
    if (_loadingMore || !_hasMore || _loading) return;
    setState(() => _loadingMore = true);
    try {
      final next = _page + 1;
      final res = await AdminApi.instance.orders(
          status: _statusFilter,
          date: _dateFilter,
          page: next,
          pageSize: _pageSize);
      if (mounted) {
        setState(() {
          _orders = [..._orders, ...res.orders];
          _total = res.total;
          _hasMore = res.hasMore;
          _page = next;
        });
      }
    } on ApiException catch (_) {
      // 静默失败，下拉可重试
    } catch (_) {} finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2024, 1, 1),
      lastDate: DateTime.now().add(const Duration(days: 30)),
      locale: const Locale('zh', 'CN'),
    );
    if (picked != null) {
      setState(() {
        _dateFilter = picked.toIso8601String().substring(0, 10);
      });
      _load();
    }
  }

  void _clearDate() {
    setState(() => _dateFilter = null);
    _load();
  }

  /// 改订单状态
  Future<void> _changeStatus(Order o, String newStatus) async {
    final names = kOrderStatusNames;
    try {
      await AdminApi.instance.updateOrderStatus(o.id, newStatus);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('已${names[newStatus] ?? newStatus}'),
          backgroundColor: const Color(kPrimaryColor)));
      _load();
    } on ApiException catch (e) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  /// 渔具租赁结算弹层（照渔获录入）→ 关闭后刷新列表
  Future<void> _showGearSettle(Order o) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => GearSettleSheet(order: o),
    );
    _load();
  }

  void _showStatusAction(Order o) {
    final actions = <(String, String)>[];
    if (o.status == 'pending') actions.add(('confirmed', '确认订单'));
    if (o.status == 'confirmed') actions.add(('used', '核销(到场)'));
    if (o.status == 'pending' || o.status == 'confirmed') {
      actions.add(('cancelled', '取消订单'));
    }
    if (o.status == 'confirmed' || o.status == 'used') {
      // 退款需服务端支持，先仅提示
    }
    if (actions.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('当前状态无可执行操作')));
      return;
    }
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('订单操作',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
            ...actions.map((a) => ListTile(
                  leading: Icon(
                      a.$1 == 'cancelled'
                          ? Icons.close
                          : a.$1 == 'used'
                              ? Icons.check_circle
                              : Icons.verified,
                      color: const Color(kPrimaryColor)),
                  title: Text(a.$2),
                  onTap: () {
                    Navigator.pop(ctx);
                    _changeStatus(o, a.$1);
                  },
                )),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(kBackgroundColor),
      appBar: AppBar(
        title: const Text('订单管理'),
        backgroundColor: const Color(kPrimaryColor),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: Column(
        children: [
          _buildFilterBar(),
          const Divider(height: 1),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? _buildError()
                    : _orders.isEmpty
                        ? const Center(child: Text('暂无订单数据'))
                        : RefreshIndicator(
                            onRefresh: _load,
                            color: const Color(kPrimaryColor),
                            child: ListView.separated(
                              controller: _scrollCtrl,
                              padding: const EdgeInsets.all(12),
                              itemCount: _orders.length + 1,
                              separatorBuilder: (_, _) =>
                                  const SizedBox(height: 10),
                              itemBuilder: (_, i) {
                                if (i == _orders.length) {
                                  return _buildFooter();
                                }
                                return _buildOrderCard(_orders[i]);
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: Row(
        children: [
          // 状态筛选
          Expanded(
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String?>(
                value: _statusFilter,
                isExpanded: true,
                icon: const Icon(Icons.arrow_drop_down),
                items: _statusOptions
                    .map((e) => DropdownMenuItem<String?>(
                        value: e.$1, child: Text(e.$2)))
                    .toList(),
                onChanged: (v) {
                  setState(() => _statusFilter = v);
                  _load();
                },
              ),
            ),
          ),
          // 总数
          if (!_loading)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Text('共 $_total 条',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
            ),
          // 日期筛选
          TextButton.icon(
            onPressed: _dateFilter == null ? _pickDate : _clearDate,
            icon: Icon(_dateFilter == null
                ? Icons.calendar_today_outlined
                : Icons.clear),
            label: Text(_dateFilter == null ? '日期' : _dateFilter!),
          ),
        ],
      ),
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
    return TextButton(onPressed: _loadMore, child: const Text('加载更多'));
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_error!, style: TextStyle(color: Colors.grey.shade700)),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: _load, child: const Text('重试')),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderCard(Order o) {
    final statusColor = _statusColor(o.status);
    final gear = o.gear;
    final gearFee = double.tryParse(o.gearFee) ?? 0;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(o.orderNo,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 14)),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                    kOrderStatusNames[o.status] ?? o.status,
                    style: TextStyle(
                        color: statusColor, fontSize: 12, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _infoRow(Icons.event, '${o.date}  ·  ${kTimeSlotNames[o.timeSlot] ?? o.timeSlot}'),
          _infoRow(Icons.person, '${o.nickName}（${o.phone.isEmpty ? "无手机" : o.phone}）'),
          if (o.memberNo != null && o.memberNo!.isNotEmpty)
            _infoRow(Icons.badge_outlined, '会员号 ${o.memberNo}'),
          _infoRow(Icons.groups, '${o.peopleCount} 人  ·  实付 ¥${o.totalAmount}'),
          if (o.bookingCode.isNotEmpty)
            _infoRow(Icons.qr_code, '核销码 ${o.bookingCode}'),
          if (gear != null)
            _infoRow(Icons.phishing, '渔具租赁：${gear.display}'),
          if (gearFee > 0)
            _infoRow(Icons.payments,
                '渔具费用 ¥${o.gearFee}${o.gearFeePaid ? "（已收）" : "（待收）"}'),
          const Divider(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton.icon(
                  onPressed: () => _showGearSettle(o),
                  icon: const Icon(Icons.phishing, size: 18),
                  label: Text(o.gearFeePaid
                      ? '渔具已收'
                      : (gearFee > 0 ? '渔具结算¥${o.gearFee}' : '渔具结算'))),
              TextButton.icon(
                  onPressed: () => _showStatusAction(o),
                  icon: const Icon(Icons.more_horiz),
                  label: const Text('操作')),
            ],
          ),
        ],
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'pending':
        return const Color(0xFFF57C00);
      case 'confirmed':
        return const Color(0xFF1976D2);
      case 'used':
        return const Color(kPrimaryColor);
      case 'cancelled':
        return Colors.grey;
      case 'refunded':
        return Colors.redAccent;
      default:
        return Colors.grey;
    }
  }

  Widget _infoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey.shade500),
          const SizedBox(width: 6),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }
}
