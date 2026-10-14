export type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'theme_mode'

export function getTheme(): ThemeMode {
  try {
    return (localStorage.getItem(THEME_KEY) as ThemeMode) || 'light'
  } catch {
    return 'light'
  }
}

export function setTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(THEME_KEY, mode)
  } catch {
    // ignore
  }
}
