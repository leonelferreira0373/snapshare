import { useTheme } from '../lib/theme'
import { useT } from '../lib/i18n'
import { Sun, Moon } from 'lucide-react'

export function SettingsPill() {
  const { lang, setLang } = useT()
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 lg:bottom-5">
      <div className="flex items-center gap-1 rounded-full border border-zinc-200/80 bg-white/95 p-1 shadow-xl shadow-zinc-900/10 backdrop-blur dark:border-neutral-700/80 dark:bg-neutral-900/95 dark:shadow-black/40">
        <div className="flex items-center rounded-full bg-zinc-100 p-0.5 dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => setLang('pt')}
            aria-pressed={lang === 'pt'}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              lang === 'pt'
                ? 'bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-neutral-400 dark:hover:text-neutral-100'
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
                ? 'bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-neutral-400 dark:hover:text-neutral-100'
            }`}
          >
            EN
          </button>
        </div>

        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Switch to light' : 'Switch to dark'}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
        >
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}
