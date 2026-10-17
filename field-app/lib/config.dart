/// 丰鱼天下 后台管理 App - 全局配置
library;

/// 后端地址（正式环境）
const String kApiBase = 'https://YOUR-API-DOMAIN/api';

/// 应用版本号（单一来源：与 pubspec.yaml version 保持一致）
const String kAppVersion = 'V0.0.5.5';

/// 应用版本码（与 pubspec.yaml version 的 +N 一致，用于 App 内更新比较）
const int kAppVersionCode = 11;

/// 管理端路径前缀
const String kAdminPrefix = '/admin';

/// token 本地存储 key
const String kTokenKey = 'fytx_admin_token';
const String kAdminUserKey = 'fytx_admin_user';

/// 主色调（对齐丰鱼天下绿，比小程序加深以显醒目）
const int kPrimaryColor = 0xFF0F4A16;
const int kPrimaryLight = 0xFF2E7D32;
const int kBackgroundColor = 0xFFF5F7F4;

/// 深浅等级配色（会员卡等用）
const Map<String, int> kLevelColors = {
  'diamond': 0xFF6A1B9A,
  'gold': 0xFFB8860B,
  'silver': 0xFF546E7A,
  'guest': 0xFF757575,
};

/// 渔获计价（对齐后端 FISH_PRICE，自动结算预览用；最终以后端为准）
const double kMemberPrice = 14.80; // 银/金/钻 会员超额带走价
const double kGuestPrice = 16.00; // 散客/普通
const double kRecyclePrice = 5.00; // 回收价（覆盖带走价）

/// 会员等级中文名
const Map<String, String> kMemberLevelNames = {
  'guest': '散客',
  'silver': '银卡',
  'gold': '金卡',
  'diamond': '钻石',
};

/// 时段中文名
const Map<String, String> kTimeSlotNames = {
  'morning': '早场',
  'afternoon': '午场',
  'evening': '晚场',
  'allday': '全天',
};

/// 渔具租赁·配套设备字典（key 与小程序/后端 gear_rental.items 一致）
const Map<String, String> kGearItemLabels = {
  'chaowang': '抄网',
  'yuhu': '鱼护',
  'diaoxiang': '钓箱/钓椅',
  'san': '钓伞/遮阳伞',
  'ganjia': '竿架/炮台',
  'fupiao': '浮漂线组',
  'yedeng': '夜钓灯',
  'jiuyi': '救生衣',
  'yutong': '鱼桶/鱼篓',
  'shishou': '失手绳',
};

/// 订单状态中文名
const Map<String, String> kOrderStatusNames = {
  'pending': '待确认',
  'confirmed': '已确认',
  'used': '已核销',
  'cancelled': '已取消',
  'refunded': '已退款',
};
