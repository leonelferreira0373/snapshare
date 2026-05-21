import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { useT } from '../lib/i18n'

export function BackToTop() {
  const { t } = useT()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={t('back_to_top')}
      className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-lg shadow-black/10 backdrop-blur transition-colors hover:bg-white active:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-200 dark:shadow-black/40 dark:hover:bg-neutral-800 dark:active:bg-neutral-700"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  )
}
