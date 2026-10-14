// 渔具租赁需求 —— 统一数据模型
// 用途：预约时统计客户对渔具的租赁需求（是否需要、鱼竿数量、鱼饵份数、配套设备）
// 存储：写入订单 remark（管理端订单列表/详情与小程序订单详情均可直接查看，零后端改动）
export const GEAR_PREFIX = '【渔具租赁需求】'

export interface GearItem {
  key: string
  label: string
}

// 配套设备（可多选）
export const GEAR_ITEMS: GearItem[] = [
  { key: 'chaowang', label: '抄网' },
  { key: 'yuhu', label: '鱼护' },
  { key: 'diaoxiang', label: '钓箱/钓椅' },
  { key: 'san', label: '钓伞/遮阳伞' },
  { key: 'ganjia', label: '竿架/炮台' },
  { key: 'fupiao', label: '浮漂线组' },
  { key: 'yedeng', label: '夜钓灯' },
  { key: 'jiuyi', label: '救生衣' },
  { key: 'yutong', label: '鱼桶/鱼篓' },
  { key: 'shishou', label: '失手绳' }
]

export interface GearDemand {
  need: boolean
  rods: number
  bait: number
  items: string[] // GEAR_ITEMS 的 key 列表
  note: string
}

export const EMPTY_GEAR: GearDemand = { need: false, rods: 0, bait: 0, items: [], note: '' }

// 明细片段（带单位），如 ['鱼竿×2根', '鱼饵×1份', '抄网']
export function gearPartsList(d: GearDemand): string[] {
  const parts: string[] = []
  if (d.rods > 0) parts.push(`鱼竿×${d.rods}根`)
  if (d.bait > 0) parts.push(`鱼饵×${d.bait}份`)
  GEAR_ITEMS.forEach(it => {
    if (d.items.indexOf(it.key) >= 0) parts.push(it.label)
  })
  return parts
}

// 完整摘要（写入订单 remark）；need=false 返回 ''
export function buildGearSummary(d: GearDemand): string {
  if (!d.need) return ''
  const parts = gearPartsList(d)
  let s = GEAR_PREFIX + (parts.length ? parts.join('、') : '未选具体项目')
  if (d.note && d.note.trim()) s += `；说明：${d.note.trim()}`
  return s
}

// 展示用短文本（确认页 / 订单详情）
export function gearDisplayText(d: GearDemand): string {
  if (!d.need) return '不需要'
  const parts = gearPartsList(d)
  if (!parts.length) return '已登记（未选具体项目）'
  return parts.join('、') + (d.note && d.note.trim() ? `（${d.note.trim()}）` : '')
}

// 从订单 remark 反解析（非渔具备注返回 null，用于编辑回填）
export function parseGearRemark(remark?: string): GearDemand | null {
  if (!remark || remark.indexOf(GEAR_PREFIX) !== 0) return null
  const body = remark.slice(GEAR_PREFIX.length)
  const rods = Number((body.match(/鱼竿×(\d+)/) || [])[1] || 0)
  const bait = Number((body.match(/鱼饵×(\d+)/) || [])[1] || 0)
  const items = GEAR_ITEMS.filter(it => body.indexOf(it.label) >= 0).map(it => it.key)
  const nm = body.match(/说明：([^；]+)/)
  return { need: true, rods, bait, items, note: nm ? nm[1] : '' }
}

// 订单详情/管理端展示文本：命中渔具备注返回可读文本，否则 null（兼容旧数据）
export function gearTextFromRemark(remark?: string): string | null {
  const g = parseGearRemark(remark)
  return g ? gearDisplayText(g) : null
}

// ============ 新字段 gear_rental（后端 orders.gear_rental，JSON）============

// 预约接口提交载荷（对象；无需租赁返回 null，后端归一化后存 JSON 文本）
export function buildGearPayload(d: GearDemand) {
  if (!d.need) return null
  return { need: true, rods: d.rods, bait: d.bait, items: d.items, note: (d.note || '').trim() }
}

// 解析后端 gear_rental（JSON 文本或对象）
export function parseGearValue(v: any): GearDemand | null {
  if (!v) return null
  try {
    const o = typeof v === 'string' ? JSON.parse(v) : v
    if (!o || typeof o !== 'object' || !o.need) return null
    return {
      need: true,
      rods: Number(o.rods) || 0,
      bait: Number(o.bait) || 0,
      items: Array.isArray(o.items) ? o.items.filter((x: any) => typeof x === 'string') : [],
      note: typeof o.note === 'string' ? o.note : ''
    }
  } catch {
    return null
  }
}

// 从订单取渔具需求：优先新字段 gearRental，兼容旧的 remark 格式
export function gearDemandFromOrder(order: any): GearDemand | null {
  if (!order) return null
  return parseGearValue(order.gearRental) || parseGearRemark(order.remark)
}

// 订单展示文本（无则「不需要」）
export function gearDisplayFromOrder(order: any): string {
  const d = gearDemandFromOrder(order)
  return d ? gearDisplayText(d) : '不需要'
}
