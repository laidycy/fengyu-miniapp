import { http } from './request'
import type { MemberInfo, MemberLevel, PointsLog, RankingItem, PageResult } from '../types'

/**
 * 会员相关 API —— 对齐正式版后端 /api/members
 */

// 后端 GET /api/members/info 直接返回 members 表的 snake_case 原始行；
// 前端 MemberInfo 是 camelCase。这里做一次适配，避免页面读到 undefined（福利鱼/总渔获/会员号显示错误）。
function adaptMemberInfo(raw: any): MemberInfo {
  if (!raw || typeof raw !== 'object') return raw as MemberInfo
  return {
    id: String(raw.id ?? raw.member_id ?? ''),
    memberNo: raw.member_no ?? raw.memberNo ?? '',
    level: (raw.level ?? raw.member?.level ?? 'guest') as MemberLevel,
    levelName: raw.level_name ?? raw.levelName,
    points: Number(raw.points ?? 0),
    lockedPoints: Number(raw.locked_points ?? raw.lockedPoints ?? 0),
    totalPoints: Number(raw.total_points ?? raw.totalPoints ?? 0),
    welfareFishQuota: Number(raw.welfare_fish_quota ?? raw.welfareFishQuota ?? 0),
    totalCatchWeight: Number(raw.total_catch_weight ?? raw.totalCatchWeight ?? 0),
    joinDate: raw.join_date ?? raw.joinDate ?? '',
    expireDate: raw.expire_date ?? raw.expireDate ?? null,
    totalVisits: Number(raw.total_visits ?? raw.totalVisits ?? 0),
    totalSpent: Number(raw.total_spent ?? raw.totalSpent ?? 0),
    canSwim: !!(raw.can_swim ?? raw.canSwim),
    company: raw.company ?? '',
    introducer: raw.introducer ?? '',
    inviteCode: raw.invite_code ?? raw.inviteCode ?? '',
    invitedBy: raw.invited_by ?? raw.invitedBy ?? null,
    inviteCount: raw.invite_count ?? raw.inviteCount,
  }
}

// 获取当前用户会员信息
// GET /api/members/info（需 requireAuth）
export async function getMemberInfo(): Promise<MemberInfo> {
  const res = await http.get<any>('/api/members/info')
  return adaptMemberInfo(res)
}

// 积分明细（分页）
// GET /api/members/points-log?page&pageSize → {list,total,...}
export function getPointsLog(params?: {
  page?: number
  pageSize?: number
}): Promise<PageResult<PointsLog>> {
  return http.get<PageResult<PointsLog>>('/api/members/points-log', { data: params })
}

// 排行榜
// GET /api/members/ranking?type=yearly|single
export function getRanking(type: 'yearly' | 'single' = 'yearly'): Promise<RankingItem[]> {
  return http.get<RankingItem[]>('/api/members/ranking', { data: { type } })
}

// 邀请码信息
// GET /api/members/invite → { inviteCode, invitedBy|null, inviteCount, invitees[] }
export interface InviteInfo {
  inviteCode: string
  invitedBy: string | null
  inviteCount: number
  invitees: Array<{ user_id: string; nick_name: string; join_date: string }>
}

export function getMyInvite(): Promise<InviteInfo> {
  return http.get<InviteInfo>('/api/members/invite')
}

// 绑定邀请码（只能绑一次、不能绑自己、邀请码须存在）
// POST /api/members/invite/bind  { inviteCode }（大写trim）
export function bindInvite(inviteCode: string): Promise<{
  inviter: { user_id: string; nick_name: string }
}> {
  return http.post('/api/members/invite/bind', { inviteCode })
}

// 兑换码兑换（需登录）
// POST /api/redeem  { code } → { benefits, levelUpgraded, member }
export function redeemCode(code: string): Promise<{
  benefits: { level?: string | null; points?: number; fish_quota?: number }
  levelUpgraded: boolean
  member: MemberInfo
}> {
  return http.post('/api/redeem', { code: String(code || '').trim().toUpperCase() })
}

// 查询兑换码信息（公开，无登录可查权益，供扫码兑换页预览）
// GET /api/redeem/info/:code → { code, valid, reason, benefits }
export interface RedeemInfo {
  code: string
  valid: boolean
  reason?: string
  benefits: { level?: string | null; points?: number; fish_quota?: number }
}
export function getRedeemInfo(code: string): Promise<RedeemInfo> {
  return http.get<RedeemInfo>(`/api/redeem/info/${encodeURIComponent(String(code || '').trim())}`)
}


