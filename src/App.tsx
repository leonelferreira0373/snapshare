import { useEffect, useRef } from 'react'
import { usePeer } from './hooks/usePeer'
import { HomeScreen } from './components/HomeScreen'

export default function App() {
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
      remoteId={peer.remoteId}
      remoteMeta={peer.remoteMeta}
      isConnected={peer.isConnected}
      transfers={peer.transfers}
      lastPair={peer.lastPair}
      error={peer.error}
      onConnect={peer.connect}
      onDisconnect={peer.disconnect}
      onForgetLastPair={peer.forgetLastPair}
      onSendFiles={peer.sendFiles}
    />
  )
}
