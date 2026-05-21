import { useEffect, useRef, useState, DragEvent } from 'react'
import { QRDisplay } from './QRDisplay'
import { QRScanner } from './QRScanner'
import { TransferRow } from './TransferRow'
import { formatCode, normalizeCode } from '../lib/codeFromId'
import { deviceName } from '../lib/deviceName'
import { useT } from '../lib/i18n'
import type { LastPair } from '../lib/persist'
import type { Transfer, PairedPeer, PeerStatus } from '../hooks/usePeer'
import {
  Loader2, Link2, AlertTriangle, Copy, Check, QrCode, ChevronDown, ChevronUp,
  Upload, LogOut, FileUp, RefreshCcw, X, Users, Inbox, Minimize2, ScanLine,
  ClipboardList, Sunrise,
} from 'lucide-react'
import { BackToTop } from './BackToTop'
import { GlobalDropOverlay } from './GlobalDropOverlay'
import { useClipboardCapture, loadClipboardEnabled, saveClipboardEnabled } from '../hooks/useClipboardCapture'
import { useWakeLock, loadWakeLockEnabled, saveWakeLockEnabled, isWakeLockSupported } from '../hooks/useWakeLock'

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
  onResend: (transfer: Transfer) => Promise<void>
  onCancel: (transfer: Transfer) => void
}

// Tailwind class shortcuts for dual-mode surfaces.
// Light mode = zinc palette + subtle shadows for lift. Dark = neutral palette, flat.
const SURFACE = 'bg-white border-zinc-200 shadow-sm shadow-zinc-900/[0.03] dark:bg-neutral-900/50 dark:border-neutral-800 dark:shadow-none'
const SURFACE_SOFT = 'bg-zinc-50 border-zinc-200 dark:bg-neutral-900/40 dark:border-neutral-800'
const SURFACE_INNER = 'bg-zinc-100 dark:bg-neutral-900/60'
const TEXT_BASE = 'text-zinc-900 dark:text-white'
const TEXT_MUTED = 'text-zinc-500 dark:text-neutral-400'
const TEXT_SOFT = 'text-zinc-400 dark:text-neutral-500'
const TEXT_FAINT = 'text-zinc-300 dark:text-neutral-600'
const PILL_BTN = 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 active:bg-zinc-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:active:bg-neutral-700'
const INPUT_CLS = 'border-zinc-200 bg-white text-zinc-900 placeholder-zinc-300 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-700 dark:focus:border-neutral-500 dark:focus:ring-0'

