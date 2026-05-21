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
      className="fixed bottom-20 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-lg shadow-zinc-900/10 transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900/95 dark:text-neutral-200 dark:shadow-black/40 dark:hover:bg-neutral-800 dark:active:bg-neutral-700 lg:bottom-5"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  )
}
