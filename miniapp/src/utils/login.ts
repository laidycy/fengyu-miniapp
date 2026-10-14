import Taro from '@tarojs/taro'
import { wxLogin, getUserInfo, bindPhone } from './api/auth'
import { setToken, setCachedUserInfo, showToast, isLoggedIn } from './index'
import { openLoginModal, isLoginDismissCooldown } from './loginModal'
import { bindInvite } from './api/members'
import type { UserInfo } from './types'

/**
 * 微信登录流程 —— 遵循微信官方建议（静默登录，不使用已废弃的 getUserProfile）
 *
 * 微信官方规范：
 * 1. wx.login() 获取 code → 后端换 openid/token（全程不弹窗）
 * 2. 头像昵称用「头像昵称填写能力」：button open-type="chooseAvatar" + input type="nickname"
 *    （官方已废弃 wx.getUserProfile 弹窗授权，2022 年起返回默认昵称/头像）
 * 3. 手机号用 button open-type="getPhoneNumber"（用户主动触发授权）
 *
 * @param profile 可选的头像昵称（登录页通过 chooseAvatar/nickname 收集，随登录一并提交给后端更新）
 */
export async function loginWithWechat(profile?: { nickName?: string; avatarUrl?: string; gender?: number }): Promise<boolean> {
  try {
    // 1. 获取微信登录 code（静默，不弹窗）
    const loginRes = await Taro.login()
    if (!loginRes.code) {
      showToast('登录失败', 'none')
      return false
    }

    // 2. 调用后端登录接口（传 code + 可选的头像昵称，让后端创建/更新用户资料）
    const res = await wxLogin({
      code: loginRes.code,
      nickName: profile?.nickName,
      avatarUrl: profile?.avatarUrl,
      gender: profile?.gender
    })

    if (res.token) {
      setToken(res.token)
    }

    // 3. 拉取用户完整信息并缓存
    try {
      const userInfo = await getUserInfo()
      setCachedUserInfo(userInfo)
    } catch {
      // 拉取失败不阻断登录
    }

    return true
  } catch (err: any) {
    console.error('登录失败:', err)
    showToast(err.message || '登录失败', 'none')
    return false
  }
}

/**
 * 绑定手机号（微信 getPhoneNumber 按钮回调的 code）
 * @param code 微信 getPhoneNumber 的 e.detail.code
 */
export async function bindPhoneWithWechat(code: string): Promise<boolean> {
  try {
    const res = await bindPhone(code)
    showToast('手机号绑定成功', 'success')
    // 更新缓存的用户信息
    try {
      const userInfo = await getUserInfo()
      setCachedUserInfo(userInfo)
    } catch {
      // ignore
    }
    return true
  } catch (err: any) {
    console.error('绑定手机号失败:', err)
    if (err.message?.includes('已被')) {
      showToast('该手机号已被其他账号绑定', 'none')
    } else {
      showToast(err.message || '绑定失败', 'none')
    }
    return false
  }
}

/**
 * 自动绑定邀请（点开邀请分享链接后触发）
 *
 * 逻辑：
 * 1. 无 token → 先静默微信登录（不弹窗）
 * 2. 已绑定过邀请（invitedBy 非空）→ 跳过
 * 3. 否则调 invite/bind 绑定邀请人
 * 4. 绑定成功后刷新缓存的用户信息并提示
 *
 * @param inviteCode 邀请码（6位，来自分享链接 query）
 * @param silent 成功时是否弹提示（点开分享自动绑定建议静默或轻提示）
 * @returns true=绑定成功/已绑定；false=无需绑定或失败（非致命）
 */
export async function autoBindInvite(inviteCode?: string, silent = true): Promise<boolean> {
  if (!inviteCode) return false
  const code = String(inviteCode).trim().toUpperCase()
  if (!code) return false

  try {
    // 1. 确保已登录（静默登录，不弹窗）
    if (!isLoggedIn()) {
      const ok = await loginWithWechat()
      if (!ok) return false
    }

    // 2. 检查是否已绑定过邀请
    let userInfo: UserInfo | null = null
    try {
      userInfo = await getUserInfo()
      setCachedUserInfo(userInfo)
    } catch {
      /* ignore */
    }
    if (userInfo?.member?.invitedBy) {
      // 已有邀请人，无需重复绑定
      return true
    }

    // 3. 自动绑定
    const res = await bindInvite(code)
    // 4. 刷新缓存
    try {
      const fresh = await getUserInfo()
      setCachedUserInfo(fresh)
    } catch {
      /* ignore */
    }
    if (!silent) {
      const name = (res as any)?.inviter?.nick_name || '好友'
      showToast(`已绑定「${name}」的邀请`, 'success')
    } else {
      showToast('邀请绑定成功', 'success')
    }
    return true
  } catch (err: any) {
    // 非致命：已绑定 / 邀请码无效 / 未登录等，静默忽略
    console.error('[autoBindInvite]', err?.message || err)
    return false
  }
}

/**
 * 检查登录状态，未登录则弹起"手机号快捷登录"弹窗（不再跳转独立登录页）
 * @param silent true 时不弹窗，返回 false 即可
 * @param onSuccess 登录成功后的回调（可选）
 */
export function requireLogin(silent = false, onSuccess?: () => void): boolean {
  const token = Taro.getStorageSync('token')
  if (!token) {
    // 用户刚手动关闭过登录弹窗（冷却期）时，不再自动重复弹出，避免反复打扰
    if (!silent && !isLoginDismissCooldown()) {
      openLoginModal(onSuccess)
    }
    return false
  }
  return true
}

/**
 * 获取当前登录用户信息（含缓存）
 */
export async function getCurrentUser(): Promise<UserInfo | null> {
  const cached = Taro.getStorageSync('userInfo')
  if (cached) return cached
  try {
    const info = await getUserInfo()
    setCachedUserInfo(info)
    return info
  } catch {
    return null
  }
}
