import { useEffect, useRef, useState, DragEvent } from 'react'
import { QRDisplay } from './QRDisplay'
import { QRScanner } from './QRScanner'
import { TransferRow } from './TransferRow'
import { formatCode, normalizeCode } from '../lib/codeFromId'
import { deviceName } from '../lib/deviceName'
import type { LastPair } from '../lib/persist'
import type { Transfer, PeerMeta, PeerStatus } from '../hooks/usePeer'
import {
  Loader2, Link2, AlertTriangle, Copy, Check, QrCode, ChevronDown, ChevronUp,
  Upload, LogOut, FileUp, RefreshCcw, X,
} from 'lucide-react'

interface Props {
  myId: string | null
  status: PeerStatus
  remoteId: string | null
  remoteMeta: PeerMeta | null
  isConnected: boolean
  transfers: Transfer[]
  lastPair: LastPair | null
  error: string | null
  onConnect: (id: string) => void
  onDisconnect: () => void
  onForgetLastPair: () => void
  onSendFiles: (files: File[] | FileList) => Promise<void>
}

export function HomeScreen({
  myId, status, remoteId, remoteMeta, isConnected, transfers, lastPair, error,
  onConnect, onDisconnect, onForgetLastPair, onSendFiles,
}: Props) {
  const [codeInput, setCodeInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [qrExpanded, setQrExpanded] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const paired = status === 'paired' || status === 'reconnecting'
  const reconnecting = status === 'reconnecting'

  useEffect(() => {
    if (isConnected && pendingFiles.length > 0) {
      onSendFiles(pendingFiles)
      setPendingFiles([])
    }
  }, [isConnected, pendingFiles, onSendFiles])

  if (status === 'connecting' || !myId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-neutral-400">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Connecting…</p>
        </div>
      </div>
    )
  }

  const shortCode = myId.replace(/^snap-/, '')
  const url = `${window.location.origin}${window.location.pathname}?peer=${encodeURIComponent(myId)}`
  const remoteName = remoteId ? deviceName(remoteId, remoteMeta?.platform) : null
  const lastPairName = lastPair ? deviceName(lastPair.peerId, lastPair.platform) : null
  const showReconnectChip = !paired && lastPair && lastPair.peerId !== myId

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(formatCode(shortCode))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* noop */ }
  }

  function handleCodeInputChange(raw: string) {
    const cleaned = normalizeCode(raw).slice(0, 6)
    setCodeInput(formatCode(cleaned))
  }

  function submit(raw: string) {
    const cleaned = normalizeCode(raw)
    if (cleaned.length === 6) {
      onConnect(`snap-${cleaned}`)
    }
  }

  function handleScannerDecode(text: string) {
    try {
      const u = new URL(text)
      const peer = u.searchParams.get('peer')
      if (peer) { onConnect(peer); return }
    } catch { /* not a URL */ }
    submit(text)
  }

  function handlePick() { fileInputRef.current?.click() }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const arr = Array.from(files)
    if (!isConnected) {
      setPendingFiles((prev) => [...prev, ...arr])
      return
    }
    onSendFiles(arr)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col px-4 py-4">
      {/* Header: always-visible code + pair status */}
      <header className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQrExpanded((v) => !v)}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white"
            aria-label="Show QR"
          >
            <QRDisplay value={url} size={48} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Your code</p>
            <p className="font-mono text-xl font-bold tracking-[0.2em] text-white">
              {formatCode(shortCode)}
            </p>
          </div>
          <button
            onClick={copyCode}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-800 text-neutral-300 active:bg-neutral-700"
            aria-label="Copy code"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setQrExpanded((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-800 text-neutral-300 active:bg-neutral-700"
            aria-label="Toggle QR"
          >
            {qrExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {qrExpanded && (
          <div className="flex flex-col items-center gap-2 border-t border-neutral-800 pt-3">
            <QRDisplay value={url} size={200} />
            <p className="text-xs text-neutral-500">Scan from the other device</p>
          </div>
        )}

        {/* Pair status row */}
        <div className="flex items-center justify-between gap-2 border-t border-neutral-800 pt-3">
          {paired && remoteName ? (
            <>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                  {reconnecting ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-400">
                      <Loader2 className="h-3 w-3 animate-spin" /> Reconnecting…
                    </span>
                  ) : 'Paired with'}
                </p>
                <p className="truncate text-sm font-medium">{remoteName}</p>
              </div>
              <button
                onClick={onDisconnect}
                className="flex items-center gap-1 rounded-lg border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300 active:bg-neutral-900"
              >
                <LogOut className="h-3.5 w-3.5" /> Disconnect
              </button>
            </>
          ) : (
            <p className="text-xs text-neutral-500">Share your code or scan the other device's</p>
          )}
        </div>
      </header>

      {/* Reconnect-to-last chip */}
      {showReconnectChip && lastPair && lastPairName && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-emerald-900/30 bg-emerald-950/20 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <RefreshCcw className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <p className="truncate text-xs text-emerald-200">
              Reconnect to <span className="font-medium">{lastPairName}</span>?
            </p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onConnect(lastPair.peerId)}
              className="rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-emerald-950 active:bg-emerald-400"
            >
              Pair
            </button>
            <button
              onClick={onForgetLastPair}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-800 text-neutral-400 active:bg-neutral-700"
              aria-label="Forget"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Pair input — shown when not paired */}
      {!paired && (
        <form
          onSubmit={(e) => { e.preventDefault(); submit(codeInput) }}
          className="mt-3 flex flex-col gap-2"
        >
          <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Enter code from other device
          </label>
          <div className="flex gap-2">
            <input
              value={codeInput}
              onChange={(e) => handleCodeInputChange(e.target.value)}
              placeholder="ABC-XYZ"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-center font-mono text-lg tracking-[0.2em] uppercase placeholder-neutral-700 outline-none focus:border-neutral-500"
            />
            <button
              type="submit"
              disabled={normalizeCode(codeInput).length !== 6}
              className="flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black active:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              <Link2 className="h-4 w-4" /> Pair
            </button>
          </div>
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/40 py-2.5 text-xs font-medium text-neutral-200 active:bg-neutral-900"
          >
            <QrCode className="h-4 w-4" /> Scan QR (camera or screen)
          </button>
        </form>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-900/40 bg-red-950/30 p-3 text-xs text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={paired ? handlePick : undefined}
        className={`mt-3 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed py-8 text-center transition-colors ${
          dragOver
            ? 'border-white bg-neutral-900 cursor-pointer'
            : paired
              ? 'border-neutral-800 hover:border-neutral-700 cursor-pointer'
              : 'border-neutral-900 opacity-50 cursor-not-allowed'
        }`}
      >
        <div className="rounded-full bg-neutral-900 p-2.5">
          <Upload className="h-5 w-5 text-neutral-300" />
        </div>
        <p className="text-sm font-medium">{paired ? 'Tap or drop files' : 'Pair to send'}</p>
        <p className="text-xs text-neutral-500">{paired ? 'Anything — photos, videos, docs' : 'Connect a device first'}</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {paired && (
        <button
          onClick={handlePick}
          className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-black active:bg-neutral-200"
        >
          <FileUp className="h-4 w-4" /> Add files
        </button>
      )}

      {pendingFiles.length > 0 && (
        <p className="mt-2 rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          {pendingFiles.length} file{pendingFiles.length === 1 ? '' : 's'} waiting for reconnect…
        </p>
      )}

      {/* Transfers — always visible */}
      <div className="mt-4 flex flex-col gap-2 overflow-y-auto pb-6">
        {transfers.length === 0 ? (
          <p className="py-4 text-center text-xs text-neutral-600">No transfers yet</p>
        ) : (
          <>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Transfers</p>
            {transfers.slice().reverse().map((t) => (
              <TransferRow key={t.id} transfer={t} />
            ))}
          </>
        )}
      </div>

      <QRScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDecode={handleScannerDecode}
      />
    </div>
  )
}
