import 'package:flutter/material.dart';

import '../api/admin_api.dart';
import '../api/api_client.dart';
import '../config.dart';
import '../models/models.dart';
import '../nav.dart';
import 'catch_history_page.dart';
import 'order_page.dart';

/// 工作台（概览统计 + 快捷入口）
class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  OverviewStats? _stats;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final stats = await AdminApi.instance.statsOverview();
      if (mounted) setState(() => _stats = stats);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = '加载失败：$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(kBackgroundColor),
      appBar: AppBar(
        title: const Text('丰鱼管理'),
        backgroundColor: const Color(kPrimaryColor),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _load,
            tooltip: '刷新',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: const Color(kPrimaryColor),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildHeader(),
            const SizedBox(height: 16),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              _buildError()
            else if (_stats != null)
              _buildStatsCard(_stats!)
            else
              const SizedBox(),
            if (_stats != null) ...[
              const SizedBox(height: 16),
              _buildTodayBar(_stats!),
            ],
            const SizedBox(height: 16),
            const Text('功能管理',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _buildMenuGrid(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    final now = DateTime.now();
    return Row(
      children: [
        const CircleAvatar(
          radius: 22,
          backgroundColor: Color(kPrimaryColor),
          child: Icon(Icons.admin_panel_settings, color: Colors.white),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('您好，${api.adminName}',
                  style: const TextStyle(
                      fontSize: 17, fontWeight: FontWeight.bold)),
              Text(
                _stats == null
                    ? '欢迎回来'
                    : '${now.month}月${now.day}日 · 今日概览',
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
              ),
            ],
          ),
        ),
        const Chip(
          label: Text('线上版', style: TextStyle(fontSize: 11, color: Colors.white)),
          backgroundColor: Color(kPrimaryColor),
          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
      ],
    );
  }

  Widget _buildError() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(12)),
      child: Column(
        children: [
          Icon(Icons.cloud_off, size: 40, color: Colors.grey.shade400),
          const SizedBox(height: 8),
          Text(_error!,
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade700)),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: _load, child: const Text('重试')),
        ],
      ),
    );
  }

  Widget _buildTodayBar(OverviewStats s) {
    final now = DateTime.now();
    final today =
        '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(kPrimaryColor), Color(kPrimaryLight)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.event_available, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Text('今日预约 ${s.todayBookings} 单',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold)),
              const Spacer(),
              const Icon(Icons.chevron_right, color: Colors.white70),
            ],
          ),
          const SizedBox(height: 4),
          const Text('到场即点核销，快速收尾今天',
              style: TextStyle(color: Colors.white70, fontSize: 12)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(kPrimaryColor),
                  ),
                  onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(
                          builder: (_) =>
                              OrderPage(initialDate: today))),
                  icon: const Icon(Icons.verified_user_outlined, size: 18),
                  label: const Text('到场核销'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(kPrimaryColor),
                  ),
                  onPressed: () => AppNav.switchTab(1),
                  icon: const Icon(Icons.add_box_outlined, size: 18),
                  label: const Text('录渔获'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatsCard(OverviewStats s) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _statItem('今日订单', '${s.todayBookings}', Icons.receipt_long,
              const Color(0xFF1976D2)),
          _statItem('今日收入', '¥${_fmtMoney(s.todayRevenue)}', Icons.payments,
              const Color(kPrimaryColor)),
          _statItem('本月渔获', '${s.monthCatchWeight}斤', Icons.phishing,
              const Color(0xFF00796B)),
          _statItem('会员总数', '${s.totalMembers}', Icons.group,
              const Color(0xFFF57C00)),
        ],
      ),
    );
  }

  /// 金额格式化：整数不带小数，否则保留两位；避免 12.0 这种显示
  static String _fmtMoney(double v) {
    if (v == v.roundToDouble()) return v.toInt().toString();
    return v.toStringAsFixed(2);
  }

  Widget _statItem(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 26),
        const SizedBox(height: 6),
        Text(value,
            style: TextStyle(
                fontSize: 16, fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 2),
        Text(label,
            style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
      ],
    );
  }

  Widget _buildMenuGrid() {
    final menus = [
      _Menu('渔获录入', Icons.phishing, const Color(0xFF00796B),
          () => AppNav.switchTab(1)),
      _Menu('订单管理', Icons.receipt_long, const Color(0xFF1976D2),
          () => AppNav.switchTab(2)),
      _Menu('会员管理', Icons.group, const Color(0xFFF57C00),
          () => AppNav.switchTab(3)),
      _Menu('渔获记录', Icons.history, const Color(0xFF6A1B9A), () {
        Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => const CatchHistoryPage()));
      }),
      _Menu('退出登录', Icons.logout, Colors.redAccent, _confirmLogout),
    ];
    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 0.95,
      children: menus.map((m) => _menuItem(m)).toList(),
    );
  }

  Future<void> _confirmLogout() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('退出登录'),
        content: const Text('确定要退出当前管理账号吗？'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('取消')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('退出', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (ok == true) AppNav.logout();
  }

  Widget _menuItem(_Menu m) {
    return InkWell(
      onTap: m.onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: m.color.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(m.icon, color: m.color, size: 26),
            ),
            const SizedBox(height: 8),
            Text(m.label,
                style: const TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}

class _Menu {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  _Menu(this.label, this.icon, this.color, this.onTap);
}
