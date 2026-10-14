import { http } from './request'
import type { Order, OrderStatus, TimeSlot, CreateOrderResult, PageResult } from '../types'

/**
 * 订单相关 API —— 对齐正式版后端 /api/orders
 */

// ---------------------------------------------------------------------------
// 后端列表/详情接口返回 SELECT * 的 snake_case 字段（order_no/time_slot/people_count/total_amount），
// 且 total_amount 等是字符串（"5.00"）。而 OrderListPage/OrderDetailPage 读 camelCase 并调 .toFixed()。
// 这里统一适配成 camelCase + number，避免页面读不到字段 / toFixed 崩溃（与 user-info 适配同理）。
function adaptOrder(raw: any): any {
  return {
    ...raw,
    id: raw.id,
    orderNo: raw.order_no ?? raw.orderNo,
    bookingCode: raw.booking_code ?? raw.bookingCode,
    userId: raw.user_id ?? raw.userId,
    date: raw.date ?? '',
    timeSlot: raw.time_slot ?? raw.timeSlot,
    peopleCount: raw.people_count ?? raw.peopleCount,
    unitPrice: Number(raw.unit_price ?? raw.unitPrice ?? 0),
    totalAmount: Number(raw.total_amount ?? raw.totalAmount ?? 0),
    deposit: Number(raw.deposit ?? 0),
    status: raw.status ?? 'pending',
    remark: raw.remark ?? '',
    gearRental: raw.gear_rental ?? raw.gearRental ?? null,
    payTime: raw.pay_time ?? raw.payTime ?? null,
    checkInTime: raw.check_in_time ?? raw.checkInTime ?? null,
    cancelTime: raw.cancel_time ?? raw.cancelTime ?? null,
    refundAmount: Number(raw.refund_amount ?? raw.refundAmount ?? 0),
    createdAt: raw.created_at ?? raw.createdAt ?? '',
    updatedAt: raw.updated_at ?? raw.updatedAt ?? '',
  } as any
}

// 获取订单列表（后端返回 snake_case，前端统一转 camelCase）
// GET /api/orders?status&page&pageSize → {list,total,page,pageSize}
export async function getOrders(params?: {
  status?: OrderStatus
  page?: number
  pageSize?: number
}): Promise<PageResult<Order>> {
  const res = await http.get<PageResult<Order>>('/api/orders', { data: params })
  return {
    ...res,
    list: (res.list || []).map(adaptOrder)
  }
}

// 获取订单详情（后端返回 snake_case，前端统一转 camelCase）
// GET /api/orders/:id（归属校验）
export async function getOrderDetail(id: string | number): Promise<Order> {
  const res = await http.get<Order>(`/api/orders/${id}`)
  return adaptOrder(res)
}

// 创建订单 —— 金额由服务端算
// POST /api/orders  { date, timeSlot, peopleCount, remark }
// → 返回驼峰字段 CreateOrderResult
export function createOrder(data: {
  date: string
  timeSlot: TimeSlot
  peopleCount: number
  remark?: string
  gearRental?: any
}): Promise<CreateOrderResult> {
  return http.post<CreateOrderResult>('/api/orders', data)
}

// 修改订单（仅 pending 可改，服务端重算金额）→ 返回驼峰字段
// PUT /api/orders/:id  { date, timeSlot, peopleCount, remark }
export function updateOrder(
  id: string | number,
  data: { date?: string; timeSlot?: TimeSlot; peopleCount?: number; remark?: string; gearRental?: any }
): Promise<CreateOrderResult> {
  return http.put<CreateOrderResult>(`/api/orders/${id}`, data)
}

// 取消订单（仅 pending/confirmed 可取消）
// PUT /api/orders/:id/cancel
export function cancelOrder(id: string | number): Promise<Order> {
  return http.put<Order>(`/api/orders/${id}/cancel`)
}
