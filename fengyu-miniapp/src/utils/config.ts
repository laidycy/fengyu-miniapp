// 全局配置 —— 对齐正式版后端
// 后端地址: https://YOUR-API-DOMAIN  (统一前缀 /api)

// 注意：README 权威结论第1条 —— 请求路径全部带 /api 前缀
// 因此 API_BASE_URL 不带 /api，各 api 模块路径写 /api/xxx
export const API_BASE_URL = 'https://YOUR-API-DOMAIN'

// 微信小程序 AppID（正式版）
export const WX_APPID = 'wx0000000000000000'

// 地图/导航坐标（前山水库，来自线上 wxapkg 真实数据）
export const RESERVOIR_LOCATION = {
  latitude: 27.93859958043191,
  longitude: 115.91386090533561,
  name: '前山水库',
  address: '江西省丰城市秀市镇前山村'
}

// 水库简介（来自线上 wxapkg 真实文案）
export const RESERVOIR_INTRO =
  '前山水库位于丰城市秀市镇前山村，全流域内均为无人区，人迹罕至，大部分是生态保护区，' +
  '主要植被是以竹林为主的天然林，天然森林氧吧，Ⅰ类水质。'

// 导航步骤（来自线上 wxapkg）
export const NAVIGATION_STEPS = [
  { step: 1, text: '从丰城市区出发，沿 X725 乡道往秀市镇方向行驶', distance: '约10km' },
  { step: 2, text: '到达秀市镇后继续沿 X725 往前山村方向', distance: '约8km' },
  { step: 3, text: '途经前山村，沿水库指示牌转入小路', distance: '约1km' },
  { step: 4, text: '到达目的地：前山水库垂钓基地', distance: '' }
]

// 默认价格兜底（真实数据以 /api/config/pricing 为准）
export const DEFAULT_PRICING = {
  timeSlots: [
    { key: 'morning', name: '早场', timeRange: '06:00-12:00', price: 0, enabled: true },
    { key: 'afternoon', name: '午场', timeRange: '12:00-18:00', price: 0, enabled: true },
    { key: 'evening', name: '晚场', timeRange: '18:00-22:00', price: 0, enabled: true },
    { key: 'allday', name: '全天', timeRange: '06:00-22:00', price: 0, enabled: true }
  ],
  depositRate: 0.3,
  bookingOpenDays: 7,
  memberLevels: [
    { level: 'guest', name: '普通会员', price: 0, pointsBonus: 0, discount: 1, benefits: ['基础预约'] },
    { level: 'silver', name: '银卡会员', price: 888, pointsBonus: 68, discount: 0.95, benefits: ['预约95折', '开通赠68积分'] },
    { level: 'gold', name: '金卡会员', price: 4888, pointsBonus: 380, discount: 0.9, benefits: ['预约9折', '开通赠380积分', '优先预约'] },
    { level: 'diamond', name: '钻石会员', price: 8888, pointsBonus: 680, discount: 0.8, benefits: ['预约8折', '开通赠680积分', '优先预约', 'VIP钓位'] }
  ]
}

export const MEMBER_LEVEL_NAMES: Record<string, string> = {
  guest: '普通会员',
  silver: '银卡会员',
  gold: '金卡会员',
  diamond: '钻石会员'
}

// 会员等级"卡名"简称（登录欢迎弹窗用，如"尊敬的xx（银卡）会员"）
export const MEMBER_LEVEL_SHORT: Record<string, string> = {
  guest: '普通',
  silver: '银卡',
  gold: '金卡',
  diamond: '钻石卡'
}

// 会员等级列表（对齐线上，供会员页/选择用）
export const MEMBER_LEVELS = [
  { level: 'silver', name: '银卡会员', price: 888, pointsBonus: 68, discount: 0.95, benefits: ['预约95折', '开通赠68积分'] },
  { level: 'gold', name: '金卡会员', price: 4888, pointsBonus: 380, discount: 0.9, benefits: ['预约9折', '开通赠380积分', '优先预约'] },
  { level: 'diamond', name: '钻石会员', price: 8888, pointsBonus: 680, discount: 0.8, benefits: ['预约8折', '开通赠680积分', '优先预约', 'VIP钓位'] }
]

export const TIME_SLOT_NAMES: Record<string, string> = {
  morning: '早场',
  afternoon: '午场',
  evening: '晚场',
  allday: '全天'
}

// 时段对应的时间范围（用于预约/订单展示，如"全天 06:00-22:00"）
export const TIME_SLOT_RANGES: Record<string, string> = {
  morning: '06:00-12:00',
  afternoon: '12:00-18:00',
  evening: '18:00-22:00',
  allday: '06:00-22:00'
}

export const ORDER_STATUS_NAMES: Record<string, string> = {
  pending: '待支付',
  confirmed: '已确认',
  used: '已核销',
  cancelled: '已取消',
  refunded: '已退款'
}
