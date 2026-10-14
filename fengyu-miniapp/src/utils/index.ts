import Taro from '@tarojs/taro'
import { notifyAuthChanged } from './loginModal'

/**
 * 通用工具函数
 */

// 格式化金额（分转元）
export function formatMoney(cents: number): string {
  return (cents / 100).toFixed(2)
}

// 格式化日期
export function formatDate(date: string | Date, fmt = 'YYYY-MM-DD'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n))
  return fmt
    .replace('YYYY', String(d.getFullYear()))
    .replace('MM', pad(d.getMonth() + 1))
    .replace('DD', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()))
}

// 显示 Toast
export function showToast(title: string, icon: 'success' | 'error' | 'none' = 'none') {
  Taro.showToast({ title, icon, duration: 2000 })
}

// 显示加载中
export function showLoading(title = '加载中...') {
  Taro.showLoading({ title, mask: true })
}

// 隐藏加载
export function hideLoading() {
  Taro.hideLoading()
}

// 检查是否已登录
export function isLoggedIn(): boolean {
  const token = Taro.getStorageSync('token')
  return !!token
}

// 获取登录 token
export function getToken(): string {
  return Taro.getStorageSync('token') || ''
}

// 设置登录 token（登录成功时调用，广播登录态变化让各页面同步刷新）
export function setToken(token: string) {
  Taro.setStorageSync('token', token)
  // 广播：通知所有已订阅页面刷新登录状态
  notifyAuthChanged()
}

// 清除登录状态（退出登录时调用，广播登录态变化让各页面同步刷新）
export function clearAuth() {
  Taro.removeStorageSync('token')
  Taro.removeStorageSync('userInfo')
  notifyAuthChanged()
}

// 获取用户信息（缓存）
export function getCachedUserInfo(): any {
  try {
    return Taro.getStorageSync('userInfo')
  } catch {
    return null
  }
}

// 设置用户信息（缓存）
export function setCachedUserInfo(userInfo: any) {
  Taro.setStorageSync('userInfo', userInfo)
}
