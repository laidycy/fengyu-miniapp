// 管理端 API 封装 —— 对齐线上 V0.0.5 管理端
import Taro from '@tarojs/taro'
import { API_BASE_URL } from '../config'
import type { Announcement, OrderStatus } from '../types'

// 管理端 token 存储 key
export const ADMIN_TOKEN_KEY = 'adminToken'

// ---------- 管理端 token / 登录态 ----------

export function getAdminToken(): string {
  return Taro.getStorageSync(ADMIN_TOKEN_KEY) || ''
}

export function setAdminToken(token: string) {
  Taro.setStorageSync(ADMIN_TOKEN_KEY, token)
}

export function clearAdminToken() {
  Taro.removeStorageSync(ADMIN_TOKEN_KEY)
  Taro.removeStorageSync('adminInfo')
}

export function isAdminLoggedIn(): boolean {
  return !!getAdminToken()
}

export function getAdminInfo(): any {
  return Taro.getStorageSync('adminInfo') || null
}

export function setAdminInfo(info: any) {
  Taro.setStorageSync('adminInfo', info)
}

// 需要登录的页面（未登录时跳转）
export const ADMIN_LOGIN_URL = '/pages/AdminDashPage/index'

/**
 * 管理端请求封装
 * - Authorization: Bearer <adminToken>
 * - 401 时清除 token 并跳转登录（管理后台无独立登录页时回到首页）
 */
interface AdminRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  loading?: boolean
  loadingText?: string
}

interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export async function adminRequest<T = any>(url: string, options: AdminRequestOptions = {}): Promise<T> {
  const { method = 'GET', data, loading = false, loadingText = '加载中...' } = options

  if (loading) {
    Taro.showLoading({ title: loadingText, mask: true })
  }

  const token = getAdminToken()
  const header: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await Taro.request<ApiResponse<T>>({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      header
    })

    if (loading) {
      Taro.hideLoading()
    }

    if (res.statusCode === 401) {
      clearAdminToken()
      Taro.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
      // 回到管理员登录入口
      Taro.reLaunch({ url: ADMIN_LOGIN_URL })
      throw new Error('管理员登录已过期')
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      const body = res.data
      if (body.code === 0 || body.code === 200) {
        return body.data as T
      }
      throw new Error(body.message || '请求失败')
    }

    throw new Error(`请求失败 (${res.statusCode})`)
  } catch (err: any) {
    if (loading) {
      Taro.hideLoading()
    }
    if (err.message && !err.message.includes('登录')) {
      Taro.showToast({ title: err.message || '网络错误', icon: 'none' })
    }
    throw err
  }
}

// ---------- 类型（管理端专用，后端 snake_case）----------

export interface AdminLoginResult {
  token: string
  admin: {
    id: number
    username: string
    nickName: string
    nick_name?: string
    role: string
  }
}

// GET /api/admin/stats/overview
export interface AdminStatsOverview {
  todayOrders?: number
  today_revenue?: number
  todayRevenue?: number
  totalMembers?: number
  total_members?: number
  totalOrders?: number
  total_orders?: number
  totalRevenue?: number
  total_revenue?: number
  pendingOrders?: number
  pending_orders?: number
  usedToday?: number
  used_today?: number
  newMembersToday?: number
  new_members_today?: number
  weekRevenue?: number[]
  week_revenue?: number[]
  weekOrders?: number[]
  week_orders?: number[]
  [key: string]: any
}

// 管理端订单行（snake_case）
export interface AdminOrder {
  id: number
  order_no: string
  booking_code?: string
  user_id?: string
  user_name?: string
  nick_name?: string
  member_no?: string
  date: string
  time_slot: string
  people_count: number
  unit_price: number
  total_amount: number
  deposit: number
  status: string
  created_at?: string
}

// 管理端会员行（snake_case）
export interface AdminMember {
  id: string
  member_no: string
  nick_name?: string
  user_name?: string
  name?: string
  phone?: string
  level: string
  points?: number
  total_points?: number
  total_catch_weight?: string | number
  join_date?: string
  is_phone_bound?: number | boolean
}

// 管理端渔获行
export interface AdminCatchRecord {
  id: string | number
  user_id?: string
  member_no?: string
  user_name?: string
  nick_name?: string
  fish_type: string
  weight: number
  catch_date?: string
  use_quota?: boolean | number
  points_earned?: number
  remark?: string
  created_at?: string
}

// 管理端公告行（可在客户端类型基础上扩展，后端 snake_case 的 sort_order/publish_time）
export interface AdminAnnouncement {
  id: number
  title: string
  subtitle?: string
  color?: string
  tags: string[] | string
  detail: any
  content?: string
  status: 'published' | 'draft'
  sort_order?: number
  publish_time?: string
  created_at?: string
}

// ---------- 接口清单（全部 /api/admin）----------

// POST /api/admin/login
export function adminLogin(username: string, password: string): Promise<AdminLoginResult> {
  return adminRequest('/api/admin/login', {
    method: 'POST',
    data: { username, password },
    loading: true,
    loadingText: '登录中...'
  })
}

// GET /api/admin/me
export function getAdminMe(): Promise<any> {
  return adminRequest('/api/admin/me')
}

// GET /api/admin/stats/overview
export function getAdminStats(): Promise<AdminStatsOverview> {
  return adminRequest('/api/admin/stats/overview', { loading: true, loadingText: '加载中...' })
}

// GET /api/admin/daily-bookings
export function getDailyBookings(): Promise<any[]> {
  return adminRequest('/api/admin/daily-bookings')
}

