import { useEffect, useRef, useState } from 'react'
import Peer, { DataConnection } from 'peerjs'

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

export function usePeer(): UsePeerResult {
  const peerRef = useRef<Peer | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [status, setStatus] = useState<PeerStatus>('connecting')
  const [connection, setConnection] = useState<DataConnection | null>(null)
  const [remoteId, setRemoteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const peer = new Peer({ debug: 1 })
    peerRef.current = peer

    peer.on('open', (id) => {
      setMyId(id)
      setStatus('ready')
    })

    peer.on('connection', (conn) => {
      attachConnection(conn)
    })

    peer.on('error', (err) => {
      console.error('peer error', err)
      setError(err.message || String(err))
      if (err.type === 'peer-unavailable') {
        setStatus('ready')
      } else {
        setStatus('error')
      }
    })

    function attachConnection(conn: DataConnection) {
      conn.on('open', () => {
        setConnection(conn)
        setRemoteId(conn.peer)
        setStatus('paired')
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

    ;(peer as unknown as { _attachConnection: typeof attachConnection })._attachConnection = attachConnection

    return () => {
      peer.destroy()
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
