import { useEffect, useRef, useState, useCallback } from 'react'
import Peer, { DataConnection } from 'peerjs'
import { generateShortId } from '../lib/codeFromId'
import {
  loadPeerId, savePeerId,
  loadLastPairs, upsertLastPair, removeLastPair as persistRemovePair,
  type LastPair,
} from '../lib/persist'

export type PeerStatus = 'connecting' | 'ready' | 'error'

export type TransferDirection = 'in' | 'out'
export type TransferStatus = 'transferring' | 'done' | 'failed'

export interface Transfer {
  id: string
  peerId: string
  direction: TransferDirection
  name: string
  size: number
  mime: string
  bytes: number
  status: TransferStatus
  error?: string
  downloadUrl?: string
}

export interface PairedPeer {
  peerId: string
  platform?: string
  status: 'connecting' | 'open' | 'reconnecting'
}

export interface UsePeerResult {
  myId: string | null
  status: PeerStatus
  peers: PairedPeer[]
  transfers: Transfer[]
  lastPairs: LastPair[]
  sendFiles: (files: FileList | File[]) => Promise<void>
  connect: (remoteId: string) => void
  disconnectPeer: (peerId: string) => void
  disconnectAll: () => void
  forgetPair: (peerId: string) => void
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

interface InboundEntry {
  meta: MetaMsg
  chunks: Uint8Array[]
  received: number
}

export function usePeer(): UsePeerResult {
  const peerRef = useRef<Peer | null>(null)
  // peerId → DataConnection (only "open" ones live here)
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map())
  // peerId → DataConnection in the process of opening
  const pendingConnsRef = useRef<Map<string, DataConnection>>(new Map())
  // Per-connection inbound state keyed by `${peerId}:${transferId}`
  const inboundRef = useRef<Map<string, InboundEntry>>(new Map())
  // Per-peer "current incoming transferId" (most recent meta seen from that peer)
  const currentInboundIdRef = useRef<Map<string, string>>(new Map())

  const [myId, setMyId] = useState<string | null>(null)
  const [status, setStatus] = useState<PeerStatus>('connecting')
  const [peers, setPeers] = useState<PairedPeer[]>([])
  const peersRef = useRef<PairedPeer[]>([])
  peersRef.current = peers
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [error, setError] = useState<string | null>(null)
  const [lastPairs, setLastPairs] = useState<LastPair[]>(() => loadLastPairs())

