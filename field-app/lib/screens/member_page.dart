import 'package:flutter/material.dart';

import '../api/admin_api.dart';
import '../api/api_client.dart';
import '../config.dart';
import '../models/models.dart';

/// 会员管理页
class MemberPage extends StatefulWidget {
  const MemberPage({super.key});

  @override
  State<MemberPage> createState() => _MemberPageState();
}

class _MemberPageState extends State<MemberPage> {
  List<Member> _members = [];
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = true;
  int _page = 1;
  int _total = 0;
  static const int _pageSize = 20;
  String? _error;
  final _kwCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  String? _levelFilter;

  static const _levelOptions = [
    (null, '全部等级'),
    ('guest', '散客'),
    ('silver', '银卡'),
    ('gold', '金卡'),
    ('diamond', '钻石'),
  ];

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(_onScroll);
    _load();
  }

  @override
  void dispose() {
    _kwCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollCtrl.hasClients) return;
    if (_scrollCtrl.position.pixels >=
        _scrollCtrl.position.maxScrollExtent - 200) {
      _loadMore();
    }
  }

  /// [reset]=true 重新加载第 1 页；false 加载下一页并追加
  Future<void> _load({bool reset = true}) async {
    if (!reset && (_loadingMore || !_hasMore || _loading)) return;
    final nextPage = reset ? 1 : _page + 1;
    setState(() {
      if (reset) {
        _loading = true;
        _error = null;
      } else {
        _loadingMore = true;
      }
    });
    try {
      final res = await AdminApi.instance.members(
        keyword: _kwCtrl.text.trim().isEmpty ? null : _kwCtrl.text.trim(),
        level: _levelFilter,
        page: nextPage,
        pageSize: _pageSize,
      );
      if (!mounted) return;
      setState(() {
        _members = reset ? res.members : [..._members, ...res.members];
        _total = res.total;
        _page = nextPage;
        _hasMore = _members.length < _total && res.members.isNotEmpty;
      });
    } on ApiException catch (e) {
      if (mounted && reset) setState(() => _error = e.message);
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
          _loadingMore = false;
        });
      }
    }
  }

  Future<void> _loadMore() => _load(reset: false);

  void _search() {
    FocusScope.of(context).unfocus();
    _load();
  }

  Future<void> _changeLevel(Member m) async {
    final current = m.level;
    final picked = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text('修改 ${m.nickName} 的等级',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.bold)),
            ),
            ..._levelOptions.where((e) => e.$1 != null).map((e) => ListTile(
                  leading: Icon(
                      e.$1 == current ? Icons.check_circle : Icons.circle_outlined,
                      color: const Color(kPrimaryColor)),
                  title: Text('${e.$2}会员'),
                  onTap: () => Navigator.pop(ctx, e.$1),
                )),
          ],
        ),
      ),
    );
    if (picked == null || picked == current) return;
    try {
      await AdminApi.instance.updateMemberLevel(m.id, picked);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('已将 ${m.nickName} 改为 ${kMemberLevelNames[picked]}会员'),
          backgroundColor: const Color(kPrimaryColor)));
      _load();
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
    }
  }

  /// 调整福利鱼额度（斤）
  Future<void> _changeQuota(Member m) async {
    final ctrl = TextEditingController(
        text: (double.tryParse(m.welfareFishQuota) ?? 0).toString());
    final newVal = await showDialog<double>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('调整 ${m.nickName} 福利鱼额度'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('当前剩余：${m.welfareFishQuota} 斤',
                style: const TextStyle(fontSize: 13)),
            const SizedBox(height: 10),
            TextField(
              controller: ctrl,
              keyboardType: const TextInputType.numberWithOptions(
                  decimal: true),
              decoration: const InputDecoration(
                  labelText: '福利鱼额度(斤)',
                  hintText: '录入池现值，如 10',
                  border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: const Color(kPrimaryColor)),
            onPressed: () =>
                Navigator.pop(ctx, double.tryParse(ctrl.text.trim())),
            child: const Text('保存'),
          ),
        ],
      ),
    );
    if (newVal == null) return;
    if (newVal < 0) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('请输入有效的斤数')));
      }
      return;
    }
    try {
      await AdminApi.instance.updateMemberQuota(m.id, newVal);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('已将福利鱼额度设为 ${newVal.toStringAsFixed(2)} 斤'),
          backgroundColor: const Color(kPrimaryColor)));
      _load();
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
    }
  }

  /// 解绑手机号
  Future<void> _unbindPhone(Member m) async {
    if (m.phone.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('该会员未绑定手机号')));
      return;
    }
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('解绑手机号'),
        content: Text('确定解绑 ${m.nickName}（${m.memberNo}）的手机号 ${m.phone} 吗？\n解绑后该手机可重新注册/绑定。'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('取消')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('确认解绑'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await AdminApi.instance.unbindMemberPhone(m.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('已解绑 ${m.nickName} 手机号'),
          backgroundColor: const Color(kPrimaryColor)));
      _load();
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
    }
  }

  Color _levelColor(String level) {
    switch (level) {
      case 'diamond':
        return const Color(0xFF6A1B9A);
      case 'gold':
        return const Color(0xFFB8860B);
      case 'silver':
        return const Color(0xFF607D8B);
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(kBackgroundColor),
      appBar: AppBar(
        title: const Text('会员管理'),
        backgroundColor: const Color(kPrimaryColor),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: Column(
        children: [
          // 搜索栏
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _kwCtrl,
                    onSubmitted: (_) => _search(),
                    decoration: InputDecoration(
                      hintText: '搜索 会员号/昵称/手机号',
                      isDense: true,
                      prefixIcon: const Icon(Icons.search, size: 20),
                      suffixIcon: _kwCtrl.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                _kwCtrl.clear();
                                _load();
                              },
                            )
                          : null,
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                DropdownButtonHideUnderline(
                  child: DropdownButton<String?>(
                    value: _levelFilter,
                    icon: const Icon(Icons.arrow_drop_down),
                    items: _levelOptions
                        .map((e) => DropdownMenuItem<String?>(
                            value: e.$1, child: Text(e.$2)))
                        .toList(),
                    onChanged: (v) {
                      setState(() => _levelFilter = v);
                      _load();
                    },
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          // 列表
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
                    : _members.isEmpty
                        ? const Center(child: Text('暂无会员数据'))
                        : RefreshIndicator(
                            onRefresh: () => _load(),
                            color: const Color(kPrimaryColor),
                            child: ListView.separated(
                              controller: _scrollCtrl,
                              padding: const EdgeInsets.all(12),
                              itemCount: _members.length + (_hasMore ? 1 : 0),
                              separatorBuilder: (_, _) =>
                                  const SizedBox(height: 10),
                              itemBuilder: (_, i) {
                                if (i >= _members.length) {
                                  return const Padding(
                                    padding:
                                        EdgeInsets.symmetric(vertical: 16),
                                    child: Center(
                                      child: SizedBox(
                                        width: 22,
                                        height: 22,
                                        child: CircularProgressIndicator(
                                            strokeWidth: 2),
                                      ),
                                    ),
                                  );
                                }
                                return _buildMemberCard(_members[i]);
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildMemberCard(Member m) {
    final color = _levelColor(m.level);
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
              Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Text(
                  m.nickName.isEmpty ? '?': m.nickName.characters.first,
                  style: TextStyle(
                      color: color, fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(m.nickName.isEmpty ? '未命名用户' : m.nickName,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 15)),
                    Text('会员号 ${m.memberNo}',
                        style: TextStyle(
                            fontSize: 12, color: Colors.grey.shade600)),
                  ],
                ),
              ),
              GestureDetector(
                onTap: () => _changeLevel(m),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(kMemberLevelNames[m.level] ?? m.level,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Divider(height: 1, color: Colors.grey.shade200),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _miniStat('积分', m.points),
              _miniStat('福利鱼', '${m.welfareFishQuota}斤'),
              _miniStat('邀请', '${m.inviteCount}人'),
              _miniStat('手机', m.phone.isEmpty ? '未绑定' : m.phone),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton.icon(
                onPressed: () => _changeQuota(m),
                style: TextButton.styleFrom(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10),
                    minimumSize: const Size(0, 32),
                    textStyle: const TextStyle(fontSize: 12)),
                icon: const Icon(Icons.storage, size: 16),
                label: const Text('调整额度'),
              ),
              const SizedBox(width: 4),
              TextButton.icon(
                onPressed: () => _unbindPhone(m),
                style: TextButton.styleFrom(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10),
                    minimumSize: const Size(0, 32),
                    foregroundColor: Colors.red,
                    textStyle: const TextStyle(fontSize: 12)),
                icon: const Icon(Icons.phonelink_erase, size: 16),
                label: const Text('解绑手机'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _miniStat(String label, String value) {
    return Column(
      children: [
        Text(value,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        Text(label, style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
      ],
    );
  }
}
