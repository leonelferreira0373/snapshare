import { useState } from 'react'
import { QRDisplay } from './QRDisplay'
import { QRScanner } from './QRScanner'
import { formatCode, normalizeCode } from '../lib/codeFromId'
import { Loader2, Link2, AlertTriangle, ScanLine, Copy, Check, QrCode } from 'lucide-react'

interface Props {
  myId: string | null
  status: 'connecting' | 'ready' | 'error'
  error: string | null
  onConnect: (remoteId: string) => void
}

export function PairingScreen({ myId, status, error, onConnect }: Props) {
  const [codeInput, setCodeInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit(codeInput)
  }

  function submit(raw: string) {
    const cleaned = normalizeCode(raw)
    if (cleaned.length === 6) {
      onConnect(`snap-${cleaned}`)
    }
  }

  function handleCodeInputChange(raw: string) {
    // Auto-format: uppercase, strip non-alphanumeric, cap at 6 chars, insert hyphen after 3
    const cleaned = normalizeCode(raw).slice(0, 6)
    setCodeInput(formatCode(cleaned))
  }

  function handleScannerDecode(text: string) {
    // Accept either a full URL with ?peer= or just the code
    try {
      const u = new URL(text)
      const peer = u.searchParams.get('peer')
      if (peer) {
        onConnect(peer)
        return
      }
    } catch {
      /* not a URL — fall through */
    }
    submit(text)
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(formatCode(shortCode))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked — silent */
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-start gap-5 px-6 py-7">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">SnapShare</h1>
        <p className="text-xs text-neutral-500">Share files between any two devices</p>
      </header>

      <div className="flex flex-col items-center gap-2">
        <QRDisplay value={url} size={200} />
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <ScanLine className="h-3.5 w-3.5" />
          <span>Scan from the other device</span>
        </div>
      </div>

      <button
        onClick={copyCode}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 px-4 py-3 transition-colors active:bg-neutral-900"
      >
        <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">your code</span>
        <span className="font-mono text-2xl font-bold tracking-[0.25em] text-white">
          {formatCode(shortCode)}
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-800 text-neutral-300">
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </span>
      </button>

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
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

      {error && (
        <div className="flex w-full items-start gap-2 rounded-lg border border-red-900/40 bg-red-950/30 p-3 text-xs text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <QRScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDecode={handleScannerDecode}
      />
    </div>
  )
}
