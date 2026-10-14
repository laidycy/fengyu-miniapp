import { http } from './request'
import type { UserInfo, MemberInfo, MemberLevel } from '../types'

/**
 * 认证相关 API —— 对齐正式版后端 /api/auth
 */

// 微信登录
// POST /api/auth/wx-login  { code, nickName, avatarUrl, gender }
// → { token, userId, openid, nickName, isPhoneBound, phone, member, sessionKey }
export interface WxLoginResult {
  token: string
  userId: string
  openid: string
  nickName: string
  isPhoneBound: boolean
  phone: string | null
  member: MemberInfo
  sessionKey: string
}

export function wxLogin(data: {
  code: string
  nickName?: string
  avatarUrl?: string
  gender?: number
}): Promise<WxLoginResult> {
  // auth:false -> 登录是公开接口，不自动带 token；401 时直接暴露后端"微信登录失败"信息（而非"登录已过期"）
  return http.post<WxLoginResult>('/api/auth/wx-login', data, { auth: false })
}

// ---------------------------------------------------------------------------
// 后端 /api/auth/user-info 返回的是「snake_case + 扁平」结构（SELECT * 直接返回），
// 而前端 UserInfo/MemberInfo 是「camelCase + 嵌套 member」。
// 坑：wx-login 返回驼峰 isPhoneBound，但 user-info 返回下划线 is_phone_bound 且 member 平铺，
// 直接赋值会导致前端读 isPhoneBound / member.points 全是 undefined → 界面显示不出已绑定/会员信息。
// 这里做一次适配，统一成前端结构。一次修复，所有调用方（Profile/Member/ProfileInfo/login）都正常。
function adaptUserInfo(raw: any): UserInfo {
  return {
    id: raw.id ?? raw.userId ?? '',
    openid: raw.openid ?? '',
    nickName: raw.nick_name ?? raw.nickName ?? '微信用户',
    avatarUrl: raw.avatar_url ?? raw.avatarUrl ?? '',
    gender: raw.gender ?? 0,
    phone: raw.phone || undefined,
    // is_phone_bound 可能是 1/0（数字）或 true/false
    isPhoneBound: !!(raw.is_phone_bound ?? raw.isPhoneBound),
    createdAt: raw.created_at ?? raw.createdAt ?? '',
    member: {
      id: raw.member_id ?? '',
      memberNo: raw.member_no ?? raw.memberNo ?? '',
      level: (raw.level ?? raw.member?.level ?? 'guest') as MemberLevel,
      points: raw.points ?? raw.member?.points ?? 0,
      lockedPoints: raw.locked_points ?? raw.member?.lockedPoints ?? 0,
      totalPoints: raw.total_points ?? raw.member?.totalPoints ?? 0,
      welfareFishQuota: raw.welfare_fish_quota ?? raw.member?.welfareFishQuota ?? 0,
      totalCatchWeight: raw.total_catch_weight ?? raw.member?.totalCatchWeight ?? 0,
      joinDate: raw.join_date ?? raw.member?.joinDate ?? '',
      expireDate: raw.expire_date ?? raw.member?.expireDate ?? null,
      totalVisits: raw.total_visits ?? raw.member?.totalVisits ?? 0,
      totalSpent: raw.total_spent ?? raw.member?.totalSpent ?? 0,
      canSwim: !!(raw.can_swim ?? raw.member?.canSwim ?? 0),
      company: raw.company ?? raw.member?.company ?? '',
      introducer: raw.introducer ?? raw.member?.introducer ?? '',
      inviteCode: raw.invite_code ?? raw.member?.inviteCode ?? '',
      invitedBy: raw.invited_by ?? raw.member?.invitedBy ?? null,
      inviteCount: raw.invite_count ?? raw.member?.inviteCount,
    } as MemberInfo,
  } as UserInfo
}

// 获取用户+会员完整信息
// GET /api/auth/user-info （返回 snake_case 扁平结构，前端统一适配成 camelCase + 嵌套 member）
export async function getUserInfo(): Promise<UserInfo> {
  const res = await http.get<any>('/api/auth/user-info')
  return adaptUserInfo(res)
}

// 绑定手机号（微信 getPhoneNumber 的 code，非短信验证码！）
// POST /api/auth/bind-phone  { code }  —— 需登录（requireAuth），必须带 token
export function bindPhone(code: string): Promise<{ phone: string }> {
  return http.post<{ phone: string }>('/api/auth/bind-phone', { code })
}

// 解绑手机号（用户自助）
// POST /api/auth/unbind-phone  —— 需登录
export function unbindPhone(): Promise<{ phone: string }> {
  return http.post<{ phone: string }>('/api/auth/unbind-phone', {})
}

// ---------------------------------------------------------------------------
// 更新资料（昵称/头像）
// PUT /api/auth/profile  { nickName, avatarUrl }  —— 需登录
// 返回 { nickName, avatarUrl, memberNoChanged, memberNo }
// 昵称从默认'微信用户'首次改为真实昵称时，后端会把会员号首字母同步为新昵称首字拼音。
export interface UpdateProfileResult {
  nickName: string
  avatarUrl: string
  memberNoChanged: boolean
  memberNo: string
}
export function updateProfile(data: {
  nickName: string
  avatarUrl?: string
}): Promise<UpdateProfileResult> {
  return http.put<UpdateProfileResult>('/api/auth/profile', data)
}

// 上传头像（base64 data URL → { url }）
// POST /api/auth/upload-avatar  { image: "data:image/jpeg;base64,..." }  —— 需登录
export function uploadAvatar(dataUrl: string): Promise<{ url: string }> {
  return http.post<{ url: string }>('/api/auth/upload-avatar', { image: dataUrl })
}

