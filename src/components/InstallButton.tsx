import { useState, useEffect } from 'react'
import { Download, Check, Apple } from 'lucide-react'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { useT } from '../lib/i18n'

export function InstallButton() {
  const { t } = useT()
  const { canInstall, isInstalled, promptInstall } = usePwaInstall()
  const [isIOS, setIsIOS] = useState(false)
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
    setIsIOS(/iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream)
  }, [])

  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        <Check className="h-3 w-3" /> {t('installed')}
      </span>
    )
  }

  // Native browser install prompt is available
  if (canInstall) {
    return (
      <button
        onClick={() => { promptInstall() }}
        className="inline-flex w-fit items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-700 shadow-sm hover:border-zinc-300 hover:text-black dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-300 dark:shadow-none dark:hover:border-neutral-700 dark:hover:text-white"
      >
        <Download className="h-3 w-3" /> {t('install_app')}
      </button>
    )
  }

  // iOS doesn't fire beforeinstallprompt — show hint button
  if (isIOS) {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => setShowIosHint((v) => !v)}
          className="inline-flex w-fit items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-700 shadow-sm hover:border-zinc-300 hover:text-black dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-300 dark:shadow-none dark:hover:border-neutral-700 dark:hover:text-white"
        >
          <Apple className="h-3 w-3" /> {t('install_app')}
        </button>
        {showIosHint && (
          <p className="max-w-xs rounded-md border border-zinc-200 bg-white p-2 text-[10px] leading-relaxed text-zinc-600 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-400">
            {t('install_ios_hint')}
          </p>
        )}
      </div>
    )
  }

  // No install path available
  return null
}