export function HomeScreen({
  myId, status, peers, transfers, lastPairs, error,
  onConnect, onDisconnectPeer, onDisconnectAll, onForgetPair, onSendFiles, onResend, onCancel,
}: Props) {
  const { t } = useT()

  const [codeInput, setCodeInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [qrExpanded, setQrExpanded] = useState(false)
  const [showAllTransfers, setShowAllTransfers] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [clipboardOn, setClipboardOn] = useState<boolean>(() => loadClipboardEnabled())
  const [clipboardError, setClipboardError] = useState<string | null>(null)
  const [stayAwakeOn, setStayAwakeOn] = useState<boolean>(() => loadWakeLockEnabled())
  const wakeLockSupported = isWakeLockSupported()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasOpenPeerRef = useRef(false)
  const onCapturedRef = useRef<(file: File) => void>(() => undefined)
  const onClipboardErrRef = useRef<(msg: string) => void>(() => undefined)

  useClipboardCapture(
    clipboardOn,
    (file) => onCapturedRef.current(file),
    (msg) => onClipboardErrRef.current(msg),
  )

  const TRANSFERS_PREVIEW_LIMIT = 6
  const anythingExpanded = showAllTransfers

  function collapseAll() {
    // Keep QR expansion untouched — it's a deliberate visibility choice.
    setShowAllTransfers(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openPeers = peers.filter((p) => p.status === 'open')
  const hasOpenPeer = openPeers.length > 0
  const hasAnyPeer = peers.length > 0

  // Hold the screen Wake Lock while paired AND the user opted in
  useWakeLock(stayAwakeOn && hasAnyPeer)

  function toggleStayAwake() {
    const next = !stayAwakeOn
    setStayAwakeOn(next)
    saveWakeLockEnabled(next)
  }

  // Keep refs synced with latest values so the clipboard callback can read them
  hasOpenPeerRef.current = hasOpenPeer
  onCapturedRef.current = (file: File) => {
    if (hasOpenPeerRef.current) onSendFiles([file])
    else setPendingFiles((prev) => [...prev, file])
  }
  onClipboardErrRef.current = (msg: string) => {
    setClipboardError(msg)
    setClipboardOn(false)
    saveClipboardEnabled(false)
  }

  function toggleClipboard() {
    const next = !clipboardOn
    setClipboardOn(next)
    saveClipboardEnabled(next)
    if (next) setClipboardError(null)
  }

  useEffect(() => {
    if (hasOpenPeer && pendingFiles.length > 0) {
      onSendFiles(pendingFiles)
      setPendingFiles([])
    }
  }, [hasOpenPeer, pendingFiles, onSendFiles])

  if (status === 'connecting' || !myId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className={`flex flex-col items-center gap-3 ${TEXT_MUTED}`}>
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">{t('connecting')}</p>
        </div>
      </div>
    )
  }

  const shortCode = myId.replace(/^snap-/, '')
  const url = `${window.location.origin}${window.location.pathname}?peer=${encodeURIComponent(myId)}`
  const connectedIds = new Set(peers.map((p) => p.peerId))
  const reconnectableLastPairs = lastPairs.filter((p) => p.peerId !== myId && !connectedIds.has(p.peerId))

  // Translate any code-based errors
  function translateError(raw: string): string {
    if (raw.startsWith('Code not found')) return t('err_code_not_found')
    if (raw.startsWith("Can't pair")) return t('err_self_pair')
    return raw
  }

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

  // ---------- subcomponents ----------

  const codeHeader = (
    <header className={`flex flex-col gap-3 rounded-2xl border p-3 ${SURFACE}`}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] uppercase tracking-[0.2em] ${TEXT_MUTED}`}>{t('your_code')}</p>
          <p className={`font-mono text-2xl font-bold tracking-[0.2em] ${TEXT_BASE}`}>
            {formatCode(shortCode)}
          </p>
        </div>
        <button
          onClick={copyCode}
          className={`flex h-9 w-9 items-center justify-center rounded-md ${PILL_BTN}`}
          aria-label={t('copy_code')}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
        <button
          onClick={() => setScannerOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400 dark:active:bg-emerald-400"
          aria-label={t('scan_qr_camera_screen')}
        >
          <ScanLine className="h-4 w-4" />
        </button>
        <button
          onClick={toggleClipboard}
          className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
            clipboardOn
              ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400'
              : PILL_BTN
          }`}
          aria-label={t('clipboard_capture')}
          title={clipboardOn ? t('clipboard_on') : t('clipboard_off')}
        >
          <ClipboardList className="h-4 w-4" />
        </button>
        {wakeLockSupported && (
          <button
            onClick={toggleStayAwake}
            className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
              stayAwakeOn
                ? 'bg-amber-500 text-white shadow-sm hover:bg-amber-600 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400'
                : PILL_BTN
            }`}
            aria-label={t('stay_awake')}
            title={stayAwakeOn ? t('stay_awake_on') : t('stay_awake_off')}
          >
            <Sunrise className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => setQrExpanded((v) => !v)}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs ${PILL_BTN}`}
          aria-label={t('toggle_qr')}
        >
          <QrCode className="h-3.5 w-3.5" />
          {qrExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {qrExpanded && (
        <div className="flex flex-col items-center gap-2 border-t border-zinc-200 pt-3 dark:border-neutral-800">
          <QRDisplay value={url} size={220} />
          <p className={`text-xs ${TEXT_MUTED}`}>{t('scan_other')}</p>
        </div>
      )}
    </header>
  )

  const peersList = hasAnyPeer && (
    <section className={`flex flex-col gap-2 rounded-2xl border p-2 ${SURFACE_SOFT}`}>
      <div className="flex items-center justify-between px-1 pt-1">
        <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] ${TEXT_MUTED}`}>
          <Users className="h-3 w-3" />
          <span>{t('paired_devices')} ({peers.length})</span>
        </div>
        {peers.length > 1 && (
          <button
            onClick={onDisconnectAll}
            className={`rounded-md px-2 py-1 text-[10px] uppercase tracking-wider ${TEXT_MUTED} hover:bg-zinc-200 dark:hover:bg-neutral-900`}
          >
            {t('disconnect_all')}
          </button>
        )}
      </div>
      {peers.map((p) => {
        const reconnecting = p.status === 'reconnecting'
        const connecting = p.status === 'connecting'
        const dot = p.status === 'open' ? 'bg-emerald-500 dark:bg-emerald-400'
          : reconnecting ? 'bg-amber-500 animate-pulse dark:bg-amber-400'
            : 'bg-zinc-400 animate-pulse dark:bg-neutral-500'
        return (
          <div key={p.peerId} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${SURFACE_INNER}`}>
            <div className="flex min-w-0 items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
              <p className={`truncate text-sm font-medium ${TEXT_BASE}`}>{deviceName(p.peerId, p.platform)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {(reconnecting || connecting) && <Loader2 className={`h-3 w-3 animate-spin ${TEXT_SOFT}`} />}
              <button
                onClick={() => onDisconnectPeer(p.peerId)}
                className={`rounded-md p-1 ${TEXT_MUTED} hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-neutral-800 dark:hover:text-white`}
                aria-label={t('disconnect')}
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
      <p className={`text-[10px] uppercase tracking-[0.2em] ${TEXT_MUTED}`}>{t('recent')}</p>
      {reconnectableLastPairs.map((pair) => (
        <div
          key={pair.peerId}
          className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 dark:border-emerald-900/30 dark:bg-emerald-950/20"
        >
          <div className="flex min-w-0 items-center gap-2">
            <RefreshCcw className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="truncate text-xs text-emerald-800 dark:text-emerald-200">
              <span className="font-medium">{deviceName(pair.peerId, pair.platform)}</span>
            </p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onConnect(pair.peerId)}
              className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 active:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400 dark:active:bg-emerald-400"
            >
              {t('pair')}
            </button>
            <button
              onClick={() => onForgetPair(pair.peerId)}
              className={`flex h-6 w-6 items-center justify-center rounded-md ${PILL_BTN}`}
              aria-label={t('forget')}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}
    </section>
  )

  const pairInput = (
    <form onSubmit={(e) => { e.preventDefault(); submit(codeInput) }} className="flex flex-col gap-2">
      <label className={`text-[10px] uppercase tracking-[0.2em] ${TEXT_MUTED}`}>
        {hasAnyPeer ? t('add_another_device') : t('enter_code_from_other')}
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
          className={`flex-1 rounded-lg border px-3 py-2.5 text-center font-mono text-lg tracking-[0.2em] uppercase outline-none ${INPUT_CLS}`}
        />
        <button
          type="submit"
          disabled={normalizeCode(codeInput).length !== 6}
          className="flex items-center gap-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 active:bg-zinc-700 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:shadow-none dark:bg-white dark:text-black dark:hover:bg-neutral-200 dark:active:bg-neutral-200 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500"
        >
          <Link2 className="h-4 w-4" /> {t('pair')}
        </button>
      </div>
    </form>
  )

  const errorBox = (error || clipboardError) && (
    <div className="flex flex-col gap-2">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>{translateError(error)}</span>
        </div>
      )}
      {clipboardError && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>{t('clipboard_permission')}</span>
        </div>
      )}
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
          ? 'border-emerald-500 bg-emerald-50 cursor-pointer dark:border-emerald-400 dark:bg-emerald-950/30'
          : hasOpenPeer
            ? 'border-zinc-300 bg-white hover:border-zinc-900 hover:bg-zinc-50 cursor-pointer dark:border-neutral-700 dark:bg-neutral-900/40 dark:hover:border-neutral-500 dark:hover:bg-neutral-900/60'
            : 'border-zinc-200 bg-zinc-50 opacity-60 cursor-not-allowed dark:border-neutral-900 dark:bg-transparent'
      }`}
    >
      <div className={`rounded-full p-2.5 ${SURFACE_INNER}`}>
        <Upload className={`h-5 w-5 ${TEXT_MUTED}`} />
      </div>
      <p className={`text-sm font-medium ${TEXT_BASE}`}>
        {hasOpenPeer
          ? openPeers.length === 1 ? t('tap_or_drop') : t('send_to_n_devices', { n: openPeers.length })
          : t('pair_to_send')}
      </p>
      <p className={`text-xs ${TEXT_MUTED}`}>
        {hasOpenPeer ? t('drop_hint') : t('connect_first')}
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
      className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 active:bg-zinc-700 dark:bg-white dark:text-black dark:shadow-none dark:hover:bg-neutral-200 dark:active:bg-neutral-200"
    >
      <FileUp className="h-4 w-4" />
      {openPeers.length === 1 ? t('add_files') : t('send_to_n_devices', { n: openPeers.length })}
    </button>
  )

  const pendingNote = pendingFiles.length > 0 && (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
      {pendingFiles.length} {pendingFiles.length === 1 ? t('files_waiting') : t('files_waiting_plural')}
    </p>
  )

  const orderedTransfers = transfers.slice().reverse()
  const hiddenCount = Math.max(0, orderedTransfers.length - TRANSFERS_PREVIEW_LIMIT)
  const visibleTransfers = showAllTransfers ? orderedTransfers : orderedTransfers.slice(0, TRANSFERS_PREVIEW_LIMIT)

  const transfersPanel = (
    <section className={`flex min-h-[280px] flex-col gap-2 rounded-2xl border p-3 ${SURFACE_SOFT} lg:min-h-[calc(100vh-14rem)]`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Inbox className={`h-4 w-4 ${TEXT_MUTED}`} />
          <p className={`text-xs font-semibold uppercase tracking-[0.15em] ${TEXT_BASE}`}>
            {t('transfers')} {transfers.length > 0 && <span className={TEXT_MUTED}>({transfers.length})</span>}
          </p>
        </div>
        {anythingExpanded && (
          <button
            onClick={collapseAll}
            className={`flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] uppercase tracking-wider ${TEXT_MUTED} hover:border-zinc-300 hover:text-zinc-900 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:text-neutral-200`}
          >
            <Minimize2 className="h-3 w-3" /> {t('collapse_all')}
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {transfers.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-8 text-center">
            <p className={`text-xs ${TEXT_SOFT}`}>{t('no_transfers')}</p>
            <p className={`text-[11px] ${TEXT_FAINT}`}>{t('transfers_hint')}</p>
          </div>
        ) : (
          <>
            {visibleTransfers.map((tr) => {
              const peer = peers.find((p) => p.peerId === tr.peerId)
              const lastPair = lastPairs.find((p) => p.peerId === tr.peerId)
              // Resend only on outgoing — it's a "send this again" action,
              // not a "forward" one. Only the original sender sees it.
              const canResend = tr.status === 'done' && tr.direction === 'out'
              return (
                <TransferRow
                  key={tr.id}
                  transfer={tr}
                  remotePlatform={peer?.platform ?? lastPair?.platform}
                  onResend={onResend}
                  canResend={canResend && hasOpenPeer}
                  onCancel={onCancel}
                />
              )
            })}
            {hiddenCount > 0 && (
              <button
                onClick={() => setShowAllTransfers((v) => !v)}
                className={`mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-2.5 text-xs font-medium ${TEXT_BASE} hover:border-zinc-300 hover:bg-zinc-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800`}
              >
                {showAllTransfers ? (
                  <><ChevronUp className="h-3.5 w-3.5" /> {t('show_less')}</>
                ) : (
                  <><ChevronDown className="h-3.5 w-3.5" /> {t('show_all')} ({orderedTransfers.length})</>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-4 lg:px-6 lg:pb-6 lg:pt-6">
      {/* Mobile */}
      <div className="flex flex-col gap-3 lg:hidden">
        {codeHeader}
        {pairInput}
        {peersList}
        {recentChips}
        {errorBox}
        {transfersPanel}
        {addFilesBtn}
        {dropZone}
        {pendingNote}
      </div>

      {/* Desktop */}
      <div className="hidden grid-cols-[minmax(320px,400px)_minmax(0,1fr)] gap-6 lg:grid">
        <aside className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
          {codeHeader}
          {peersList}
          {recentChips}
          {pairInput}
          {errorBox}
        </aside>
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

      <GlobalDropOverlay
        hasOpenPeer={hasOpenPeer}
        onFiles={(files) => onSendFiles(files)}
        pendingFiles={(files) => setPendingFiles((prev) => [...prev, ...files])}
      />

      <BackToTop />
    </div>
  )
}
