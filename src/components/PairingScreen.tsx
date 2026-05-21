import { useState } from 'react'
import { QRDisplay } from './QRDisplay'
import { codeFromId } from '../lib/codeFromId'
import { Loader2, Link2, AlertTriangle } from 'lucide-react'

interface Props {
  myId: string | null
  status: 'connecting' | 'ready' | 'error'
  error: string | null
  onConnect: (remoteId: string) => void
}

export function PairingScreen({ myId, status, error, onConnect }: Props) {
  const [manualPeerId, setManualPeerId] = useState('')

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

  const myCode = codeFromId(myId)
  const url = `${window.location.origin}${window.location.pathname}?peer=${encodeURIComponent(myId)}`

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const target = manualPeerId.trim()
    if (target) onConnect(target)
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-8 px-6 py-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">SnapShare</h1>
        <p className="text-sm text-neutral-400">Scan to pair this device</p>
      </header>

      <QRDisplay value={url} size={240} />

      <div className="flex flex-col items-center gap-1">
        <p className="text-xs uppercase tracking-widest text-neutral-500">Or enter code on the other device</p>
        <p className="font-mono text-4xl font-semibold tracking-[0.4em] text-white">{myCode}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-neutral-500">Connect to another device</label>
        <div className="flex gap-2">
          <input
            value={manualPeerId}
            onChange={(e) => setManualPeerId(e.target.value)}
            placeholder="Paste peer ID"
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm placeholder-neutral-600 outline-none focus:border-neutral-600"
          />
          <button
            type="submit"
            className="flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black active:bg-neutral-200"
          >
            <Link2 className="h-4 w-4" /> Pair
          </button>
        </div>
        <p className="text-[10px] text-neutral-600">
          Tip: just scan the QR — this field is a fallback.
        </p>
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
