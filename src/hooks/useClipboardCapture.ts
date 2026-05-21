import { useEffect, useRef } from 'react'

const STORAGE_KEY = 'snapshare.clipboard'

export function loadClipboardEnabled(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}

export function saveClipboardEnabled(on: boolean): void {
  try { localStorage.setItem(STORAGE_KEY, on ? '1' : '0') } catch { /* noop */ }
}

/**
 * When enabled, watches the system clipboard whenever this tab regains
 * focus. New text content is wrapped in a .txt File and handed to onCaptured.
 * Requires `clipboard-read` permission (prompted by the browser on first use).
 *
 * Limitation: browsers only allow reading the clipboard while the page is
 * focused, so external copies are only picked up when the user returns to
 * the SnapShare tab. That matches the user's "auto-capture when I come back"
 * mental model.
 */
export function useClipboardCapture(
  enabled: boolean,
  onCaptured: (file: File) => void,
  onPermissionError: (msg: string) => void,
) {
  const lastSeenRef = useRef<string>('')
  const seededRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      seededRef.current = false
      return
    }
    if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
      onPermissionError('Clipboard API unavailable in this browser')
      return
    }

    let cancelled = false

    const checkClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText()
        if (cancelled) return
        // Seed: the first read after toggle ON just records the current value
        if (!seededRef.current) {
          seededRef.current = true
          lastSeenRef.current = text ?? ''
          return
        }
        if (text && text !== lastSeenRef.current) {
          lastSeenRef.current = text
          const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
          const blob = new Blob([text], { type: 'text/plain' })
          const file = new File([blob], `clipboard-${stamp}.txt`, {
            type: 'text/plain',
            lastModified: Date.now(),
          })
          onCaptured(file)
        }
      } catch (err) {
        const msg = (err as Error)?.message || String(err)
        // Don't spam — only report once per enable
        if (seededRef.current) return
        seededRef.current = true
        onPermissionError(msg)
      }
    }

    checkClipboard()

    const onFocus = () => { checkClipboard() }
    const onVisibility = () => { if (document.visibilityState === 'visible') checkClipboard() }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, onCaptured, onPermissionError])
}
