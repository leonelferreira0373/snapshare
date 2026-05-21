import { useEffect, useState, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: readonly string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}

export interface UsePwaInstallResult {
  canInstall: boolean
  isInstalled: boolean
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

export function usePwaInstall(): UsePwaInstallResult {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Detect already-installed (standalone display mode)
    const mq = window.matchMedia('(display-mode: standalone)')
    const navigatorStandalone = (navigator as Navigator & { standalone?: boolean }).standalone
    if (mq.matches || navigatorStandalone) setIsInstalled(true)

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setIsInstalled(true)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferred) return 'unavailable' as const
    await deferred.prompt()
    const choice = await deferred.userChoice
    if (choice.outcome === 'accepted') setIsInstalled(true)
    setDeferred(null)
    return choice.outcome
  }, [deferred])

  return {
    canInstall: !!deferred && !isInstalled,
    isInstalled,
    promptInstall,
  }
}
