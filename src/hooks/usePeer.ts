import { useEffect, useRef, useState } from 'react'
import Peer, { DataConnection } from 'peerjs'
import { generateShortId } from '../lib/codeFromId'

export type PeerStatus = 'connecting' | 'ready' | 'paired' | 'error'

export interface UsePeerResult {
  myId: string | null
  status: PeerStatus
  connection: DataConnection | null
  remoteId: string | null
  connect: (remoteId: string) => void
  disconnect: () => void
  error: string | null
}

const MAX_ID_RETRIES = 4

export function usePeer(): UsePeerResult {
  const peerRef = useRef<Peer | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [status, setStatus] = useState<PeerStatus>('connecting')
  const [connection, setConnection] = useState<DataConnection | null>(null)
  const [remoteId, setRemoteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let retries = 0

    function attachConnection(conn: DataConnection) {
      conn.on('open', () => {
        setConnection(conn)
        setRemoteId(conn.peer)
        setStatus('paired')
        setError(null)
      })
      conn.on('close', () => {
        setConnection(null)
        setRemoteId(null)
        setStatus('ready')
      })
      conn.on('error', (err) => {
        console.error('connection error', err)
        setError(String(err))
      })
    }

    function spinUp() {
      if (cancelled) return
      const candidateId = `snap-${generateShortId()}`
      const peer = new Peer(candidateId, { debug: 1 })
      peerRef.current = peer

      peer.on('open', (id) => {
        if (cancelled) return
        setMyId(id)
        setStatus('ready')
      })

      peer.on('connection', (conn) => {
        attachConnection(conn)
      })

      peer.on('error', (err) => {
        if (cancelled) return
        console.error('peer error', err)
        // ID collision — recreate with a new short ID
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
        setError(err.message || String(err))
        setStatus('error')
      })

      ;(peer as unknown as { _attachConnection: typeof attachConnection })._attachConnection = attachConnection
    }

    spinUp()

    return () => {
      cancelled = true
      peerRef.current?.destroy()
    }
  }, [])

  function connect(target: string) {
    const peer = peerRef.current
    if (!peer || !myId) return
    setError(null)
    const conn = peer.connect(target, { reliable: true })
    ;(peer as unknown as { _attachConnection: (c: DataConnection) => void })._attachConnection(conn)
  }

  function disconnect() {
    connection?.close()
  }

  return { myId, status, connection, remoteId, connect, disconnect, error }
}
