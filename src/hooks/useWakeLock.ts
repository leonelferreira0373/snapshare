import { useEffect, useRef, useState } from 'react'

interface WakeLockSentinel extends EventTarget {
  release: () => Promise<void>
  released: boolean
}

interface WakeLockAPI {
  request: (type: 'screen') => Promise<WakeLockSentinel>
}

const STORAGE_KEY = 'snapshare.wakeLock'

export function loadWakeLockEnabled(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}

export function saveWakeLockEnabled(on: boolean): void {
  try { localStorage.setItem(STORAGE_KEY, on ? '1' : '0') } catch { /* noop */ }
}

export function isWakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

/**
 * Acquires a screen Wake Lock while `enabled` is true. The system releases
 * the lock when the tab becomes hidden; we re-acquire it on visibilitychange
 * back to visible. Caller passes `enabled` to gate when the lock is desired
 * (typically: paired AND user opted in).
 */
export function useWakeLock(enabled: boolean): { active: boolean; supported: boolean } {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const [active, setActive] = useState(false)
  const supported = isWakeLockSupported()

  useEffect(() => {
    if (!supported) return
    if (!enabled) {
      sentinelRef.current?.release().catch(() => undefined)
      sentinelRef.current = null
      setActive(false)
      return
    }

    let cancelled = false
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockAPI }).wakeLock
    if (!wakeLock) return

    const request = async () => {
      try {
        const sentinel = await wakeLock.request('screen')
        if (cancelled) {
          sentinel.release().catch(() => undefined)
          return
        }
        sentinelRef.current = sentinel
        setActive(true)
        sentinel.addEventListener('release', () => {
          sentinelRef.current = null
          setActive(false)
        })
      } catch {
        setActive(false)
      }
    }

    request()

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && enabled && !sentinelRef.current) {
        request()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      sentinelRef.current?.release().catch(() => undefined)
      sentinelRef.current = null
      setActive(false)
    }
  }, [enabled, supported])

  return { active, supported }
}
