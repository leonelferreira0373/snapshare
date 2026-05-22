import { useEffect, useRef } from 'react'

const STORAGE_KEY = 'snapshare.clipboard'

export function loadClipboardEnabled(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}

export function saveClipboardEnabled(on: boolean): void {
  try { localStorage.setItem(STORAGE_KEY, on ? '1' : '0') } catch { /* noop */ }
}

interface ClipboardItemLike {
  readonly types: readonly string[]
  getType: (type: string) => Promise<Blob>
}
type ClipboardWithRead = Omit<Clipboard, 'read'> & {
  read?: () => Promise<ClipboardItemLike[]>
}

async function fingerprintBlob(blob: Blob): Promise<string> {
  // Hash the first 256 bytes + mime + length — cheap, stable enough to dedupe
  const slice = await blob.slice(0, 256).arrayBuffer()
  const bytes = new Uint8Array(slice)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0')
  return `${blob.type}:${blob.size}:${hex}`
}

function extForMime(mime: string): string {
  if (!mime) return 'bin'
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/svg+xml') return 'svg'
  if (mime === 'text/plain') return 'txt'
  if (mime === 'text/html') return 'html'
  if (mime.startsWith('image/')) return mime.split('/')[1]
  if (mime.startsWith('text/')) return mime.split('/')[1]
  // application/foo+bar → foo
  const m = mime.split('/')[1]
  if (!m) return 'bin'
  return m.split('+')[0]
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

/**
 * Watches the system clipboard when the tab regains focus. Picks up:
 *   - text/plain         → clipboard-<ts>.txt
 *   - image/png|jpeg|...  → clipboard-<ts>.<ext>
 *   - any other rich type that the browser exposes via clipboard.read()
 *
 * First read after toggle ON is a "seed" — it records the fingerprint of
 * whatever is currently in the clipboard without sending, so existing
 * content doesn't accidentally get fired off the moment you enable.
 */
export function useClipboardCapture(
  enabled: boolean,
  onCaptured: (file: File) => void,
  onPermissionError: (msg: string) => void,
) {
  const lastFpRef = useRef<string>('')
  const seededRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      seededRef.current = false
      return
    }
    if (!navigator.clipboard) {
      onPermissionError('Clipboard API unavailable in this browser')
      return
    }

    let cancelled = false
    const clipboard = navigator.clipboard as unknown as ClipboardWithRead

    const handleBlob = (blob: Blob, fp: string, preferredName?: string) => {
      if (cancelled) return
      lastFpRef.current = fp
      const name = preferredName ?? `clipboard-${stamp()}.${extForMime(blob.type)}`
      const file = new File([blob], name, {
        type: blob.type || 'application/octet-stream',
        lastModified: Date.now(),
      })
      onCaptured(file)
    }

    const check = async () => {
      try {
        if (typeof clipboard.read === 'function') {
          const items = await clipboard.read()
          if (cancelled) return
          // Process the first item that has a usable type
          for (const item of items) {
            // Prefer images > html-stripped text > plain text > anything else
            const types = Array.from(item.types)
            const ordered = [
              ...types.filter((t) => t.startsWith('image/')),
              ...types.filter((t) => t === 'text/plain'),
              ...types.filter((t) => !t.startsWith('image/') && t !== 'text/plain'),
            ]
            for (const type of ordered) {
              try {
                const blob = await item.getType(type)
                const fp = await fingerprintBlob(blob)
                if (fp === lastFpRef.current) return
                if (!seededRef.current) {
                  seededRef.current = true
                  lastFpRef.current = fp
                  return
                }
                handleBlob(blob, fp)
                return
              } catch { /* try next type */ }
            }
          }
          return
        }

        // Fallback path: text only
        if (typeof clipboard.readText === 'function') {
          const text = await clipboard.readText()
          if (cancelled) return
          const fp = `text:${text.length}:${text.slice(0, 64)}`
          if (fp === lastFpRef.current) return
          if (!seededRef.current) {
            seededRef.current = true
            lastFpRef.current = fp
            return
          }
          if (!text) return
          const blob = new Blob([text], { type: 'text/plain' })
          handleBlob(blob, fp, `clipboard-${stamp()}.txt`)
        }
      } catch (err) {
        if (seededRef.current) return // already informed once
        seededRef.current = true
        onPermissionError((err as Error)?.message || String(err))
      }
    }

    check()

    const onFocus = () => { check() }
    const onVisibility = () => { if (document.visibilityState === 'visible') check() }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, onCaptured, onPermissionError])
}
