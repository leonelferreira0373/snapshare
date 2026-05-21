import { useEffect, useRef, useState, useCallback } from 'react'
import { usePeer } from './hooks/usePeer'
import { HomeScreen } from './components/HomeScreen'
import { Footer } from './components/Footer'
import { SettingsPill } from './components/SettingsPill'
import { I18nContext, dictionaries, interpolate, loadLang, saveLang, type Lang } from './lib/i18n'
import { ThemeContext, applyTheme, loadTheme, saveTheme, type Theme } from './lib/theme'

export default function App() {
  const [lang, setLangState] = useState<Lang>(() => loadLang())
  const [theme, setThemeState] = useState<Theme>(() => {
    const t = loadTheme()
    applyTheme(t)
    return t
  })

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    saveLang(l)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    saveTheme(t)
    applyTheme(t)
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = dictionaries[lang]
      const raw = dict[key] ?? dictionaries.en[key] ?? key
      return interpolate(raw, vars)
    },
    [lang],
  )

  return (
    <I18nContext.Provider value={{ lang, setLang, t: t as never }}>
      <ThemeContext.Provider value={{ theme, setTheme }}>
        <SettingsPill />
        <AppBody />
        <Footer />
      </ThemeContext.Provider>
    </I18nContext.Provider>
  )
}

function AppBody() {
  const peer = usePeer()
  const autoPairAttempted = useRef(false)

  useEffect(() => {
    if (peer.status !== 'ready' || autoPairAttempted.current) return
    const params = new URLSearchParams(window.location.search)
    const target = params.get('peer')
    if (target) {
      autoPairAttempted.current = true
      peer.connect(target)
      const clean = window.location.pathname
      window.history.replaceState({}, '', clean)
    }
  }, [peer.status, peer])

  return (
    <HomeScreen
      myId={peer.myId}
      status={peer.status}
      peers={peer.peers}
      transfers={peer.transfers}
      lastPairs={peer.lastPairs}
      error={peer.error}
      onConnect={peer.connect}
      onDisconnectPeer={peer.disconnectPeer}
      onDisconnectAll={peer.disconnectAll}
      onForgetPair={peer.forgetPair}
      onSendFiles={peer.sendFiles}
      onResend={peer.resendTransfer}
      onCancel={peer.cancelTransfer}
    />
  )
}
