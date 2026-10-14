import type { Order } from '../types'

/**
 * Mock 订单数据
 */

export const mockOrders: Order[] = [
  {
    id: 'o_001',
    orderNo: 'FY20260701001',
    userId: 'u_001',
    userName: '钓友小李',
    date: '2026-07-10',
    timeSlot: '08:00-12:00',
    fishType: '鲤鱼',
    quantity: 2,
    totalPrice: 200,
    status: 'used',
    createdAt: '2026-07-05T10:00:00'
  },
  {
    id: 'o_002',
    orderNo: 'FY20260715002',
    userId: 'u_001',
    userName: '钓友小李',
    date: '2026-07-20',
    timeSlot: '12:00-16:00',
    fishType: '草鱼',
    quantity: 1,
    totalPrice: 120,
    status: 'paid',
    createdAt: '2026-07-12T09:30:00'
  },
  {
    id: 'o_003',
    orderNo: 'FY20260718003',
    userId: 'u_001',
    userName: '钓友小李',
    date: '2026-07-25',
    timeSlot: '16:00-20:00',
    fishType: '白鲢',
    quantity: 3,
    totalPrice: 240,
    status: 'pending',
    createdAt: '2026-07-15T14:00:00'
  },
  {
    id: 'o_004',
    orderNo: 'FY20260801004',
    userId: 'u_001',
    userName: '钓友小李',
    date: '2026-08-10',
    timeSlot: '08:00-12:00',
    fishType: '鲤鱼',
    quantity: 2,
    totalPrice: 200,
    status: 'cancelled',
    createdAt: '2026-08-01T10:00:00'
  }
]
