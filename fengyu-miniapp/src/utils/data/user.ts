import type { UserInfo } from '../types'

/**
 * Mock 用户数据
 */

export const mockUser: UserInfo = {
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
  createdAt: '2026-07-01'
}

export const mockAdmin: UserInfo = {
  id: 'u_admin',
  nickname: '管理员',
  avatar: 'https://example.com/avatar_admin.png',
  phone: '139****0000',
  role: 'admin',
  memberLevel: 3,
  memberName: '钻石会员',
  points: 99999,
  createdAt: '2026-06-01'
}
