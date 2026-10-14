import type { CatchRecord } from '../types'

/**
 * Mock 渔获记录
 */

export const mockCatchRecords: CatchRecord[] = [
  {
    id: 'c_001',
    userId: 'u_001',
    userName: '钓友小李',
    avatar: 'https://example.com/avatar1.png',
    fishType: '鲤鱼',
    weight: 5.2,
    length: 68,
    date: '2026-07-10',
    pointsEarned: 52
  },
  {
    id: 'c_002',
    userId: 'u_002',
    userName: '老王',
    avatar: 'https://example.com/avatar2.png',
    fishType: '草鱼',
    weight: 8.5,
    length: 82,
    date: '2026-07-12',
    pointsEarned: 85
  },
  {
    id: 'c_003',
    userId: 'u_003',
    userName: '张师傅',
    avatar: 'https://example.com/avatar3.png',
    fishType: '青鱼',
    weight: 12.8,
    length: 95,
    date: '2026-07-15',
    pointsEarned: 128
  },
  {
    id: 'c_004',
    userId: 'u_001',
    userName: '钓友小李',
    avatar: 'https://example.com/avatar1.png',
    fishType: '白鲢',
    weight: 3.5,
    length: 52,
    date: '2026-07-20',
    pointsEarned: 35
  },
  {
    id: 'c_005',
    userId: 'u_004',
    userName: '陈哥',
    avatar: 'https://example.com/avatar4.png',
    fishType: '鲤鱼',
    weight: 6.1,
    length: 72,
    date: '2026-08-01',
    pointsEarned: 61
  }
]
