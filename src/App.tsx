import { useEffect, useRef } from 'react'
import { usePeer } from './hooks/usePeer'
import { PairingScreen } from './components/PairingScreen'
import { SessionScreen } from './components/SessionScreen'

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
      // Clean query so refresh doesn't loop
      const clean = window.location.pathname
      window.history.replaceState({}, '', clean)
    }
  }, [peer.status, peer])

  if (peer.status === 'paired' && peer.connection && peer.remoteId) {
    return (
      <SessionScreen
        connection={peer.connection}
        remoteId={peer.remoteId}
        onDisconnect={peer.disconnect}
      />
    )
  }

  return (
    <PairingScreen
      myId={peer.myId}
      status={peer.status === 'error' ? 'error' : peer.status === 'paired' ? 'ready' : peer.status}
      error={peer.error}
      onConnect={peer.connect}
    />
  )
}
