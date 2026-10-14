// 完善资料引导工具
// 规则（用户已确认）：
// - 资料完善 = 已绑定手机号(isPhoneBound) 且 昵称已真实填写(nick_name ≠ 默认'微信用户')
// - 引导提醒：登录后(强) + 已登录用户启动时(温和，约30天一次，不硬拦)
import Taro from '@tarojs/taro'
import { isLoggedIn, getCachedUserInfo } from './index'

export const DEFAULT_NICK = '微信用户'

const GUIDE_KEY = 'profile_guide_last_prompt' // 存储上次提醒时间戳(ms)
const GUIDE_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000 // 30 天

/**
 * 判断当前登录用户资料是否完善
 * @returns true=资料完善(无需引导)；false=需要完善(昵称默认 或 未绑手机)
 */
export function isProfileComplete(userInfo?: any): boolean {
  const u = userInfo || getCachedUserInfo()
  if (!u) return false
  const nickDone = !!u.nickName && String(u.nickName).trim() !== '' && String(u.nickName).trim() !== DEFAULT_NICK
  const phoneDone = !!u.isPhoneBound
  return nickDone && phoneDone
}

/**
 * 判断当前是否需要"温和提醒"（距上次提示超过30天，且资料未完善且已登录）
 */
export function shouldPromptProfileGuide(): boolean {
  if (!isLoggedIn()) return false
  if (isProfileComplete()) return false
  const last = Number(Taro.getStorageSync(GUIDE_KEY) || 0)
  return Date.now() - last >= GUIDE_INTERVAL_MS
}

/** 记录一次提醒时间（调用提醒后调用） */
export function markProfileGuideShown() {
  Taro.setStorageSync(GUIDE_KEY, Date.now())
}

/** 重置节流（例如用户主动进入完善页时不再按月限制——可调用以允许立即再进） */
export function resetProfileGuideCooldown() {
  Taro.setStorageSync(GUIDE_KEY, 0)
}

/** 跳转到完善资料整页（幂等：防止重复跳转 flash） */
export function goCompleteProfile() {
  Taro.navigateTo({ url: '/pages/CompleteProfilePage/index' })
}

// ---------- 扫码兑换场景：登录后先核销码，完善资料延后由兑换页触发 ----------
const DEFER_KEY = '__deferProfileAfterLogin'
/** 打开"延后完善资料"开关（兑换页登录成功需先核销，阻止 PhoneLoginModal 立即跳完善页） */
export function deferProfileAfterLogin(on = true) {
  if (on) Taro.setStorageSync(DEFER_KEY, 1)
  else Taro.removeStorageSync(DEFER_KEY)
}
/** 完成核心动作后，按需跳完善资料页（资料不完善才会跳） */
export function goCompleteIfNeeded() {
  deferProfileAfterLogin(false) // 关闭延后，允许浏览/回跳
  const u = getCachedUserInfo()
  if (u && !isProfileComplete(u)) {
    resetProfileGuideCooldown()
    goCompleteProfile()
  }
}
