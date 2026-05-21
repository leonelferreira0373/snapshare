import { useEffect, useState, useRef } from 'react'
import { Upload, AlertCircle } from 'lucide-react'
import { useT } from '../lib/i18n'

interface Props {
  hasOpenPeer: boolean
  onFiles: (files: File[]) => void
  pendingFiles: (files: File[]) => void
}

/**
 * Listens to drag events on the whole window and shows a full-page overlay
 * the moment a file is dragged over the page. Drop anywhere → handled.
 * Disabled on touch devices (mobile).
 */
export function GlobalDropOverlay({ hasOpenPeer, onFiles, pendingFiles }: Props) {
  const { t } = useT()
  const [visible, setVisible] = useState(false)
  const counterRef = useRef(0)
  const isTouchRef = useRef(false)

  useEffect(() => {
    isTouchRef.current = window.matchMedia('(pointer: coarse)').matches
  }, [])

  useEffect(() => {
    if (isTouchRef.current) return // skip on phones/tablets

    const hasFiles = (e: DragEvent) => {
      const types = e.dataTransfer?.types
      return !!types && Array.from(types).includes('Files')
    }

    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      counterRef.current += 1
      setVisible(true)
    }
    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = hasOpenPeer ? 'copy' : 'none'
    }
    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      counterRef.current = Math.max(0, counterRef.current - 1)
      if (counterRef.current === 0) setVisible(false)
    }
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      counterRef.current = 0
      setVisible(false)
      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return
      const arr = Array.from(files)
      if (hasOpenPeer) onFiles(arr)
      else pendingFiles(arr)
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [hasOpenPeer, onFiles, pendingFiles])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-8">
      {/* Dim backdrop */}
      <div className={`absolute inset-0 transition-colors ${
        hasOpenPeer
          ? 'bg-emerald-500/10 dark:bg-emerald-500/15'
          : 'bg-red-500/10 dark:bg-red-500/15'
      }`} />

      {/* Dashed full-screen border */}
      <div className={`absolute inset-4 rounded-3xl border-4 border-dashed ${
        hasOpenPeer
          ? 'border-emerald-500 dark:border-emerald-400'
          : 'border-red-400 dark:border-red-500'
      }`} />

      <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white/95 px-8 py-6 shadow-2xl shadow-zinc-900/10 backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/95 dark:shadow-black/40">
        {hasOpenPeer ? (
          <>
            <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/40">
              <Upload className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-base font-semibold text-zinc-900 dark:text-white">
              {t('tap_or_drop')}
            </p>
            <p className="text-xs text-zinc-500 dark:text-neutral-500">{t('drop_hint')}</p>
          </>
        ) : (
          <>
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/40">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-base font-semibold text-zinc-900 dark:text-white">
              {t('pair_to_send')}
            </p>
            <p className="text-xs text-zinc-500 dark:text-neutral-500">{t('connect_first')}</p>
          </>
        )}
      </div>
    </div>
  )
}