  const upsertPeer = useCallback((peerId: string, patch: Partial<PairedPeer>) => {
    setPeers((prev) => {
      const idx = prev.findIndex((p) => p.peerId === peerId)
      if (idx === -1) {
        return [...prev, { peerId, status: 'connecting', ...patch }]
      }
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }, [])

  const removePeer = useCallback((peerId: string) => {
    setPeers((prev) => prev.filter((p) => p.peerId !== peerId))
  }, [])

  const upsertTransfer = useCallback((id: string, patch: Partial<Transfer>) => {
    setTransfers((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      if (idx === -1) return prev
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }, [])

  const handleData = useCallback((peerId: string, data: unknown) => {
    if (typeof data === 'string') {
      let msg: CtrlMsg
      try { msg = JSON.parse(data) as CtrlMsg } catch { return }
      if (msg.type === 'hello') {
        upsertPeer(peerId, { platform: msg.platform })
        const pair: LastPair = { peerId, platform: msg.platform, at: Date.now() }
        const next = upsertLastPair(pair)
        setLastPairs(next)
        return
      }
      if (msg.type === 'meta') {
        const key = `${peerId}:${msg.id}`
        inboundRef.current.set(key, { meta: msg, chunks: [], received: 0 })
        currentInboundIdRef.current.set(peerId, msg.id)
        setTransfers((prev) => [
          ...prev,
          {
            id: msg.id, peerId, direction: 'in',
            name: msg.name, size: msg.size, mime: msg.mime,
            bytes: 0, status: 'transferring',
          },
        ])
        return
      }
      if (msg.type === 'eof') {
        const key = `${peerId}:${msg.id}`
        const entry = inboundRef.current.get(key)
        if (!entry) return
        const blob = new Blob(entry.chunks as BlobPart[], {
          type: entry.meta.mime || 'application/octet-stream',
        })
        const url = URL.createObjectURL(blob)
        upsertTransfer(msg.id, { status: 'done', bytes: entry.meta.size, downloadUrl: url })
        const a = document.createElement('a')
        a.href = url
        a.download = entry.meta.name
        a.rel = 'noopener'
        document.body.appendChild(a)
        a.click()
        a.remove()
        inboundRef.current.delete(key)
        if (currentInboundIdRef.current.get(peerId) === msg.id) {
          currentInboundIdRef.current.delete(peerId)
        }
        return
      }
      return
    }
    // Binary chunk — belongs to current inbound for THIS peer
    const id = currentInboundIdRef.current.get(peerId)
    if (!id) return
    const key = `${peerId}:${id}`
    const entry = inboundRef.current.get(key)
    if (!entry) return
    const buf = data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array((data as ArrayBufferView).buffer)
    entry.chunks.push(buf)
    entry.received += buf.byteLength
    upsertTransfer(id, { bytes: entry.received })
  }, [upsertPeer, upsertTransfer])

  const attachConnection = useCallback((conn: DataConnection) => {
    const peerId = conn.peer
    pendingConnsRef.current.set(peerId, conn)
    upsertPeer(peerId, { status: 'connecting' })

    // Sync data listener — no races
    conn.on('data', (data) => handleData(peerId, data))

    conn.on('open', () => {
      // If another conn for this peer beat us, drop this one
      const existing = connectionsRef.current.get(peerId)
      if (existing && existing.open && existing !== conn) {
        try { conn.close() } catch { /* noop */ }
        return
      }
      connectionsRef.current.set(peerId, conn)
      pendingConnsRef.current.delete(peerId)
      upsertPeer(peerId, { status: 'open' })
      setError(null)
      try {
        conn.send(JSON.stringify({ type: 'hello', platform: detectPlatform() } satisfies HelloMsg))
      } catch (e) { console.warn('hello send failed', e) }
    })

    conn.on('close', () => {
      if (pendingConnsRef.current.get(peerId) === conn) pendingConnsRef.current.delete(peerId)
      if (connectionsRef.current.get(peerId) === conn) {
        connectionsRef.current.delete(peerId)
        upsertPeer(peerId, { status: 'reconnecting' })
      }
    })

    conn.on('error', (err) => {
      console.error(`connection error (${peerId})`, err)
    })
  }, [handleData, upsertPeer])

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
        setStatus('ready')
      })

      peer.on('connection', (conn) => {
        // Replace any existing live conn from same peer
        const existing = connectionsRef.current.get(conn.peer)
        if (existing && existing.open && existing !== conn) {
          try { existing.close() } catch { /* noop */ }
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
          spinUp(true)
          return
        }
        if (err.type === 'peer-unavailable') {
          setError('Code not found. Check the code and try again.')
          return
        }
        if (err.type === 'network' || err.type === 'server-error' || err.type === 'disconnected') {
          // Broker hiccup — silent if we have any live P2P channels
          if (connectionsRef.current.size > 0) return
        }
        setError(err.message || String(err))
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
      // For every peer we *should* be connected to but currently aren't, retry.
      for (const p of peersRef.current) {
        if (p.status === 'reconnecting' &&
            !connectionsRef.current.get(p.peerId) &&
            !pendingConnsRef.current.get(p.peerId)) {
          const conn = peer.connect(p.peerId, { reliable: true })
          attachConnection(conn)
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      peerRef.current?.destroy()
    }
  }, [attachConnection])

  const sendFileToConn = useCallback(async (conn: DataConnection, file: File, transferId: string) => {
    const meta: MetaMsg = {
      type: 'meta', id: transferId,
      name: file.name, size: file.size,
      mime: file.type || 'application/octet-stream',
    }
    conn.send(JSON.stringify(meta))

    const rawDc = (conn as unknown as { dataChannel?: RTCDataChannel }).dataChannel
    if (rawDc) rawDc.bufferedAmountLowThreshold = LOW_WATER

    let offset = 0
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
    }
    conn.send(JSON.stringify({ type: 'eof', id: transferId } satisfies EofMsg))
  }, [])

  // Broadcast a file to every paired & open peer in parallel
  const sendFile = useCallback(async (file: File) => {
    const liveConns = Array.from(connectionsRef.current.values()).filter((c) => c.open)
    if (liveConns.length === 0) return
    await Promise.all(liveConns.map(async (conn) => {
      const transferId = crypto.randomUUID()
      setTransfers((prev) => [
        ...prev,
        {
          id: transferId, peerId: conn.peer, direction: 'out',
          name: file.name, size: file.size,
          mime: file.type || 'application/octet-stream',
          bytes: 0, status: 'transferring',
        },
      ])
      try {
        await sendFileToConn(conn, file, transferId)
        upsertTransfer(transferId, { bytes: file.size, status: 'done' })
      } catch (e) {
        upsertTransfer(transferId, { status: 'failed', error: String(e) })
      }
    }))
  }, [sendFileToConn, upsertTransfer])

  const sendFiles = useCallback(async (files: FileList | File[]) => {
    for (const f of Array.from(files)) {
      await sendFile(f)
    }
  }, [sendFile])

  function connect(target: string) {
    const peer = peerRef.current
    if (!peer || !target) return
    // Don't double-connect to the same peer
    if (connectionsRef.current.get(target)?.open || pendingConnsRef.current.get(target)) return
    if (target === peer.id) {
      setError("Can't pair with yourself.")
      return
    }
    setError(null)
    const conn = peer.connect(target, { reliable: true })
    attachConnection(conn)
  }

  function disconnectPeer(peerId: string) {
    connectionsRef.current.get(peerId)?.close()
    pendingConnsRef.current.get(peerId)?.close()
    connectionsRef.current.delete(peerId)
    pendingConnsRef.current.delete(peerId)
    removePeer(peerId)
  }

  function disconnectAll() {
    for (const conn of connectionsRef.current.values()) {
      try { conn.close() } catch { /* noop */ }
    }
    for (const conn of pendingConnsRef.current.values()) {
      try { conn.close() } catch { /* noop */ }
    }
    connectionsRef.current.clear()
    pendingConnsRef.current.clear()
    setPeers([])
  }

  function forgetPair(peerId: string) {
    const next = persistRemovePair(peerId)
    setLastPairs(next)
  }

  return {
    myId,
    status,
    peers,
    transfers,
    lastPairs,
    sendFiles,
    connect,
    disconnectPeer,
    disconnectAll,
    forgetPair,
    error,
  }
}
