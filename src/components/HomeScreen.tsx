import { useEffect, useRef, useState, DragEvent } from 'react'
import { QRDisplay } from './QRDisplay'
import { QRScanner } from './QRScanner'
import { TransferRow } from './TransferRow'
import { formatCode, normalizeCode } from '../lib/codeFromId'
import { deviceName } from '../lib/deviceName'
import type { LastPair } from '../lib/persist'
import type { Transfer, PairedPeer, PeerStatus } from '../hooks/usePeer'
import {
  Loader2, Link2, AlertTriangle, Copy, Check, QrCode, ChevronDown, ChevronUp,
  Upload, LogOut, FileUp, RefreshCcw, X, Users, Inbox, Minimize2,
} from 'lucide-react'
import { BackToTop } from './BackToTop'

interface Props {
  myId: string | null
  status: PeerStatus
  peers: PairedPeer[]
  transfers: Transfer[]
  lastPairs: LastPair[]
  error: string | null
  onConnect: (id: string) => void
  onDisconnectPeer: (peerId: string) => void
  onDisconnectAll: () => void
  onForgetPair: (peerId: string) => void
  onSendFiles: (files: File[] | FileList) => Promise<void>
}

export function HomeScreen({
  myId, status, peers, transfers, lastPairs, error,
  onConnect, onDisconnectPeer, onDisconnectAll, onForgetPair, onSendFiles,
}: Props) {
  const [codeInput, setCodeInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [qrExpanded, setQrExpanded] = useState(false)
  const [showAllTransfers, setShowAllTransfers] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const TRANSFERS_PREVIEW_LIMIT = 6
  const anythingExpanded = qrExpanded || showAllTransfers

  function collapseAll() {
    setQrExpanded(false)
    setShowAllTransfers(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openPeers = peers.filter((p) => p.status === 'open')
  const hasOpenPeer = openPeers.length > 0
  const hasAnyPeer = peers.length > 0

  useEffect(() => {
    if (hasOpenPeer && pendingFiles.length > 0) {
      onSendFiles(pendingFiles)
      setPendingFiles([])
    }
  }, [hasOpenPeer, pendingFiles, onSendFiles])

  if (status === 'connecting' || !myId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-neutral-400">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Connecting…</p>
        </div>
      </div>
    )
  }

  const shortCode = myId.replace(/^snap-/, '')
  const url = `${window.location.origin}${window.location.pathname}?peer=${encodeURIComponent(myId)}`
  const connectedIds = new Set(peers.map((p) => p.peerId))
  const reconnectableLastPairs = lastPairs
    .filter((p) => p.peerId !== myId && !connectedIds.has(p.peerId))

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
      setCodeInput('')
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
    if (!hasOpenPeer) {
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

  // --- subcomponents (inline so they share state cleanly) ---

  const codeHeader = (
    <header className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Your code</p>
          <p className="font-mono text-2xl font-bold tracking-[0.2em] text-white">
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
          className="flex items-center gap-1 rounded-md bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-300 active:bg-neutral-700"
          aria-label="Toggle QR"
        >
          <QrCode className="h-3.5 w-3.5" />
          {qrExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {qrExpanded && (
        <div className="flex flex-col items-center gap-2 border-t border-neutral-800 pt-3">
          <QRDisplay value={url} size={220} />
          <p className="text-xs text-neutral-500">Scan from any other device</p>
        </div>
      )}
    </header>
  )

  const peersList = hasAnyPeer && (
    <section className="flex flex-col gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-2">
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          <Users className="h-3 w-3" />
          <span>Paired devices ({peers.length})</span>
        </div>
        {peers.length > 1 && (
          <button
            onClick={onDisconnectAll}
            className="rounded-md px-2 py-1 text-[10px] uppercase tracking-wider text-neutral-400 active:bg-neutral-900"
          >
            Disconnect all
          </button>
        )}
      </div>
      {peers.map((p) => {
        const reconnecting = p.status === 'reconnecting'
        const connecting = p.status === 'connecting'
        const dot = p.status === 'open'
          ? 'bg-emerald-400'
          : reconnecting
            ? 'bg-amber-400 animate-pulse'
            : 'bg-neutral-500 animate-pulse'
        return (
          <div key={p.peerId} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-900/60 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
              <p className="truncate text-sm font-medium">{deviceName(p.peerId, p.platform)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {(reconnecting || connecting) && (
                <Loader2 className="h-3 w-3 animate-spin text-neutral-500" />
              )}
              <button
                onClick={() => onDisconnectPeer(p.peerId)}
                className="rounded-md p-1 text-neutral-400 active:bg-neutral-800"
                aria-label="Disconnect"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )
      })}
    </section>
  )

  const recentChips = reconnectableLastPairs.length > 0 && (
    <section className="flex flex-col gap-1.5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Recent</p>
      {reconnectableLastPairs.map((pair) => (
        <div
          key={pair.peerId}
          className="flex items-center justify-between gap-2 rounded-xl border border-emerald-900/30 bg-emerald-950/20 px-3 py-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <RefreshCcw className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <p className="truncate text-xs text-emerald-200">
              <span className="font-medium">{deviceName(pair.peerId, pair.platform)}</span>
            </p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onConnect(pair.peerId)}
              className="rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-emerald-950 active:bg-emerald-400"
            >
              Pair
            </button>
            <button
              onClick={() => onForgetPair(pair.peerId)}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-800 text-neutral-400 active:bg-neutral-700"
              aria-label="Forget"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}
    </section>
  )

  const pairInput = (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(codeInput) }}
      className="flex flex-col gap-2"
    >
      <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
        {hasAnyPeer ? 'Add another device' : 'Enter code from other device'}
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
  )

  const errorBox = error && (
    <div className="flex items-start gap-2 rounded-lg border border-red-900/40 bg-red-950/30 p-3 text-xs text-red-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{error}</span>
    </div>
  )

  const dropZone = (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={hasOpenPeer ? handlePick : undefined}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed py-8 text-center transition-colors ${
        dragOver
          ? 'border-white bg-neutral-900 cursor-pointer'
          : hasOpenPeer
            ? 'border-neutral-800 hover:border-neutral-700 cursor-pointer'
            : 'border-neutral-900 opacity-50 cursor-not-allowed'
      }`}
    >
      <div className="rounded-full bg-neutral-900 p-2.5">
        <Upload className="h-5 w-5 text-neutral-300" />
      </div>
      <p className="text-sm font-medium">
        {hasOpenPeer
          ? openPeers.length === 1 ? 'Tap or drop files' : `Send to ${openPeers.length} devices`
          : 'Pair to send'}
      </p>
      <p className="text-xs text-neutral-500">
        {hasOpenPeer ? 'Anything — photos, videos, docs' : 'Connect a device first'}
      </p>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )

  const addFilesBtn = hasOpenPeer && (
    <button
      onClick={handlePick}
      className="flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-black active:bg-neutral-200"
    >
      <FileUp className="h-4 w-4" />
      {openPeers.length === 1 ? 'Add files' : `Send to ${openPeers.length} devices`}
    </button>
  )

  const pendingNote = pendingFiles.length > 0 && (
    <p className="rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
      {pendingFiles.length} file{pendingFiles.length === 1 ? '' : 's'} waiting for a device…
    </p>
  )

  const orderedTransfers = transfers.slice().reverse()
  const hiddenCount = Math.max(0, orderedTransfers.length - TRANSFERS_PREVIEW_LIMIT)
  const visibleTransfers = showAllTransfers ? orderedTransfers : orderedTransfers.slice(0, TRANSFERS_PREVIEW_LIMIT)

  const transfersPanel = (
    <section className="flex min-h-[280px] flex-col gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/30 p-3 lg:min-h-[calc(100vh-14rem)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-neutral-400" />
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-300">
            Transfers {transfers.length > 0 && <span className="text-neutral-500">({transfers.length})</span>}
          </p>
        </div>
        {anythingExpanded && (
          <button
            onClick={collapseAll}
            className="flex items-center gap-1 rounded-md border border-neutral-800 px-2 py-1 text-[10px] uppercase tracking-wider text-neutral-400 hover:text-neutral-200 active:bg-neutral-900"
          >
            <Minimize2 className="h-3 w-3" /> Collapse all
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {transfers.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-8 text-center">
            <p className="text-xs text-neutral-600">No transfers yet</p>
            <p className="text-[11px] text-neutral-700">Files sent or received will appear here</p>
          </div>
        ) : (
          <>
            {visibleTransfers.map((t) => {
              const peer = peers.find((p) => p.peerId === t.peerId)
              const lastPair = lastPairs.find((p) => p.peerId === t.peerId)
              return (
                <TransferRow
                  key={t.id}
                  transfer={t}
                  remotePlatform={peer?.platform ?? lastPair?.platform}
                />
              )
            })}
            {hiddenCount > 0 && (
              <button
                onClick={() => setShowAllTransfers((v) => !v)}
                className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/40 py-2.5 text-xs font-medium text-neutral-300 hover:border-neutral-700 hover:text-white active:bg-neutral-900"
              >
                {showAllTransfers ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" /> Show all ({orderedTransfers.length})
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 lg:px-6 lg:py-6">
      {/* MOBILE / NARROW layout (stacked, page scrolls) */}
      <div className="flex flex-col gap-3 lg:hidden">
        {codeHeader}
        {peersList}
        {transfersPanel}
        {addFilesBtn}
        {dropZone}
        {pendingNote}
        {recentChips}
        {pairInput}
        {errorBox}
      </div>

      {/* DESKTOP / WIDE layout (2 columns, transfers as main pane) */}
      <div className="hidden grid-cols-[minmax(320px,400px)_minmax(0,1fr)] gap-6 lg:grid">
        {/* LEFT — controls (sticky so the code stays visible while scrolling) */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
          {codeHeader}
          {peersList}
          {recentChips}
          {pairInput}
          {errorBox}
        </aside>

        {/* RIGHT — transfers main pane + drop zone */}
        <main className="flex flex-col gap-3">
          {dropZone}
          {addFilesBtn}
          {pendingNote}
          {transfersPanel}
        </main>
      </div>

      <QRScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDecode={handleScannerDecode}
      />

      <BackToTop />
    </div>
  )
}
