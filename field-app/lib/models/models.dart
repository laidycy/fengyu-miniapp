/// 数据模型（对齐后端 snake_case 返回）
library;

import 'dart:convert';
import '../config.dart';

/// 概览统计
class OverviewStats {
  final int todayBookings;
  final int monthBookings;
  final int totalMembers;
  final String monthCatchWeight; // 后端可能返回 string
  final String monthPointsIssued;
  final String monthPointsConsumed;
  final double todayRevenue; // 今日收入(元) = 今日预约定金 + 今日渔获收款

  OverviewStats({
    required this.todayBookings,
    required this.monthBookings,
    required this.totalMembers,
    required this.monthCatchWeight,
    required this.monthPointsIssued,
    required this.monthPointsConsumed,
    this.todayRevenue = 0,
  });

  factory OverviewStats.fromJson(Map<String, dynamic> j) => OverviewStats(
        todayBookings: (j['todayBookings'] as num?)?.toInt() ?? 0,
        monthBookings: (j['monthBookings'] as num?)?.toInt() ?? 0,
        totalMembers: (j['totalMembers'] as num?)?.toInt() ?? 0,
        monthCatchWeight: j['monthCatchWeight']?.toString() ?? '0',
        monthPointsIssued: j['monthPointsIssued']?.toString() ?? '0',
        monthPointsConsumed: j['monthPointsConsumed']?.toString() ?? '0',
        todayRevenue: (j['todayRevenue'] as num?)?.toDouble() ?? 0,
      );
}

/// 订单
class Order {
  final int id;
  final String orderNo;
  final int userId;
  final String date;
  final String timeSlot;
  final int peopleCount;
  final String unitPrice;
  final String totalAmount;
  final String deposit;
  final String status;
  final String bookingCode;
  final String remark;
  final String? createdAt;
  final String nickName;
  final String phone;
  final String? memberNo;
  // 渔具租赁：登记需求(JSON) + 结算费用 + 是否已收
  final String? gearRental;
  final String gearFee;
  final bool gearFeePaid;

  Order({
    required this.id,
    required this.orderNo,
    required this.userId,
    required this.date,
    required this.timeSlot,
    required this.peopleCount,
    required this.unitPrice,
    required this.totalAmount,
    required this.deposit,
    required this.status,
    required this.bookingCode,
    required this.remark,
    this.createdAt,
    required this.nickName,
    required this.phone,
    this.memberNo,
    this.gearRental,
    this.gearFee = '0',
    this.gearFeePaid = false,
  });

  /// 客户登记的渔具租赁需求（无则 null）
  GearDemand? get gear => GearDemand.parse(gearRental);

  factory Order.fromJson(Map<String, dynamic> j) => Order(
        id: (j['id'] as num?)?.toInt() ?? 0,
        orderNo: j['order_no']?.toString() ?? '',
        userId: (j['user_id'] as num?)?.toInt() ?? 0,
        date: j['date']?.toString() ?? '',
        timeSlot: j['time_slot']?.toString() ?? '',
        peopleCount: (j['people_count'] as num?)?.toInt() ?? 0,
        unitPrice: j['unit_price']?.toString() ?? '0',
        totalAmount: j['total_amount']?.toString() ?? '0',
        deposit: j['deposit']?.toString() ?? '0',
        status: j['status']?.toString() ?? '',
        bookingCode: j['booking_code']?.toString() ?? '',
        remark: j['remark']?.toString() ?? '',
        createdAt: j['created_at']?.toString(),
        nickName: j['nick_name']?.toString() ?? '',
        phone: j['phone']?.toString() ?? '',
        memberNo: j['member_no']?.toString(),
        gearRental: j['gear_rental']?.toString(),
        gearFee: j['gear_fee']?.toString() ?? '0',
        gearFeePaid: j['gear_fee_paid'] == 1 || j['gear_fee_paid'] == true,
      );
}

/// 渔具租赁需求（orders.gear_rental JSON：{need,rods,bait,items[],note}）
class GearDemand {
  final bool need;
  final int rods;
  final int bait;
  final List<String> items; // 设备 key
  final String note;

  GearDemand({
    this.need = false,
    this.rods = 0,
    this.bait = 0,
    this.items = const [],
    this.note = '',
  });

  /// 解析：接受 JSON 文本或 Map；need!=true 返回 null
  static GearDemand? parse(dynamic raw) {
    if (raw == null) return null;
    try {
      Map<String, dynamic> m;
      if (raw is String) {
        if (raw.trim().isEmpty) return null;
        m = (jsonDecode(raw) as Map).cast<String, dynamic>();
      } else if (raw is Map) {
        m = raw.cast<String, dynamic>();
      } else {
        return null;
      }
      if (m['need'] != true) return null;
      return GearDemand(
        need: true,
        rods: (m['rods'] as num?)?.toInt() ?? 0,
        bait: (m['bait'] as num?)?.toInt() ?? 0,
        items: ((m['items'] as List?) ?? const []).whereType<String>().toList(),
        note: m['note']?.toString() ?? '',
      );
    } catch (_) {
      return null;
    }
  }

