// 全局类型定义 —— 对齐正式版后端数据模型（README_正式版API参照.md）
// 来源: 服务器 /var/www/fengyu-api/src/ 完整 TS 源码

// ========== 用户与会员 ==========

// 用户表 users
export interface UserInfo {
  id: string          // users.id
  openid: string
  nickName: string    // nick_name
  avatarUrl: string   // avatar_url
  gender: number      // 0未知 1男 2女
  phone?: string
  isPhoneBound: boolean
  createdAt: string
  // 会员信息（JOIN members）
  member: MemberInfo
}

// 会员表 members
export interface MemberInfo {
  id: string
  memberNo: string        // 会员号 拼音首字母+5位user_id+手机尾4位
  level: MemberLevel      // guest/silver/gold/diamond
  levelName?: string      // 普通/银卡/金卡/钻石
  points: number          // 当前可用积分
  lockedPoints?: number   // 锁定积分（未生效，1年后可转可用）
  totalPoints: number     // 累计积分
  welfareFishQuota: number // 福利鱼额度(斤)
  totalCatchWeight: number // 累计渔获(斤)
  joinDate: string
  expireDate: string | null
  totalVisits: number
  totalSpent: number
  canSwim: boolean
  company?: string
  introducer?: string
  inviteCode: string      // 6位邀请码(自动生成)
  invitedBy: string | null
  inviteCount?: number    // 已邀请人数（来自 /members/invite）
}

// 会员等级
export type MemberLevel = 'guest' | 'silver' | 'gold' | 'diamond'

// 会员等级配置（/api/config/pricing 里的 memberLevels）
export interface MemberLevelConfig {
  level: MemberLevel
  name: string        // 普通会员/银卡会员/金卡会员/钻石会员
  price: number       // 元（当前测试价 0.01/0.02/0.03）
  pointsBonus: number // 开通赠积分 68/380/680
  discount: number    // 1 / 0.95 / 0.9 / 0.8
  benefits: string[]
}

// ========== 订单 ==========

export type OrderStatus = 'pending' | 'confirmed' | 'used' | 'cancelled' | 'refunded'

export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'allday'

// 订单 —— snake_case 匹配后端 SELECT * 返回
// 注意: 订单列表/详情接口后端返回 snake_case，前端 getOrders/getOrderDetail 已统一适配成 camelCase（见 utils/api/orders.ts adaptOrder）。
// 因此这里 Order 用 camelCase，与页面渲染（OrderListPage/OrderDetailPage/HomePage）一致。
export interface Order {
  id: number
  orderNo: string
  bookingCode: string       // 核销码
  userId: string
  date: string              // YYYY-MM-DD
  timeSlot: TimeSlot
  peopleCount: number       // 人数（元/人）
  unitPrice: number         // 元/人
  totalAmount: number       // 总价
  deposit: number           // 定金 = total × depositRate
  status: OrderStatus
  remark?: string
  gearRental?: string | null   // 渔具租赁登记(JSON)：{need,rods,bait,items[],note}
  payTime?: string | null
  checkInTime?: string | null
  cancelTime?: string | null
  refundAmount?: number
  createdAt: string
  updatedAt?: string
}

// 创建/更新订单的返回（后端返回驼峰）
export interface CreateOrderResult {
  id: string
  orderNo: string
  bookingCode: string
  unitPrice: number
  totalAmount: number
  deposit: number
  status: OrderStatus
  /** 免付款预约：全天价格为 0 时后端返回 true，前端无需拉起支付 */
  freeBooking?: boolean
  /** 是否已完成支付（免付款预约后端直接标记已支付） */
  paid?: boolean
}

// ========== 渔获 ==========

// 渔获账单（超重费用在线支付）
export interface CatchBill {
  id: number            // 账单 id（传 billId 给统一下单）
  billNo: string        // 账单号
  amount: number        // 应付金额（元）
  status: 'pending' | 'paid' | 'cancelled'
  createdAt?: string
  payTime?: string
  weight?: number       // 关联渔获重量
  catchDate?: string    // 关联渔获日期
  fishType?: string
  useQuota?: number     // 已抵扣福利鱼斤数
  overWeight?: number   // 超出斤数
}

export interface CatchRecord {
  id: string
  userId: string
  userName?: string
  avatarUrl?: string
  fishType: string
  weight: number          // 斤
  catchDate: string
  pointsEarned: number
  useQuota: boolean       // 是否使用福利鱼额度
  extraFee?: number
  operatorId?: string
  remark?: string
  photo?: string
  // ===== 自动结算账单（后端 catch_bills 关联） =====
  overWeight?: number     // 超出福利鱼额度斤数
  isRecycle?: boolean     // 是否回收计价
  // 账单关联信息（渔获列表 JOIN catch_bills 带出）
  billId?: number
  billNo?: string
  billStatus?: 'pending' | 'paid' | 'cancelled'
}

// ========== 积分 ==========

export interface PointsLog {
  id: string
  type: 'earn' | 'consume'
  amount: number
  balanceAfter: number
  source: 'catch' | 'register' | 'redeem' | 'recharge' | 'member' | 'legacy'
  orderId?: string
  remark?: string
  createdAt: string
  // 锁定期：生效日（earn 进锁定池时有值；NULL=即时可用/已生效）
  availableAt?: string | null
}

// ========== 排行榜 ==========

// 真实后端返回（snake_case）: GET /api/members/ranking?type=yearly|single
export interface RankingItem {
  user_id: number
  user_name: string
  avatar: string
  total_weight: string   // 累计渔获(斤) 字符串
  points: string
  catch_count: number
  biggest_fish: string   // 单条最大(斤)
  rank: number
}

// ========== 公告 ==========

// 真实后端返回（snake_case）: GET /api/announcements
// detail 是对象 {intro, highlights[], time, location, contact}
export interface Announcement {
  id: number
  title: string
  subtitle?: string
  color?: string          // 标签颜色
  tags: string[]          // 标签
  detail: AnnouncementDetailObj
  status: 'published' | 'draft'
  sort_order: number
  publish_time: string
}

// 公告详情（对象结构，非数组）
export interface AnnouncementDetailObj {
  intro?: string
  highlights?: string[]
  time?: string
  location?: string
  contact?: string
  image?: string
}

// ========== 价格配置 ==========

// 时段配置 —— 匹配后端 /api/config/pricing 实际返回：label/time（非 name/timeRange）
export interface TimeSlotConfig {
  key: TimeSlot
  label: string       // 早场/午场/晚场/全天
  time: string        // 06:00-12:00 等
  price: number       // 元/人
  enabled?: boolean
}

export interface PricingConfig {
  timeSlots: TimeSlotConfig[]
  depositRate: number         // 0.3
  bookingOpenDays: number     // 7
  memberLevels: MemberLevelConfig[]
  slotEnabled?: Record<string, boolean>   // 时段开关：false 则前端隐藏该时段
  /** 时段选择总开关：false 则预约界面不显示"选择时段"步（按全天计费）；默认开启 */
  slotSelectionEnabled?: boolean
  /** 免付款预约：后台"全天价格"设为 0 时为 true，预约直接生成订单二维码、无需付款 */
  freeBooking?: boolean
  notice?: string
}

// ========== 兑换记录 ==========

export interface RedeemRecord {
  id: string
  itemName: string
  points: number
  date: string
  status: 'pending' | 'completed' | 'cancelled'
}

// ========== API 响应包装 ==========

export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}
