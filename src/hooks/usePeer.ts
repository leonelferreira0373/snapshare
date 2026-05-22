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
  // For text-like payloads under a reasonable cap, we keep the decoded
  // string so the UI can offer a tap-to-copy interaction.
  textContent?: string
  // Timing — both as epoch milliseconds, set as soon as we know.
  startedAt: number
  completedAt?: number
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
  resendTransfer: (transfer: Transfer) => Promise<void>
  cancelTransfer: (transfer: Transfer) => void
  connect: (remoteId: string) => void
  reconnectPeer: (peerId: string) => void
  disconnectPeer: (peerId: string) => void
  disconnectAll: () => void
  forgetPair: (peerId: string) => void
  error: string | null
}

const MAX_ID_RETRIES = 4
const CHUNK_SIZE = 16 * 1024
const HIGH_WATER = 16 * 1024 * 1024
const LOW_WATER = 1 * 1024 * 1024

// ICE servers used for NAT traversal. STUN is enough for ~90% of cases;
// TURN relays the actual bytes when both peers are behind symmetric NAT /
// CGNAT (common with mobile carriers, hotel WiFi, etc.). The Open Relay
// servers below are public and shared — they cost the operator nothing
// but are rate-limited. For dedicated bandwidth, sign up at metered.ca
// (50 GB/mo free) and swap these credentials.
const ICE_SERVERS = [
  // Multiple STUN — try the obvious peer-discovery path first
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:openrelay.metered.ca:80' },
  // TURN relays — when STUN can't punch through. Multiple ports/transports
  // so at least one is likely to be reachable from restrictive networks.
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

interface MetaMsg { type: 'meta'; id: string; name: string; size: number; mime: string }
interface EofMsg { type: 'eof'; id: string }
interface HelloMsg { type: 'hello'; platform: string }
interface CancelMsg { type: 'cancel'; id: string }
type CtrlMsg = MetaMsg | EofMsg | HelloMsg | CancelMsg

class TransferCancelled extends Error {
  constructor() { super('cancelled') }
}

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
  // transferId → File for outbound transfers, so we can resend without re-pick
  const sourceFilesRef = useRef<Map<string, File>>(new Map())
  // transferIds that have been cancelled; the send loop polls this each chunk
  const cancelledRef = useRef<Set<string>>(new Set())

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
            startedAt: Date.now(),
          },
        ])
        return
      }
      if (msg.type === 'cancel') {
        cancelledRef.current.add(msg.id)
        const key = `${peerId}:${msg.id}`
        if (inboundRef.current.has(key)) {
          inboundRef.current.delete(key)
          if (currentInboundIdRef.current.get(peerId) === msg.id) {
            currentInboundIdRef.current.delete(peerId)
          }
        }
        upsertTransfer(msg.id, { status: 'failed', error: 'cancelled', completedAt: Date.now() })
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
        const isText =
          entry.meta.mime?.startsWith('text/') ||
          /\.(txt|md|csv|log|json|xml|yml|yaml|html|css|js|ts)$/i.test(entry.meta.name)
        const TEXT_PREVIEW_CAP = 1024 * 1024 // 1 MB cap for tap-to-copy

        // Auto-download (lands in Downloads / Gallery) for binary payloads.
        // For text we skip auto-download — the row becomes tap-to-copy instead,
        // and the user can still hit "Save again" if they want a file copy.
        if (!isText) {
          const a = document.createElement('a')
          a.href = url
          a.download = entry.meta.name
          a.rel = 'noopener'
          document.body.appendChild(a)
          a.click()
          a.remove()
        }

        const completedAt = Date.now()
        if (isText && entry.meta.size <= TEXT_PREVIEW_CAP) {
          blob.text().then((text) => {
            upsertTransfer(msg.id, {
              status: 'done',
              bytes: entry.meta.size,
              downloadUrl: url,
              textContent: text,
              completedAt,
            })
          }).catch(() => {
            upsertTransfer(msg.id, { status: 'done', bytes: entry.meta.size, downloadUrl: url, completedAt })
          })
        } else {
          upsertTransfer(msg.id, { status: 'done', bytes: entry.meta.size, downloadUrl: url, completedAt })
        }

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
      const peer = new Peer(candidateId, {
        debug: 1,
        config: { iceServers: ICE_SERVERS },
      })
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

    // Report progress at most ~every 1% (or 64 KB, whichever is larger) to
    // keep React renders cheap on big files but still feel responsive.
    const reportEvery = Math.max(64 * 1024, Math.floor(file.size / 100) || CHUNK_SIZE)
    let offset = 0
    let lastReported = 0

    while (offset < file.size) {
      if (cancelledRef.current.has(transferId)) {
        // Notify the receiver to clean up its inbound buffer.
        try {
          conn.send(JSON.stringify({ type: 'cancel', id: transferId } satisfies CancelMsg))
        } catch { /* conn may already be closed */ }
        throw new TransferCancelled()
      }
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
      if (offset - lastReported >= reportEvery || offset >= file.size) {
        upsertTransfer(transferId, { bytes: offset })
        lastReported = offset
      }
    }
    conn.send(JSON.stringify({ type: 'eof', id: transferId } satisfies EofMsg))
  }, [upsertTransfer])

  // Broadcast every file to every paired & open peer.
  // Pre-creates ALL transfer rows up front (so a multi-file pick shows
  // every file immediately in the list, not one-at-a-time). Sends serially
  // per connection (DataChannel can't safely interleave chunks for now)
  // but in parallel across connections.
  const sendFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files)
    if (arr.length === 0) return
    const liveConns = Array.from(connectionsRef.current.values()).filter((c) => c.open)
    if (liveConns.length === 0) return

    interface Job { file: File; conn: DataConnection; transferId: string }
    const jobs: Job[] = []
    const queuedRows: Transfer[] = []
    const startedAt = Date.now()
    for (const file of arr) {
      for (const conn of liveConns) {
        const transferId = crypto.randomUUID()
        jobs.push({ file, conn, transferId })
        sourceFilesRef.current.set(transferId, file)
        queuedRows.push({
          id: transferId, peerId: conn.peer, direction: 'out',
          name: file.name, size: file.size,
          mime: file.type || 'application/octet-stream',
          bytes: 0, status: 'transferring',
          startedAt,
        })
      }
    }
    setTransfers((prev) => [...prev, ...queuedRows])

    // Group by connection so each conn drains its queue serially.
    const byConn = new Map<DataConnection, Job[]>()
    for (const job of jobs) {
      const list = byConn.get(job.conn) ?? []
      list.push(job)
      byConn.set(job.conn, list)
    }

    await Promise.all(
      Array.from(byConn.values()).map(async (list) => {
        for (const job of list) {
          try {
            await sendFileToConn(job.conn, job.file, job.transferId)
            upsertTransfer(job.transferId, { bytes: job.file.size, status: 'done', completedAt: Date.now() })
          } catch (e) {
            const completedAt = Date.now()
            if (e instanceof TransferCancelled) {
              upsertTransfer(job.transferId, { status: 'failed', error: 'cancelled', completedAt })
            } else {
              upsertTransfer(job.transferId, { status: 'failed', error: String(e), completedAt })
            }
          }
        }
      }),
    )
  }, [sendFileToConn, upsertTransfer])

  const cancelTransfer = useCallback((transfer: Transfer) => {
    cancelledRef.current.add(transfer.id)
    if (transfer.direction === 'in') {
      // Tell the sender to stop; clean up our partial buffer
      const conn = connectionsRef.current.get(transfer.peerId)
      if (conn?.open) {
        try {
          conn.send(JSON.stringify({ type: 'cancel', id: transfer.id } satisfies CancelMsg))
        } catch { /* noop */ }
      }
      const key = `${transfer.peerId}:${transfer.id}`
      inboundRef.current.delete(key)
      if (currentInboundIdRef.current.get(transfer.peerId) === transfer.id) {
        currentInboundIdRef.current.delete(transfer.peerId)
      }
      upsertTransfer(transfer.id, { status: 'failed', error: 'cancelled' })
    }
    // For outgoing, the sendFileToConn loop will spot the cancelledRef flag
    // on its next chunk iteration, send the cancel notification, and throw.
  }, [upsertTransfer])

  const resendTransfer = useCallback(async (transfer: Transfer) => {
    let file: File | null = null
    if (transfer.direction === 'out') {
      file = sourceFilesRef.current.get(transfer.id) ?? null
    } else if (transfer.direction === 'in' && transfer.downloadUrl) {
      try {
        const res = await fetch(transfer.downloadUrl)
        const blob = await res.blob()
        file = new File([blob], transfer.name, {
          type: transfer.mime || blob.type || 'application/octet-stream',
          lastModified: Date.now(),
        })
      } catch (e) {
        console.error('resend: failed to read blob', e)
      }
    }
    if (!file) return
    await sendFiles([file])
  }, [sendFiles])

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

  // Force a fresh connection attempt to a known peer. Closes any
  // half-open/dead connection first, then opens a new one. Used by the
  // refresh button on a paired-peer row.
  function reconnectPeer(peerId: string) {
    const peer = peerRef.current
    if (!peer || !peerId) return
    try { connectionsRef.current.get(peerId)?.close() } catch { /* noop */ }
    try { pendingConnsRef.current.get(peerId)?.close() } catch { /* noop */ }
    connectionsRef.current.delete(peerId)
    pendingConnsRef.current.delete(peerId)
    setError(null)
    upsertPeer(peerId, { status: 'connecting' })
    const conn = peer.connect(peerId, { reliable: true })
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
    resendTransfer,
    cancelTransfer,
    connect,
    reconnectPeer,
    disconnectPeer,
    disconnectAll,
    forgetPair,
    error,
  }
}