  /// 展示文本
  String get display {
    if (!need) return '不需要';
    final parts = <String>[];
    if (rods > 0) parts.add('鱼竿×$rods根');
    if (bait > 0) parts.add('鱼饵×$bait份');
    for (final k in items) {
      parts.add(kGearItemLabels[k] ?? k);
    }
    if (parts.isEmpty) return '已登记（未选具体项目）';
    final base = parts.join('、');
    return note.isEmpty ? base : '$base（$note）';
  }
}

/// 订单分页结果
class OrderListResult {
  final List<Order> orders;
  final int total;
  final int page;
  final int pageSize;

  OrderListResult({
    required this.orders,
    required this.total,
    required this.page,
    required this.pageSize,
  });

  bool get hasMore => page * pageSize < total;
}

/// 会员列表结果（分页）
class MemberListResult {
  final List<Member> members;
  final int total;
  final int page;
  final int pageSize;

  MemberListResult({
    required this.members,
    required this.total,
    required this.page,
    required this.pageSize,
  });

  bool get hasMore => page * pageSize < total;
}

/// 会员
class Member {
  final int id;
  final int userId;
  final String memberNo;
  final String level;
  final String points;
  final String welfareFishQuota;
  final String nickName;
  final String phone;
  final String inviteCode;
  final String joinDate;
  final int inviteCount;

  Member({
    required this.id,
    required this.userId,
    required this.memberNo,
    required this.level,
    required this.points,
    required this.welfareFishQuota,
    required this.nickName,
    required this.phone,
    required this.inviteCode,
    required this.joinDate,
    required this.inviteCount,
  });

  factory Member.fromJson(Map<String, dynamic> j) => Member(
        id: (j['id'] as num?)?.toInt() ?? 0,
        userId: (j['user_id'] as num?)?.toInt() ?? 0,
        memberNo: j['member_no']?.toString() ?? '',
        level: j['level']?.toString() ?? 'guest',
        points: j['points']?.toString() ?? '0',
        welfareFishQuota: j['welfare_fish_quota']?.toString() ?? '0',
        nickName: j['nick_name']?.toString() ?? '',
        phone: j['phone']?.toString() ?? '',
        inviteCode: j['invite_code']?.toString() ?? '',
        joinDate: j['join_date']?.toString() ?? '',
        inviteCount: (j['invite_count'] as num?)?.toInt() ?? 0,
      );
}

/// 渔获记录
class CatchRecord {
  final int id;
  final int userId;
  final String fishType;
  final String weight;
  final String catchDate;
  final String pointsEarned;
  final String useQuota;
  final String overWeight; // 超出斤数(抵扣后)
  final String extraFee; // 超出费用(元)
  final String remark;
  final String photo;
  final String nickName;
  final String memberNo;
  final bool isRecycle; // 是否回收
  // 关联账单（LEFT JOIN catch_bills，未产生费用时为 null）
  final int? billId;
  final String? billNo;
  final String? billAmount;
  final String? billStatus; // pending / paid / cancelled
  final String? billPayTime;

  CatchRecord({
    required this.id,
    required this.userId,
    required this.fishType,
    required this.weight,
    required this.catchDate,
    required this.pointsEarned,
    required this.useQuota,
    this.overWeight = '0',
    this.extraFee = '0',
    required this.remark,
    required this.photo,
    required this.nickName,
    required this.memberNo,
    this.isRecycle = false,
    this.billId,
    this.billNo,
    this.billAmount,
    this.billStatus,
    this.billPayTime,
  });

  factory CatchRecord.fromJson(Map<String, dynamic> j) => CatchRecord(
        id: (j['id'] as num?)?.toInt() ?? 0,
        userId: (j['user_id'] as num?)?.toInt() ?? 0,
        fishType: j['fish_type']?.toString() ?? '混合鱼种',
        weight: j['weight']?.toString() ?? '0',
        catchDate: j['catch_date']?.toString() ?? '',
        pointsEarned: j['points_earned']?.toString() ?? '0',
        useQuota: j['use_quota']?.toString() ?? '0',
        overWeight: j['over_weight']?.toString() ?? '0',
        extraFee: j['extra_fee']?.toString() ?? '0',
        remark: j['remark']?.toString() ?? '',
        photo: j['photo']?.toString() ?? '',
        nickName: j['nick_name']?.toString() ?? '',
        memberNo: j['member_no']?.toString() ?? '',
        isRecycle: (j['is_recycle'] == 1 || j['is_recycle'] == true ||
            j['is_recycle']?.toString() == '1'),
        billId: (j['bill_id'] as num?)?.toInt(),
        billNo: j['bill_no']?.toString(),
        billAmount: j['bill_amount']?.toString(),
        billStatus: j['bill_status']?.toString(),
        billPayTime: j['bill_pay_time']?.toString(),
      );

