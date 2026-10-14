/**
 * Mock 管理端统计数据
 */

export interface AdminStats {
  todayOrders: number
  todayRevenue: number
  totalMembers: number
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
  usedToday: number
  newMembersToday: number
  weekRevenue: number[]
  weekOrders: number[]
}

export const mockAdminStats: AdminStats = {
  todayOrders: 8,
  todayRevenue: 960,
  totalMembers: 128,
  totalOrders: 356,
  totalRevenue: 42800,
  pendingOrders: 3,
  usedToday: 5,
  newMembersToday: 6,
  weekRevenue: [560, 720, 890, 650, 980, 760, 960],
  weekOrders: [4, 6, 7, 5, 9, 7, 8]
}
