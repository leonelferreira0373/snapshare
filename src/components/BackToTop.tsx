import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export function BackToTop() {
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
      aria-label="Back to top"
      className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/90 text-neutral-200 shadow-lg shadow-black/40 backdrop-blur transition-colors hover:bg-neutral-800 active:bg-neutral-700"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  )
}