  /// 是否有待支付账单（费用>0 且未付），可生成收款码
  bool get hasUnpaidBill =>
      billId != null && (billStatus == 'pending');

  /// 展示用：是否回收徽标、费用
  String get feeLabel =>
      (billAmount != null && billAmount!.isNotEmpty)
          ? billAmount!
          : extraFee;
}

/// 渔获记录分页结果
class CatchRecordListResult {
  final List<CatchRecord> records;
  final int total;
  final int page;
  final int pageSize;

  CatchRecordListResult({
    required this.records,
    required this.total,
    required this.page,
    required this.pageSize,
  });

  /// 是否还有下一页
  bool get hasMore => page * pageSize < total;
}

/// 用户搜索结果（录渔获时选人）
class UserSearchResult {
  final int userId;
  final String nickName;
  final String phone;
  final String memberNo;
  final String level;
  final String welfareFishQuota; // 福利鱼剩余额度(斤)

  UserSearchResult({
    required this.userId,
    required this.nickName,
    required this.phone,
    required this.memberNo,
    required this.level,
    this.welfareFishQuota = '0',
  });

  factory UserSearchResult.fromJson(Map<String, dynamic> j) => UserSearchResult(
        userId: (j['userId'] as num?)?.toInt() ?? 0,
        nickName: j['nickName']?.toString() ?? '',
        phone: j['phone']?.toString() ?? '',
        memberNo: j['memberNo']?.toString() ?? '',
        level: j['level']?.toString() ?? 'guest',
        welfareFishQuota: j['welfareFishQuota']?.toString() ?? '0',
      );
}

/// 录入渔获自动结算结果（POST /admin/catch-records 返回值）
class CatchSettleResult {
  final int catchId;
  final int pointsEarned;
  final String useQuota;
  final String overWeight;
  final String unitPrice;
  final String extraFee;
  final bool isRecycle;
  final String fishType;
  final String weight;
  // 费用>0 时生成的待支付账单
  final int? billId;
  final String? billNo;
  final String? billAmount;

  CatchSettleResult({
    required this.catchId,
    this.pointsEarned = 0,
    this.useQuota = '0',
    this.overWeight = '0',
    this.unitPrice = '0',
    this.extraFee = '0',
    this.isRecycle = false,
    this.fishType = '混合鱼种',
    this.weight = '0',
    this.billId,
    this.billNo,
    this.billAmount,
  });

  bool get hasBill => billId != null && (double.tryParse(extraFee) ?? 0) > 0;

  factory CatchSettleResult.fromJson(Map<String, dynamic> j) {
    final bill = (j['bill'] as Map?)?.cast<String, dynamic>();
    return CatchSettleResult(
      catchId: (j['id'] as num?)?.toInt() ?? 0,
      pointsEarned: (j['pointsEarned'] as num?)?.toInt() ?? 0,
      useQuota: (j['useQuota'] ?? j['use_quota'] ?? '0').toString(),
      overWeight: (j['overWeight'] ?? j['over_weight'] ?? '0').toString(),
      unitPrice: (j['unitPrice'] ?? j['unit_price'] ?? '0').toString(),
      extraFee: (j['extraFee'] ?? j['extra_fee'] ?? '0').toString(),
      isRecycle: (j['isRecycle'] == true || j['is_recycle'] == true ||
          j['isRecycle']?.toString() == '1' ||
          j['is_recycle']?.toString() == '1'),
      fishType: j['fishType']?.toString() ?? '混合鱼种',
      weight: (j['weight'] ?? '0').toString(),
      billId: (bill?['id'] as num?)?.toInt(),
      billNo: bill?['billNo']?.toString(),
      billAmount: bill?['amount']?.toString(),
    );
  }
}

/// 渔获账单收款二维码（POST /admin/catch-bills/:id/pay-qr 返回）
class PayQr {
  final String billNo;
  final String amount;
  final String qrcode; // dataURL PNG（<img> 或 Image.memory 显示）
  final String? outTradeNo;
  final String? codeUrl;
  final bool alreadyPaid;

  PayQr({
    required this.billNo,
    required this.amount,
    this.qrcode = '',
    this.outTradeNo,
    this.codeUrl,
    this.alreadyPaid = false,
  });

  factory PayQr.fromJson(Map<String, dynamic> j) => PayQr(
        // 渔获账单返回 billNo；渔具费用收款返回 orderNo（都用作单号展示）
        billNo: (j['billNo'] ?? j['orderNo'])?.toString() ?? '',
        amount: j['amount']?.toString() ?? '0',
        qrcode: j['qrcode']?.toString() ?? '',
        outTradeNo: j['outTradeNo']?.toString(),
        codeUrl: j['code_url']?.toString(),
        alreadyPaid: j['alreadyPaid'] == true,
      );
}
