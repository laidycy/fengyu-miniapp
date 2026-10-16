import 'dart:async';

import 'package:flutter/material.dart';

import '../api/admin_api.dart';
import '../api/api_client.dart';
import '../config.dart';
import '../models/models.dart';
import 'pay_qr_sheet.dart';

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

  /// 付费会员升级：选等级(带价格) → 指定邀请人(可选) → 收款二维码
  /// 客户微信扫码付款，支付回调自动升级 + 绑定邀请人（不覆盖已有邀请人）
  Future<void> _upgradeMember(Member m) async {
    // 1. 取会员等级价格
    Map<String, Map<String, dynamic>> prices;
    try {
      prices = await AdminApi.instance.getPricing();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('价格获取失败：$e')));
      }
      return;
    }
    if (!mounted) return;

    // 2. 选等级（只列比当前高的）
    const rank = {'guest': 0, 'silver': 1, 'gold': 2, 'diamond': 3};
    final curRank = rank[m.level] ?? 0;
    final candidates = const [
      ('silver', '银卡'),
      ('gold', '金卡'),
      ('diamond', '钻石'),
    ].where((e) => (rank[e.$1] ?? 0) > curRank).toList();
    if (candidates.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('该会员已是最高等级（钻石），无需升级')));
      }
      return;
    }
    final pickedLevel = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text('为 ${m.nickName} 选择升级等级',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.bold)),
            ),
            ...candidates.map((e) {
              final p = prices[e.$1];
              final price = p?['price']?.toString() ?? '—';
              final pts = p?['points']?.toString() ?? '';
              return ListTile(
                title: Text('${e.$2}会员'),
                subtitle: Text(pts.isNotEmpty
                    ? '¥$price/年 · 开卡送 $pts 积分'
                    : '¥$price/年'),
                onTap: () => Navigator.pop(ctx, e.$1),
              );
            }),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (pickedLevel == null) return;

    // 3. 指定邀请人（可选）
    final inviterUserId = await showModalBottomSheet<int>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _InviterPickSheet(target: m),
    );
    if (!mounted) return;

    // 4. 生成收款二维码
    final levelName = kMemberLevelNames[pickedLevel] ?? pickedLevel;
    final price = prices[pickedLevel]?['price']?.toString() ?? '—';
    try {
      final qr = await AdminApi.instance.generateUpgradePayQr(
          m.id, pickedLevel, inviterUserId: inviterUserId);
      if (!mounted) return;
      if (qr.alreadyPaid) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(
                '无需付款：已是 ${kMemberLevelNames[qr.memberLevel ?? m.level] ?? qr.memberLevel} 或更高等级')));
        _load();
        return;
      }
      showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        builder: (ctx) => PayQrSheet(
          qr: qr,
          who: '${m.nickName} · $levelName会员 ¥$price'
              '${inviterUserId != null ? '（含指定邀请人）' : ''}',
          onRefresh: () =>
              AdminApi.instance.generateUpgradePayQr(m.id, pickedLevel,
                  inviterUserId: inviterUserId),
        ),
      );
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('生成收款码失败：$e')));
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
          if (m.inviterDisplay.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Row(
                children: [
                  Icon(Icons.person_add,
                      size: 12, color: Colors.grey.shade500),
                  const SizedBox(width: 3),
                  Flexible(
                    child: Text(
                      '邀请人：${m.inviterDisplay}${m.inviterNo.isNotEmpty ? "（${m.inviterNo}）" : ""}',
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 11, color: Colors.grey.shade600),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton.icon(
                onPressed: () => _upgradeMember(m),
                style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    minimumSize: const Size(0, 32),
                    textStyle: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.bold)),
                icon: const Icon(Icons.qr_code_2, size: 16),
                label: const Text('付费升级'),
              ),
              const SizedBox(width: 4),
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

/// 指定邀请人弹层（可选）：搜索会员 → 选人；「不指定」继续；关闭=取消升级
/// 返回邀请人 user_id；「不指定」与关闭都返回 null（关闭=不继续，调用方用
/// Navigator.pop 返回值无法区分，故关闭也视为放弃升级，交互上已有提示）
class _InviterPickSheet extends StatefulWidget {
  final Member target;
  const _InviterPickSheet({required this.target});

  @override
  State<_InviterPickSheet> createState() => _InviterPickSheetState();
}

class _InviterPickSheetState extends State<_InviterPickSheet> {
  final _ctrl = TextEditingController();
  final _focus = FocusNode();
  Timer? _debounce;
  List<Member> _results = [];
  bool _loading = false;
  bool _searched = false;

  @override
  void dispose() {
    _ctrl.dispose();
    _focus.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _search(String kw) {
    if (kw.isEmpty) {
      _searched = false;
      _results = [];
      return;
    }
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 450), () async {
      setState(() => _loading = true);
      try {
        final res = await AdminApi.instance.members(keyword: kw, pageSize: 20);
        if (!mounted) return;
        setState(() {
          // 排除会员本人
          _results =
              res.members.where((e) => e.userId != widget.target.userId).toList();
          _searched = true;
        });
      } catch (_) {}
      if (mounted) setState(() => _loading = false);
    });
  }

  /// 搜索结果列表区（加载中/无结果/列表）
  Widget _buildResultBody() {
    if (_loading) {
      return const Padding(
          padding: EdgeInsets.symmetric(vertical: 24),
          child:
              Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))));
    }
    if (!_searched) {
      return const SizedBox.shrink();
    }
    if (_results.isEmpty) {
      return const Padding(
          padding: EdgeInsets.symmetric(vertical: 24),
          child: Text('未找到该会员',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Colors.grey)));
    }
    return ListView.builder(
      shrinkWrap: true,
      itemCount: _results.length,
      itemBuilder: (_, i) {
        final e = _results[i];
        return ListTile(
          dense: true,
          leading: CircleAvatar(
              radius: 16,
              backgroundColor: const Color(kPrimaryColor)
                  .withValues(alpha: 0.12),
              child: Text(
                  e.nickName.isEmpty
                      ? '?'
                      : e.nickName.characters.first,
                  style: const TextStyle(
                      fontSize: 13, color: Color(kPrimaryColor)))),
          title: Text(e.nickName.isEmpty ? '未命名用户' : e.nickName,
              style: const TextStyle(fontSize: 14)),
          subtitle: Text('${e.memberNo} · ${kMemberLevelNames[e.level] ?? e.level}会员',
              style: const TextStyle(fontSize: 11, color: Colors.grey)),
          onTap: () => Navigator.pop(context, e.userId),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text('指定邀请人（可选）',
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold)),
                ),
                Text('为 ${widget.target.nickName} 办卡',
                    style:
                        TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close, color: Colors.grey),
                ),
              ],
            ),
            if (widget.target.inviterDisplay.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  '当前邀请人：${widget.target.inviterDisplay}（已有邀请人不会被覆盖，选择仅在无邀请人时生效）',
                  style: TextStyle(
                      fontSize: 11, color: Colors.grey.shade600),
                ),
              ) else
              const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    focusNode: _focus,
                    onChanged: _search,
                    onSubmitted: (v) => _search(v),
                    decoration: const InputDecoration(
                      hintText: '搜索会员号 / 昵称 / 手机号',
                      isDense: true,
                      prefixIcon: Icon(Icons.search, size: 20),
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Flexible(child: _buildResultBody()),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => Navigator.pop(context, null),
                style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12)),
                child: const Text('不指定邀请人，继续'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
