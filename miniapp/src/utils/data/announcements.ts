import type { Announcement } from '../types'

/**
 * Mock 公告数据
 */

export const mockAnnouncements: Announcement[] = [
  {
    id: 'a_001',
    title: '丰鱼天下正式上线！',
    content: '欢迎来到丰鱼天下水库垂钓预约平台！前山水库正式开放预约，欢迎大家前来体验。',
    createdAt: '2026-07-01T10:00:00',
    isTop: true
  },
  {
    id: 'a_002',
    title: '会员权益升级公告',
    content: '即日起，黄金会员及以上等级可享预约折扣、专属客服等权益，详情请查看会员页面。',
    createdAt: '2026-07-10T09:30:00'
  },
  {
    id: 'a_003',
    title: '水库水质检测报告',
    content: '前山水库水质达到Ⅰ类标准，天然森林氧吧环境，鱼种丰富，欢迎垂钓。',
    createdAt: '2026-07-15T14:00:00'
  },
  {
    id: 'a_004',
    title: '邀请好友得积分活动',
    content: '邀请好友注册并绑定邀请码，双方均可获得积分奖励！详情见会员页面。',
    createdAt: '2026-08-14T10:00:00',
    isTop: true
  }
]
