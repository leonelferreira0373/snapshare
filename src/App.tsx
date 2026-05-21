import { useEffect, useRef } from 'react'
import { usePeer } from './hooks/usePeer'
import { HomeScreen } from './components/HomeScreen'
import { Footer } from './components/Footer'

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
    <>
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
      />
      <Footer />
    </>
  )
}
