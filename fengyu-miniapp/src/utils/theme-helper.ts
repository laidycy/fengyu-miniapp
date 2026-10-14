import { getTheme, setTheme, type ThemeMode } from './theme'

/**
 * 主题辅助（适配小程序）
 */

export function applyTheme(mode: ThemeMode) {
  const theme = mode || getTheme()
  setTheme(theme)
  // 小程序端动态设置导航栏
  if (typeof Taro !== 'undefined') {
    const { Taro } = require('@tarojs/taro')
    Taro.setNavigationBarColor({
      frontColor: theme === 'dark' ? '#ffffff' : '#ffffff',
      backgroundColor: theme === 'dark' ? '#1a1a1a' : '#2E7D32'
    })
  }
}

export function toggleTheme(): ThemeMode {
  const next = getTheme() === 'light' ? 'dark' : 'light'
  applyTheme(next)
  return next
}
