import { useEffect, useRef, useState, useCallback } from 'react'
import { DataConnection } from 'peerjs'

export type TransferDirection = 'in' | 'out'
export type TransferStatus = 'pending' | 'transferring' | 'done' | 'failed'

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

interface MetaMsg {
  type: 'meta'
  id: string
  name: string
  size: number
  mime: string
}

interface EofMsg {
  type: 'eof'
  id: string
}

type ControlMsg = MetaMsg | EofMsg

const CHUNK_SIZE = 16 * 1024 // 16 KB
const HIGH_WATER = 16 * 1024 * 1024 // 16 MB
const LOW_WATER = 1 * 1024 * 1024 // 1 MB

export function useFileTransfer(connection: DataConnection | null) {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const inboundBuffers = useRef<Map<string, { meta: MetaMsg; chunks: Uint8Array[]; received: number }>>(new Map())
  const currentInboundId = useRef<string | null>(null)

  const upsert = useCallback((id: string, patch: Partial<Transfer>) => {
    setTransfers((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      if (idx === -1) return prev
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }, [])

  useEffect(() => {
    if (!connection) return

    const onData = (data: unknown) => {
      if (typeof data === 'string') {
        let msg: ControlMsg
        try { msg = JSON.parse(data) as ControlMsg } catch { return }
        if (msg.type === 'meta') {
          inboundBuffers.current.set(msg.id, { meta: msg, chunks: [], received: 0 })
          currentInboundId.current = msg.id
          setTransfers((prev) => [
            ...prev,
            { id: msg.id, direction: 'in', name: msg.name, size: msg.size, mime: msg.mime, bytes: 0, status: 'transferring' },
          ])
        } else if (msg.type === 'eof') {
          const entry = inboundBuffers.current.get(msg.id)
          if (!entry) return
          const blob = new Blob(entry.chunks as BlobPart[], { type: entry.meta.mime || 'application/octet-stream' })
          const url = URL.createObjectURL(blob)
          upsert(msg.id, { status: 'done', bytes: entry.meta.size, downloadUrl: url })
          // Auto-trigger download so file lands in Downloads / Gallery
          const a = document.createElement('a')
          a.href = url
          a.download = entry.meta.name
          a.rel = 'noopener'
          document.body.appendChild(a)
          a.click()
          a.remove()
          inboundBuffers.current.delete(msg.id)
          if (currentInboundId.current === msg.id) currentInboundId.current = null
        }
        return
      }

      // Binary chunk — belongs to current inbound transfer
      const id = currentInboundId.current
      if (!id) return
      const entry = inboundBuffers.current.get(id)
      if (!entry) return
      const buf = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array((data as ArrayBufferView).buffer)
      entry.chunks.push(buf)
      entry.received += buf.byteLength
      upsert(id, { bytes: entry.received })
    }

    connection.on('data', onData)
    return () => {
      connection.off('data', onData)
    }
  }, [connection, upsert])

  const sendFile = useCallback(async (file: File) => {
    if (!connection || !connection.open) return
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
    connection.send(JSON.stringify(meta))

    const rawDc = (connection as unknown as { dataChannel?: RTCDataChannel }).dataChannel
    if (rawDc) {
      rawDc.bufferedAmountLowThreshold = LOW_WATER
    }

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
      connection.send(buf)
      offset += buf.byteLength
      sent += buf.byteLength
      if (sent % (CHUNK_SIZE * 32) === 0 || offset >= file.size) {
        upsert(id, { bytes: sent })
      }
    }

    connection.send(JSON.stringify({ type: 'eof', id } satisfies EofMsg))
    upsert(id, { bytes: file.size, status: 'done' })
  }, [connection, upsert])

  const sendFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files)
    for (const f of arr) {
      await sendFile(f)
    }
  }, [sendFile])

  return { transfers, sendFile, sendFiles }
}
