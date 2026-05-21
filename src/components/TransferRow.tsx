import { Transfer } from '../hooks/usePeer'
import { deviceName } from '../lib/deviceName'
import { ArrowDown, ArrowUp, Check, Download, X } from 'lucide-react'

interface Props {
  transfer: Transfer
  remotePlatform?: string
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function TransferRow({ transfer, remotePlatform }: Props) {
  const pct = transfer.size > 0 ? Math.min(100, Math.round((transfer.bytes / transfer.size) * 100)) : 0
  const Icon = transfer.direction === 'in' ? ArrowDown : ArrowUp
  const peerName = deviceName(transfer.peerId, remotePlatform)
  const dirLabel = transfer.direction === 'in' ? 'from' : 'to'

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${transfer.direction === 'in' ? 'text-emerald-400' : 'text-sky-400'}`} />
        <span className="flex-1 truncate text-sm font-medium">{transfer.name}</span>
        <span className="shrink-0 text-xs text-neutral-500">{formatBytes(transfer.size)}</span>
        {transfer.status === 'done' && <Check className="h-4 w-4 text-emerald-400" />}
        {transfer.status === 'failed' && <X className="h-4 w-4 text-red-400" />}
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-800">
        <div
          className={`h-full transition-[width] duration-150 ${transfer.status === 'failed' ? 'bg-red-500' : 'bg-white'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-neutral-500">
        <span className="truncate">
          {transfer.status === 'done' ? 'Complete' : `${pct}%`} · {dirLabel} {peerName}
        </span>
        {transfer.direction === 'in' && transfer.status === 'done' && transfer.downloadUrl && (
          <a
            href={transfer.downloadUrl}
            download={transfer.name}
            className="flex shrink-0 items-center gap-1 text-neutral-300 hover:text-white"
          >
            <Download className="h-3 w-3" /> Save again
          </a>
        )}
      </div>
    </div>
  )
}
