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
      const clean = window.location.pathname
      window.history.replaceState({}, '', clean)
    }
  }, [peer.status, peer])

  if ((peer.status === 'paired' || peer.status === 'reconnecting') && peer.remoteId) {
    return (
      <SessionScreen
        isConnected={peer.isConnected}
        isReconnecting={peer.status === 'reconnecting'}
        remoteId={peer.remoteId}
        remotePlatform={peer.remoteMeta?.platform}
        transfers={peer.transfers}
        sendFiles={peer.sendFiles}
        onDisconnect={peer.disconnect}
      />
    )
  }

  const screenStatus =
    peer.status === 'connecting' ? 'connecting' :
    peer.status === 'error' ? 'error' : 'ready'

  return (
    <PairingScreen
      myId={peer.myId}
      status={screenStatus}
      error={peer.error}
      onConnect={peer.connect}
    />
  )
}
