import type { UserInfo } from '../types'

/**
 * Mock 会员数据
 */

export interface AdminMember extends UserInfo {
  status: 'active' | 'disabled'
  lastActive: string
  totalOrders: number
  totalSpent: number
}

export const mockMembers: AdminMember[] = [
  {
    id: 'u_001',
    nickname: '钓友小李',
    avatar: 'https://example.com/avatar1.png',
    phone: '138****8888',
    role: 'user',
    memberLevel: 1,
    memberName: '黄金会员',
    points: 1280,
    inviteCode: 'FY8888',
    inviteCount: 3,
    createdAt: '2026-07-01',
    status: 'active',
    lastActive: '2026-08-12',
    totalOrders: 4,
    totalSpent: 760
  },
  {
    id: 'u_002',
    nickname: '老王',
    avatar: 'https://example.com/avatar2.png',
    phone: '137****6666',
    role: 'user',
    memberLevel: 2,
    memberName: '铂金会员',
    points: 2300,
    inviteCode: 'FY6666',
    inviteCount: 5,
    createdAt: '2026-06-20',
    status: 'active',
    lastActive: '2026-08-13',
    totalOrders: 8,
    totalSpent: 1560
  },
  {
    id: 'u_003',
    nickname: '张师傅',
    avatar: 'https://example.com/avatar3.png',
    phone: '136****3333',
    role: 'user',
    memberLevel: 3,
    memberName: '钻石会员',
    points: 5200,
    inviteCode: 'FY3333',
    inviteCount: 10,
    createdAt: '2026-06-01',
    status: 'active',
    lastActive: '2026-08-14',
    totalOrders: 12,
    totalSpent: 3200
  },
  {
    id: 'u_004',
    nickname: '陈哥',
    avatar: 'https://example.com/avatar4.png',
    phone: '135****2222',
    role: 'user',
    memberLevel: 0,
    memberName: '普通会员',
    points: 300,
    createdAt: '2026-07-15',
    status: 'active',
    lastActive: '2026-08-05',
    totalOrders: 1,
    totalSpent: 100
  },
  {
    id: 'u_005',
    nickname: '赵姐',
    avatar: 'https://example.com/avatar5.png',
    phone: '134****1111',
    role: 'user',
    memberLevel: 1,
    memberName: '黄金会员',
    points: 800,
    inviteCode: 'FY1111',
    inviteCount: 2,
    createdAt: '2026-07-20',
    status: 'disabled',
    lastActive: '2026-07-30',
    totalOrders: 2,
    totalSpent: 250
  }
]
