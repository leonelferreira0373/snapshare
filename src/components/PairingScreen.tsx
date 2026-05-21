import { useState } from 'react'
import { QRDisplay } from './QRDisplay'
import { formatCode, normalizeCode } from '../lib/codeFromId'
import { Loader2, Link2, AlertTriangle, ScanLine } from 'lucide-react'

interface Props {
  myId: string | null
  status: 'connecting' | 'ready' | 'error'
  error: string | null
  onConnect: (remoteId: string) => void
}

export function PairingScreen({ myId, status, error, onConnect }: Props) {
  const [codeInput, setCodeInput] = useState('')

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

  // myId is like "snap-K7MQ3X" — strip prefix for display
  const shortCode = myId.replace(/^snap-/, '')
  const url = `${window.location.origin}${window.location.pathname}?peer=${encodeURIComponent(myId)}`

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleaned = normalizeCode(codeInput)
    if (cleaned.length === 6) {
      onConnect(`snap-${cleaned}`)
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-start gap-6 px-6 py-8">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">SnapShare</h1>
        <p className="text-xs text-neutral-500">Share files between any two devices</p>
      </header>

      <div className="flex flex-col items-center gap-3">
        <QRDisplay value={url} size={220} />
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <ScanLine className="h-3.5 w-3.5" />
          <span>Scan with the other device's camera</span>
        </div>
      </div>

      <div className="flex w-full flex-col items-center gap-1.5 rounded-2xl border border-neutral-800 bg-neutral-900/50 px-4 py-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">or type this code</p>
        <p className="font-mono text-3xl font-bold tracking-[0.25em] text-white">
          {formatCode(shortCode)}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
        <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          Enter code from other device
        </label>
        <div className="flex gap-2">
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="ABC-XYZ"
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-center font-mono text-lg tracking-[0.2em] placeholder-neutral-700 outline-none focus:border-neutral-500"
          />
          <button
            type="submit"
            disabled={normalizeCode(codeInput).length !== 6}
            className="flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black active:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-500"
          >
            <Link2 className="h-4 w-4" /> Pair
          </button>
        </div>
      </form>

      {error && (
        <div className="flex w-full items-start gap-2 rounded-lg border border-red-900/40 bg-red-950/30 p-3 text-xs text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
