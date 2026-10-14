// 全局登录状态工具 —— 事件式
// 1) 登录弹窗：任何工具函数/页面可调 openLoginModal() 触发"手机号快捷登录"弹窗，
//    由当前激活页面通过 useLoginModal() Hook 订阅并渲染。
// 2) 登录态同步：登录(setToken)/退出(clearAuth)时广播 AUTH_CHANGED，
//    所有已订阅页面收到后刷新自身登录状态与数据（跨页面同步）。
import Taro from '@tarojs/taro'

export const LOGIN_MODAL_OPEN = '__open_login_modal__'
export const LOGIN_MODAL_CLOSE = '__close_login_modal__'
export const AUTH_CHANGED = '__auth_changed__'

type SuccessCb = () => void

// 登录弹窗"暂不登录"冷却：用户手动关闭登录弹窗后，短时间内（10秒）不再自动重复弹出，
// 避免在同一页面反复被"请先登录"打扰（用户仍可手动点击登录入口主动唤起）。
const DISMISS_COOLDOWN_MS = 10000
let lastDismissAt = 0

/** 弹起全局"手机号快捷登录"弹窗（当前激活页面响应渲染） */
export function openLoginModal(onSuccess?: SuccessCb) {
  Taro.eventCenter.trigger(LOGIN_MODAL_OPEN, onSuccess)
}

/** 关闭全局登录弹窗（用户主动关闭时记录冷却，避免立即重复弹出） */
export function closeLoginModal(byUser = false) {
  if (byUser) lastDismissAt = Date.now()
  Taro.eventCenter.trigger(LOGIN_MODAL_CLOSE)
}

/**
 * 判断当前是否处于"用户刚关闭登录弹窗"的冷却期（返回 true 表示应暂缓自动弹窗）
 */
export function isLoginDismissCooldown(): boolean {
  return Date.now() - lastDismissAt < DISMISS_COOLDOWN_MS
}

/** 登录状态发生变化（登录成功/退出登录/绑定手机号）时广播，通知各页面刷新 */
export function notifyAuthChanged() {
  Taro.eventCenter.trigger(AUTH_CHANGED)
}

/** 需要登录时统一的入口：已登录直接返回 true；未登录触发登录弹窗并返回 false */
export function ensureLogin(onSuccess?: SuccessCb): boolean {
  const token = Taro.getStorageSync('token')
  if (token) return true
  openLoginModal(onSuccess)
  return false
}
