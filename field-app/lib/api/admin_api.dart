/// 管理端 API 方法（统一前缀 /api/admin，已由 ApiClient 处理）
library;

import '../config.dart';
import '../models/models.dart';
import 'api_client.dart';

class AdminApi {
  AdminApi._();
  static final AdminApi instance = AdminApi._();

  /// 概览统计
  Future<OverviewStats> statsOverview() async {
    final d = await api.get('$kAdminPrefix/stats/overview');
    return OverviewStats.fromJson(((d as Map?)?.cast<String, dynamic>()) ?? {});
  }

  /// 订单列表（分页）
  /// [status] 可选: pending/confirmed/used/cancelled/refunded
  /// [date] 可选: YYYY-MM-DD
  /// 返回 {orders,total,page,pageSize,hasMore}
  Future<OrderListResult> orders({
    String? status,
    String? date,
    int page = 1,
    int pageSize = 20,
  }) async {
    final query = <String, String>{
      'page': '$page',
      'pageSize': '$pageSize',
      if (status != null && status.isNotEmpty) 'status': status,
      if (date != null && date.isNotEmpty) 'date': date,
    };
    final d = await api.get('$kAdminPrefix/orders', query: query);
    // 后端返回 {list,total,page,pageSize}；兼容裸数组
    List list;
    int total;
    if (d is List) {
      list = d;
      total = d.length;
    } else {
      final m = (d as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
      list = (m['list'] as List?) ?? [];
      total = (m['total'] as num?)?.toInt() ?? list.length;
    }
    final orders = list
        .whereType<Map>()
        .map((e) => Order.fromJson(e.cast<String, dynamic>()))
        .toList();
    return OrderListResult(orders: orders, total: total, page: page, pageSize: pageSize);
  }

  /// 改订单状态
  Future<void> updateOrderStatus(int orderId, String status) async {
    await api.put('$kAdminPrefix/orders/$orderId/status',
        body: {'status': status});
  }

  /// 会员列表（分页）
  /// [page] 页码从 1 开始；[pageSize] 每页条数（后端默认 20）
  /// 返回 {members,total,page,pageSize}
  Future<MemberListResult> members({
    String? keyword,
    String? level,
    bool? phoneBound,
    int page = 1,
    int pageSize = 20,
  }) async {
    final query = <String, String>{
      'page': '$page',
      'pageSize': '$pageSize',
      if (keyword != null && keyword.isNotEmpty) 'keyword': keyword,
      if (level != null && level.isNotEmpty) 'level': level,
      if (phoneBound != null) 'phoneBound': phoneBound ? 'bound' : 'unbound',
    };
    final d = await api.get('$kAdminPrefix/members', query: query);
    // 兼容数组与 {list,total}
    List list;
    int total;
    if (d is List) {
      list = d;
      total = d.length;
    } else {
      final m = (d as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
      list = (m['list'] as List?) ?? [];
      total = (m['total'] as num?)?.toInt() ?? list.length;
    }
    final members = list
        .whereType<Map>()
        .map((e) => Member.fromJson(e.cast<String, dynamic>()))
        .toList();
    return MemberListResult(
        members: members, total: total, page: page, pageSize: pageSize);
  }

  /// 会员价格配置（等级名/价格/赠送积分）
  /// 返回 {silver: {name, price, points}, ...}
  Future<Map<String, Map<String, dynamic>>> getPricing() async {
    final d = await api.get('$kAdminPrefix/pricing');
    final m = (d as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
    final levels = <String, Map<String, dynamic>>{};
    final list = (m['memberLevels'] as List?) ?? [];
    for (final e in list) {
      final j = e.cast<String, dynamic>();
      levels[j['level']?.toString() ?? ''] = {
        'name': j['name']?.toString() ?? '',
        'price': j['price']?.toString() ?? '0',
        'points': j['points']?.toString() ?? '0',
      };
    }
    return levels;
  }

  /// 会员付费升级收款码（Native 微信扫码）
  /// [level] silver/gold/diamond；[inviterUserId] 可选邀请人 user_id
  Future<PayQr> generateUpgradePayQr(int memberId, String level,
      {int? inviterUserId}) async {
    final d = await api.post('$kAdminPrefix/members/$memberId/upgrade-pay-qr',
        body: {
          'level': level,
          if (inviterUserId != null) 'inviterUserId': inviterUserId,
        });
    return PayQr.fromJson(((d as Map?)?.cast<String, dynamic>()) ?? {});
  }

  /// 改会员等级
  Future<void> updateMemberLevel(int memberId, String level) async {
    await api.put('$kAdminPrefix/members/$memberId/level', body: {'level': level});
  }

  /// 修改会员福利鱼额度（斤）— memberId = members.id，quota ≥ 0
  Future<void> updateMemberQuota(int memberId, double quota) async {
    await api.put('$kAdminPrefix/members/$memberId/quota',
        body: {'quota': quota});
  }

  /// 解绑会员手机号 — memberId = members.id
  Future<void> unbindMemberPhone(int memberId) async {
    await api.put('$kAdminPrefix/members/$memberId/unbind-phone', body: {});
  }

  /// 用户搜索（录渔获选人）
  Future<List<UserSearchResult>> searchUsers(String kw) async {
    final d = await api.get('$kAdminPrefix/users/search',
        query: {'kw': kw});
    // 防御：后端可能返回 {list:[...]} 或裸数组；元素可能非 Map
    final raw = d is List ? d : (d is Map ? (d['list'] as List?) : null) ?? const [];
    return raw
        .whereType<Map>()
        .map((e) => UserSearchResult.fromJson(e.cast<String, dynamic>()))
        .toList();
  }

  /// 渔获记录列表（分页）
  /// [page] 页码从 1 开始；[pageSize] 每页条数（默认 20，最大 100）
  /// [date] 可选 过滤日期 YYYY-MM-DD；[fishType] 可选 鱼种
  /// [billStatus] 可选 账单状态过滤：'pending' 只看待收款 / 'paid' 已支付 / 'unpaid' 未收款
  /// 返回 {list,total,page,pageSize,hasMore}
  Future<CatchRecordListResult> catchRecords({
    String? date,
    String? fishType,
    String? billStatus,
    int page = 1,
    int pageSize = 20,
  }) async {
    final query = <String, String>{
      'page': '$page',
      'pageSize': '$pageSize',
      if (date != null && date.isNotEmpty) 'date': date,
      if (fishType != null && fishType.isNotEmpty) 'fishType': fishType,
      if (billStatus != null && billStatus.isNotEmpty) 'billStatus': billStatus,
    };
    final d = await api.get('$kAdminPrefix/catch-records', query: query);
    List list;
    int total;
    if (d is List) {
      list = d;
      total = d.length;
    } else {
      final m = (d as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
      list = (m['list'] as List?) ?? [];
      total = (m['total'] as num?)?.toInt() ?? list.length;
    }
    final records = list
        .whereType<Map>()
        .map((e) => CatchRecord.fromJson(e.cast<String, dynamic>()))
        .toList();
    return CatchRecordListResult(
      records: records,
      total: total,
      page: page,
      pageSize: pageSize,
    );
  }

  /// 上传图片（渔获照片）→ 返回可访问的相对 url（如 /uploads/catch/xxx.jpg）
  /// 后端接口：POST /api/admin/upload，body {"image": "data:image/jpeg;base64,..."}
  Future<String> uploadImage(String dataUrl) async {
    final d = await api.post('$kAdminPrefix/upload', body: {'image': dataUrl});
    final m = ((d as Map?)?.cast<String, dynamic>()) ?? {};
    return m['url']?.toString() ?? '';
  }

  /// 录入渔获（自动结算）→ 返回结算结果
  /// 对齐设计定稿 2026-09-07：鱼种统一混合鱼种；积分=重量；
  /// 优先抵福利鱼额度，超出按卡种价(会员14.8/散客16/回收5)；费用>0 自动生成账单。
  /// [userId] 或 [memberNo] 二选一（后端 user_id 可传 member_no 解析）
  Future<CatchSettleResult> addCatchRecord({
    int? userId,
    String? memberNo,
    required String weight,
    required String catchDate, // YYYY-MM-DD
    bool isRecycle = false,
    String remark = '',
    String? photo,
  }) async {
    final body = <String, dynamic>{
      if (userId != null) 'user_id': userId,
      if (memberNo != null && memberNo.isNotEmpty) 'member_no': memberNo,
      'weight': weight,
      'catch_date': catchDate,
      'is_recycle': isRecycle,
      'remark': remark,
      if (photo != null && photo.isNotEmpty) 'photo': photo,
    };
    final d = await api.post('$kAdminPrefix/catch-records', body: body);
    return CatchSettleResult.fromJson(
        ((d as Map?)?.cast<String, dynamic>()) ?? {});
  }

  /// 生成渔获账单收款二维码（Native 扫码支付）
  /// [billId] = catch_bills.id（渔获记录列表里的 bill_id），幂等可重复调用
  Future<PayQr> generatePayQr(int billId) async {
    final d =
        await api.post('$kAdminPrefix/catch-bills/$billId/pay-qr', body: {});
    return PayQr.fromJson(((d as Map?)?.cast<String, dynamic>()) ?? {});
  }

  /// 渔具租赁结算（工作人员手工填金额）
  /// [fee] 应收金额（元）；[items] 实际租用设备 key 列表；[note] 备注
  /// 后端：POST /api/admin/orders/:id/gear-settle → 写入 orders.gear_fee / gear_settle
  Future<void> gearSettle(
    int orderId,
    double fee, {
    List<String> items = const [],
    String note = '',
  }) async {
    await api.post('$kAdminPrefix/orders/$orderId/gear-settle',
        body: {'fee': fee, 'items': items, 'note': note});
  }

  /// 生成渔具租赁费用收款二维码（Native 扫码支付）
  /// 后端：POST /api/admin/orders/:id/gear-pay-qr，幂等可重复调用
  Future<PayQr> generateGearPayQr(int orderId) async {
    final d =
        await api.post('$kAdminPrefix/orders/$orderId/gear-pay-qr', body: {});
    return PayQr.fromJson(((d as Map?)?.cast<String, dynamic>()) ?? {});
  }

  /// 修改当前管理员登录密码（原密码校验通过后更新）
  Future<void> changePassword(String oldPassword, String newPassword) async {
    await api.post('$kAdminPrefix/change-password',
        body: {'oldPassword': oldPassword, 'newPassword': newPassword});
  }
}
