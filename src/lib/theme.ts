import { createContext, useContext } from 'react'

export type Theme = 'dark' | 'light'
export const THEME_STORAGE_KEY = 'snapshare.theme'

export interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => { /* default no-op */ },
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch { /* noop */ }
  return 'dark'
}

export function saveTheme(theme: Theme): void {
  try { localStorage.setItem(THEME_STORAGE_KEY, theme) } catch { /* noop */ }
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  root.style.colorScheme = theme
  // Update mobile browser chrome to match the chosen mode (not OS pref)
  const metas = document.querySelectorAll('meta[name="theme-color"]')
  metas.forEach((m) => m.parentNode?.removeChild(m))
  const meta = document.createElement('meta')
  meta.name = 'theme-color'
  meta.content = theme === 'dark' ? '#0a0a0a' : '#f3f1ec'
  document.head.appendChild(meta)
}
