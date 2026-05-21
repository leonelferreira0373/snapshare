import { useEffect, useRef, useState, useCallback } from 'react'
import Peer, { DataConnection } from 'peerjs'
import { generateShortId } from '../lib/codeFromId'
import { loadPeerId, savePeerId, loadLastPair, saveLastPair, clearLastPair, LastPair } from '../lib/persist'

export type PeerStatus = 'connecting' | 'ready' | 'paired' | 'reconnecting' | 'error'

export type TransferDirection = 'in' | 'out'
export type TransferStatus = 'transferring' | 'done' | 'failed'

export interface Transfer {
  id: string
  direction: TransferDirection
  name: string
  size: number
  mime: string
  bytes: number
  status: TransferStatus
  error?: string
  downloadUrl?: string
}

export interface PeerMeta {
  platform: string
}

export interface UsePeerResult {
  myId: string | null
  status: PeerStatus
  remoteId: string | null
  remoteMeta: PeerMeta | null
  isConnected: boolean
  transfers: Transfer[]
  lastPair: LastPair | null
  sendFiles: (files: FileList | File[]) => Promise<void>
  connect: (remoteId: string) => void
  disconnect: () => void
  forgetLastPair: () => void
  error: string | null
}

const MAX_ID_RETRIES = 4
const CHUNK_SIZE = 16 * 1024
const HIGH_WATER = 16 * 1024 * 1024
const LOW_WATER = 1 * 1024 * 1024

