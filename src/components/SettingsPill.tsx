import { useTheme } from '../lib/theme'
import { useT } from '../lib/i18n'
import { Sun, Moon } from 'lucide-react'

export function SettingsPill() {
  const { lang, setLang } = useT()
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="fixed left-1/2 top-3 z-40 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border border-neutral-300/60 bg-white/80 p-1 shadow-lg shadow-black/5 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80 dark:shadow-black/40">
        {/* Language segment */}
        <div className="flex items-center rounded-full bg-neutral-100 p-0.5 dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => setLang('pt')}
            aria-pressed={lang === 'pt'}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              lang === 'pt'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100'
            }`}
          >
            PT
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            aria-pressed={lang === 'en'}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              lang === 'en'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100'
            }`}
          >
            EN
          </button>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Switch to light' : 'Switch to dark'}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
        >
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}
