import { http } from './request'

/**
 * 支付 API —— 对齐正式版后端 /api/pay
 */

// 查询支付状态
// GET /api/pay/status → { ready, mock, message }
export function getPayStatus(): Promise<{ ready: boolean; mock: boolean; message?: string }> {
  return http.get('/api/pay/status')
}

// 统一下单（微信支付 or mock）
// POST /api/pay/unified-order  { orderType:'order'|'member'|'catch', orderId?, level?, billId? }
// → mock: 直接落库；真实: { payment:{timeStamp,nonceStr,package,signType,paySign} }
export type OrderType = 'order' | 'member' | 'catch'

export function createUnifiedOrder(data: {
  orderType: OrderType
  orderId?: string
  level?: 'silver' | 'gold' | 'diamond'
  billId?: number
}): Promise<{
  payment?: {
    timeStamp: string
    nonceStr: string
    package: string
    signType: string
    paySign: string
  }
  alreadyPaid?: boolean
  mock?: boolean
  message?: string
}> {
  return http.post('/api/pay/unified-order', data)
}

// 退款（管理员用，用户端一般用不到）
// POST /api/pay/:orderId/refund
export function refundOrder(orderId: string): Promise<unknown> {
  return http.post(`/api/pay/${orderId}/refund`)
}
