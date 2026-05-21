import { useEffect, useRef, useState, useCallback } from 'react'
import Peer, { DataConnection } from 'peerjs'
import { generateShortId } from '../lib/codeFromId'

export type PeerStatus = 'connecting' | 'ready' | 'paired' | 'reconnecting' | 'error'

export interface PeerMeta {
  platform: string
}

export interface UsePeerResult {
  myId: string | null
  status: PeerStatus
  connection: DataConnection | null
  remoteId: string | null
  remoteMeta: PeerMeta | null
  connect: (remoteId: string) => void
  disconnect: () => void
  error: string | null
}

const MAX_ID_RETRIES = 4

function detectPlatform(): string {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (/Android/.test(ua)) return 'Android'
  if (/Mac/.test(ua)) return 'Mac'
  if (/Win/.test(ua)) return 'PC'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Device'
}

export function usePeer(): UsePeerResult {
  const peerRef = useRef<Peer | null>(null)
  const connectionRef = useRef<DataConnection | null>(null)
  const lastRemoteIdRef = useRef<string | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [status, setStatus] = useState<PeerStatus>('connecting')
  const [connection, setConnection] = useState<DataConnection | null>(null)
  const [remoteId, setRemoteId] = useState<string | null>(null)
  const [remoteMeta, setRemoteMeta] = useState<PeerMeta | null>(null)
  const [error, setError] = useState<string | null>(null)

  const attachConnection = useCallback((conn: DataConnection) => {
    conn.on('open', () => {
      connectionRef.current = conn
      lastRemoteIdRef.current = conn.peer
      setConnection(conn)
      setRemoteId(conn.peer)
      setStatus('paired')
      setError(null)
      // Send our platform info as the first message
      try {
        conn.send(JSON.stringify({ type: 'hello', platform: detectPlatform() }))
      } catch (e) {
        console.warn('failed to send hello', e)
      }
    })

    // Intercept hello messages to set remoteMeta
    const onData = (data: unknown) => {
      if (typeof data !== 'string') return
      try {
        const msg = JSON.parse(data) as { type?: string; platform?: string }
        if (msg.type === 'hello' && msg.platform) {
          setRemoteMeta({ platform: msg.platform })
        }
      } catch {
        /* not JSON or not a hello — ignore */
      }
    }
    conn.on('data', onData)

    conn.on('close', () => {
      if (connectionRef.current === conn) {
        connectionRef.current = null
        setConnection(null)
        setRemoteMeta(null)
        // Keep remoteId in lastRemoteIdRef for potential reconnect
        setStatus('reconnecting')
      }
    })
    conn.on('error', (err) => {
      console.error('connection error', err)
      setError(String(err))
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    let retries = 0

    function spinUp() {
      if (cancelled) return
      const candidateId = `snap-${generateShortId()}`
      const peer = new Peer(candidateId, { debug: 1 })
      peerRef.current = peer

      peer.on('open', (id) => {
        if (cancelled) return
        setMyId(id)
        // If we have a lastRemoteId and the connection died, try to reconnect to it
        if (lastRemoteIdRef.current && !connectionRef.current) {
          setStatus('reconnecting')
          const conn = peer.connect(lastRemoteIdRef.current, { reliable: true })
          attachConnection(conn)
        } else {
          setStatus((s) => (s === 'paired' ? s : 'ready'))
        }
      })

      peer.on('connection', (conn) => {
        // If we already have a live connection, replace it (peer reconnecting)
        if (connectionRef.current && connectionRef.current.open && connectionRef.current.peer !== conn.peer) {
          // Different peer is trying to connect; close old and accept new
          try { connectionRef.current.close() } catch { /* noop */ }
        }
        attachConnection(conn)
      })

      peer.on('disconnected', () => {
        if (cancelled) return
        // Broker disconnected. P2P data may still be live; don't show error if paired.
        // Try to reconnect to the broker silently.
        try { peer.reconnect() } catch { /* noop */ }
      })

      peer.on('error', (err) => {
        if (cancelled) return
        console.error('peer error', err)
        if (err.type === 'unavailable-id' && retries < MAX_ID_RETRIES) {
          retries++
          peer.destroy()
          spinUp()
          return
        }
        if (err.type === 'peer-unavailable') {
          setError('Code not found. Check the code and try again.')
          setStatus('ready')
          return
        }
        // 'network' / 'disconnected' / 'server-error': suppress visible error
        // if we still believe we're paired; let PeerJS retry the broker.
        if (err.type === 'network' || err.type === 'server-error' || err.type === 'disconnected') {
          if (connectionRef.current?.open) {
            // Still have P2P channel — silent recovery
            return
          }
        }
        setError(err.message || String(err))
        setStatus('error')
      })
    }

    spinUp()

    // On page becoming visible again (mobile foreground), try to recover
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      const peer = peerRef.current
      if (!peer) return
      // Reconnect broker if disconnected
      if (peer.disconnected && !peer.destroyed) {
        try { peer.reconnect() } catch { /* noop */ }
      }
      // Re-establish P2P if it died but we have a known remote
      if (!connectionRef.current && lastRemoteIdRef.current && myId) {
        setStatus('reconnecting')
        const conn = peer.connect(lastRemoteIdRef.current, { reliable: true })
        attachConnection(conn)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      peerRef.current?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function connect(target: string) {
    const peer = peerRef.current
    if (!peer || !myId) return
    setError(null)
    const conn = peer.connect(target, { reliable: true })
    attachConnection(conn)
  }

  function disconnect() {
    lastRemoteIdRef.current = null
    connectionRef.current?.close()
    setRemoteId(null)
    setRemoteMeta(null)
    setStatus('ready')
  }

  return { myId, status, connection, remoteId, remoteMeta, connect, disconnect, error }
}