// GET /api/admin/orders?status&date
export function getAdminOrders(params: { status?: string; date?: string } = {}): Promise<AdminOrder[]> {
  const query: string[] = []
  if (params.status) query.push(`status=${encodeURIComponent(params.status)}`)
  if (params.date) query.push(`date=${encodeURIComponent(params.date)}`)
  const qs = query.length ? `?${query.join('&')}` : ''
  return adminRequest(`/api/admin/orders${qs}`, { loading: true, loadingText: '加载中...' })
}

// PUT /api/admin/orders/:id/status
export function updateAdminOrderStatus(id: number | string, status: OrderStatus): Promise<any> {
  return adminRequest(`/api/admin/orders/${id}/status`, {
    method: 'PUT',
    data: { status },
    loading: true,
    loadingText: '处理中...'
  })
}

// GET /api/admin/members?keyword&level&phoneBound&dateFrom&dateTo
export function getAdminMembers(params: {
  keyword?: string
  level?: string
  phoneBound?: string
  dateFrom?: string
  dateTo?: string
} = {}): Promise<AdminMember[]> {
  const query: string[] = []
  if (params.keyword) query.push(`keyword=${encodeURIComponent(params.keyword)}`)
  if (params.level) query.push(`level=${encodeURIComponent(params.level)}`)
  if (params.phoneBound) query.push(`phoneBound=${encodeURIComponent(params.phoneBound)}`)
  if (params.dateFrom) query.push(`dateFrom=${encodeURIComponent(params.dateFrom)}`)
  if (params.dateTo) query.push(`dateTo=${encodeURIComponent(params.dateTo)}`)
  const qs = query.length ? `?${query.join('&')}` : ''
  return adminRequest(`/api/admin/members${qs}`, { loading: true, loadingText: '加载中...' })
}

// GET /api/admin/users/search?kw
export function searchAdminUsers(kw: string): Promise<any[]> {
  return adminRequest(`/api/admin/users/search?kw=${encodeURIComponent(kw)}`)
}

// POST /api/admin/members/renumber
export function renumberAdminMembers(): Promise<any> {
  return adminRequest('/api/admin/members/renumber', { method: 'POST', loading: true, loadingText: '排队中...' })
}

// GET /api/admin/invites?keyword
export function getAdminInvites(keyword?: string): Promise<any[]> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  return adminRequest(`/api/admin/invites${qs}`)
}

// PUT /api/admin/members/:id/level
export function updateAdminMemberLevel(id: string | number, level: string): Promise<any> {
  return adminRequest(`/api/admin/members/${id}/level`, {
    method: 'PUT',
    data: { level },
    loading: true,
    loadingText: '处理中...'
  })
}

// GET /api/admin/catch-records?date&fishType
export function getAdminCatchRecords(params: { date?: string; fishType?: string } = {}): Promise<AdminCatchRecord[]> {
  const query: string[] = []
  if (params.date) query.push(`date=${encodeURIComponent(params.date)}`)
  if (params.fishType) query.push(`fishType=${encodeURIComponent(params.fishType)}`)
  const qs = query.length ? `?${query.join('&')}` : ''
  return adminRequest(`/api/admin/catch-records${qs}`, { loading: true, loadingText: '加载中...' })
}

// POST /api/admin/catch-records
export function createAdminCatchRecord(data: {
  user_id?: string
  member_no?: string
  fish_type: string
  weight: number
  catch_date?: string
  use_quota?: boolean
  remark?: string
}): Promise<any> {
  return adminRequest('/api/admin/catch-records', {
    method: 'POST',
    data,
    loading: true,
    loadingText: '保存中...'
  })
}

// POST /api/admin/upload {image(base64)}
export function uploadAdminImage(base64: string): Promise<{ url: string }> {
  return adminRequest('/api/admin/upload', {
    method: 'POST',
    data: { image: base64 }
  })
}

// GET /api/admin/announcements
export function getAdminAnnouncements(): Promise<AdminAnnouncement[]> {
  return adminRequest('/api/admin/announcements', { loading: true, loadingText: '加载中...' })
}

// GET /api/admin/announcements/:id
export function getAdminAnnouncementDetail(id: string | number): Promise<AdminAnnouncement> {
  return adminRequest(`/api/admin/announcements/${id}`)
}

// POST /api/admin/announcements
export function createAdminAnnouncement(data: Partial<AdminAnnouncement>): Promise<any> {
  return adminRequest('/api/admin/announcements', {
    method: 'POST',
    data,
    loading: true,
    loadingText: '保存中...'
  })
}

// PUT /api/admin/announcements/:id
export function updateAdminAnnouncement(id: string | number, data: Partial<AdminAnnouncement>): Promise<any> {
  return adminRequest(`/api/admin/announcements/${id}`, {
    method: 'PUT',
    data,
    loading: true,
    loadingText: '保存中...'
  })
}

// DELETE /api/admin/announcements/:id
export function deleteAdminAnnouncement(id: string | number): Promise<any> {
  return adminRequest(`/api/admin/announcements/${id}`, {
    method: 'DELETE',
    loading: true,
    loadingText: '删除中...'
  })
}

// GET/PUT /api/admin/revenue
export function getAdminRevenue(): Promise<any> {
  return adminRequest('/api/admin/revenue')
}
export function updateAdminRevenue(data: any): Promise<any> {
  return adminRequest('/api/admin/revenue', { method: 'PUT', data })
}

// GET/PUT /api/admin/pricing
export function getAdminPricing(): Promise<any> {
  return adminRequest('/api/admin/pricing')
}
export function updateAdminPricing(data: any): Promise<any> {
  return adminRequest('/api/admin/pricing', { method: 'PUT', data })
}
