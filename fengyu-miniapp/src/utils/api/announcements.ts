import { http } from './request'
import type { Announcement } from '../types'

/**
 * 公告 API —— 对齐正式版后端 /api/announcements
 */

// 获取已发布公告列表（按 sort_order 排序）
// GET /api/announcements
export function getAnnouncements(): Promise<Announcement[]> {
  return http.get<Announcement[]>('/api/announcements')
}

// 获取公告详情
// GET /api/announcements/:id
export function getAnnouncementDetail(id: string): Promise<Announcement> {
  return http.get<Announcement>(`/api/announcements/${id}`)
}

// ========== 首页顶部展示配置（公告栏 / 钓鱼排行榜） ==========

export type HomeTopMode = 'banner' | 'ranking'

export interface AnnounceUi {
  homeTopMode: HomeTopMode
}

// 获取首页顶部展示配置
// GET /api/announcements/ui -> { homeTopMode }
export function getAnnounceUi(): Promise<AnnounceUi> {
  return http.get<AnnounceUi>('/api/announcements/ui', { auth: false })
}