interface MetaMsg { type: 'meta'; id: string; name: string; size: number; mime: string }
interface EofMsg { type: 'eof'; id: string }
interface HelloMsg { type: 'hello'; platform: string }
type CtrlMsg = MetaMsg | EofMsg | HelloMsg

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
  const pendingConnRef = useRef<DataConnection | null>(null)
  const lastRemoteIdRef = useRef<string | null>(null)
  const inboundRef = useRef<Map<string, { meta: MetaMsg; chunks: Uint8Array[]; received: number }>>(new Map())
  const currentInboundIdRef = useRef<string | null>(null)

  const [myId, setMyId] = useState<string | null>(null)
  const [status, setStatus] = useState<PeerStatus>('connecting')
  const [remoteId, setRemoteId] = useState<string | null>(null)
  const [remoteMeta, setRemoteMeta] = useState<PeerMeta | null>(null)
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [error, setError] = useState<string | null>(null)
  const [connOpen, setConnOpen] = useState(false)
  const [lastPair, setLastPair] = useState<LastPair | null>(() => loadLastPair())

  const upsert = useCallback((id: string, patch: Partial<Transfer>) => {
    setTransfers((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      if (idx === -1) return prev
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }, [])

  const handleData = useCallback((data: unknown) => {
    // String control msgs
    if (typeof data === 'string') {
      let msg: CtrlMsg
      try { msg = JSON.parse(data) as CtrlMsg } catch { return }
      if (msg.type === 'hello') {
        setRemoteMeta({ platform: msg.platform })
        const remote = lastRemoteIdRef.current
        if (remote) {
          const pair: LastPair = { peerId: remote, platform: msg.platform, at: Date.now() }
          setLastPair(pair)
          saveLastPair(pair)
        }
        return
      }
      if (msg.type === 'meta') {
        inboundRef.current.set(msg.id, { meta: msg, chunks: [], received: 0 })
        currentInboundIdRef.current = msg.id
        setTransfers((prev) => [
          ...prev,
          { id: msg.id, direction: 'in', name: msg.name, size: msg.size, mime: msg.mime, bytes: 0, status: 'transferring' },
        ])
        return
      }
      if (msg.type === 'eof') {
        const entry = inboundRef.current.get(msg.id)
        if (!entry) return
        const blob = new Blob(entry.chunks as BlobPart[], { type: entry.meta.mime || 'application/octet-stream' })
        const url = URL.createObjectURL(blob)
        upsert(msg.id, { status: 'done', bytes: entry.meta.size, downloadUrl: url })
        const a = document.createElement('a')
        a.href = url
        a.download = entry.meta.name
        a.rel = 'noopener'
        document.body.appendChild(a)
        a.click()
        a.remove()
        inboundRef.current.delete(msg.id)
        if (currentInboundIdRef.current === msg.id) currentInboundIdRef.current = null
        return
      }
      return
    }
    // Binary chunk
    const id = currentInboundIdRef.current
    if (!id) return
    const entry = inboundRef.current.get(id)
    if (!entry) return
    const buf = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array((data as ArrayBufferView).buffer)
    entry.chunks.push(buf)
    entry.received += buf.byteLength
    upsert(id, { bytes: entry.received })
  }, [upsert])

  const attachConnection = useCallback((conn: DataConnection) => {
    pendingConnRef.current = conn

    // Register data handler SYNCHRONOUSLY so no events are lost between
    // 'open' and the React state update cycle.
    conn.on('data', handleData)

    conn.on('open', () => {
      if (pendingConnRef.current && pendingConnRef.current !== conn) {
        try { conn.close() } catch { /* noop */ }
        return
      }
      if (connectionRef.current && connectionRef.current.open && connectionRef.current !== conn) {
        try { conn.close() } catch { /* noop */ }
        return
      }
      connectionRef.current = conn
      pendingConnRef.current = null
      lastRemoteIdRef.current = conn.peer
      setRemoteId(conn.peer)
      setStatus('paired')
      setConnOpen(true)
      setError(null)
      const newPair: LastPair = { peerId: conn.peer, at: Date.now() }
      setLastPair(newPair)
      saveLastPair(newPair)
      try {
        conn.send(JSON.stringify({ type: 'hello', platform: detectPlatform() } satisfies HelloMsg))
      } catch (e) {
        console.warn('failed to send hello', e)
      }
    })

    conn.on('close', () => {
      if (pendingConnRef.current === conn) pendingConnRef.current = null
      if (connectionRef.current === conn) {
        connectionRef.current = null
        setConnOpen(false)
        setRemoteMeta(null)
        setStatus('reconnecting')
      }
    })

    conn.on('error', (err) => {
      console.error('connection error', err)
      setError(String(err))
    })
  }, [handleData])

  useEffect(() => {
    let cancelled = false
    let retries = 0

    function spinUp(forceFresh = false) {
      if (cancelled) return
      const persisted = !forceFresh ? loadPeerId() : null
      const candidateId = persisted || `snap-${generateShortId()}`
      const peer = new Peer(candidateId, { debug: 1 })
      peerRef.current = peer

      peer.on('open', (id) => {
        if (cancelled) return
        setMyId(id)
        savePeerId(id)
        setStatus((s) => (s === 'paired' || s === 'reconnecting' ? s : 'ready'))
      })

      peer.on('connection', (conn) => {
        if (connectionRef.current && connectionRef.current.open && connectionRef.current.peer !== conn.peer) {
          try { connectionRef.current.close() } catch { /* noop */ }
        }
        attachConnection(conn)
      })

      peer.on('disconnected', () => {
        if (cancelled) return
        try { peer.reconnect() } catch { /* noop */ }
      })

      peer.on('error', (err) => {
        if (cancelled) return
        console.error('peer error', err)
        if (err.type === 'unavailable-id' && retries < MAX_ID_RETRIES) {
          retries++
          peer.destroy()
          // On collision, force-fresh ID (persisted one may be taken by another tab)
          spinUp(true)
          return
        }
        if (err.type === 'peer-unavailable') {
          setError('Code not found. Check the code and try again.')
          setStatus('ready')
          return
        }
        if (err.type === 'network' || err.type === 'server-error' || err.type === 'disconnected') {
          if (connectionRef.current?.open) return
        }
        setError(err.message || String(err))
        setStatus('error')
      })
    }

    spinUp()

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      const peer = peerRef.current
      if (!peer) return
      if (peer.disconnected && !peer.destroyed) {
        try { peer.reconnect() } catch { /* noop */ }
      }
      if (
        !connectionRef.current &&
        !pendingConnRef.current &&
        lastRemoteIdRef.current
      ) {
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
  }, [attachConnection])

  const sendFile = useCallback(async (file: File) => {
    const conn = connectionRef.current
    if (!conn || !conn.open) return
    const id = crypto.randomUUID()
    const meta: MetaMsg = {
      type: 'meta',
      id,
      name: file.name,
      size: file.size,
      mime: file.type || 'application/octet-stream',
    }
    setTransfers((prev) => [
      ...prev,
      { id, direction: 'out', name: file.name, size: file.size, mime: meta.mime, bytes: 0, status: 'transferring' },
    ])
    conn.send(JSON.stringify(meta))

    const rawDc = (conn as unknown as { dataChannel?: RTCDataChannel }).dataChannel
    if (rawDc) rawDc.bufferedAmountLowThreshold = LOW_WATER

    let offset = 0
    let sent = 0
    while (offset < file.size) {
      const slice = file.slice(offset, offset + CHUNK_SIZE)
      const buf = await slice.arrayBuffer()
      if (rawDc && rawDc.bufferedAmount > HIGH_WATER) {
        await new Promise<void>((resolve) => {
          const handler = () => { rawDc.removeEventListener('bufferedamountlow', handler); resolve() }
          rawDc.addEventListener('bufferedamountlow', handler)
        })
      }
      conn.send(buf)
      offset += buf.byteLength
      sent += buf.byteLength
      if (sent % (CHUNK_SIZE * 32) === 0 || offset >= file.size) {
        upsert(id, { bytes: sent })
      }
    }

    conn.send(JSON.stringify({ type: 'eof', id } satisfies EofMsg))
    upsert(id, { bytes: file.size, status: 'done' })
  }, [upsert])

  const sendFiles = useCallback(async (files: FileList | File[]) => {
    for (const f of Array.from(files)) {
      await sendFile(f)
    }
  }, [sendFile])

  function connect(target: string) {
    const peer = peerRef.current
    if (!peer) return
    if (connectionRef.current?.open || pendingConnRef.current) return
    setError(null)
    const conn = peer.connect(target, { reliable: true })
    attachConnection(conn)
  }

  function disconnect() {
    // Close the active connection but keep lastPair / transfers so user can rejoin
    // the same person and the transfer history remains visible.
    connectionRef.current?.close()
    connectionRef.current = null
    pendingConnRef.current = null
    setRemoteId(null)
    setRemoteMeta(null)
    setConnOpen(false)
    setStatus('ready')
  }

  function forgetLastPair() {
    lastRemoteIdRef.current = null
    setLastPair(null)
    clearLastPair()
  }

  return {
    myId,
    status,
    remoteId,
    remoteMeta,
    isConnected: connOpen,
    transfers,
    lastPair,
    sendFiles,
    connect,
    disconnect,
    forgetLastPair,
    error,
  }
}
