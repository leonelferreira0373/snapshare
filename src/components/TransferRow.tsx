import { Transfer } from '../hooks/usePeer'
import { deviceName } from '../lib/deviceName'
import { useT } from '../lib/i18n'
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
  const { t } = useT()
  const pct = transfer.size > 0 ? Math.min(100, Math.round((transfer.bytes / transfer.size) * 100)) : 0
  const Icon = transfer.direction === 'in' ? ArrowDown : ArrowUp
  const peerName = deviceName(transfer.peerId, remotePlatform)
  const dirLabel = transfer.direction === 'in' ? t('from') : t('to')

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm shadow-zinc-900/[0.03] dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-none">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${transfer.direction === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'}`} />
        <span className="flex-1 truncate text-sm font-medium text-zinc-900 dark:text-white">{transfer.name}</span>
        <span className="shrink-0 text-xs text-zinc-500 dark:text-neutral-500">{formatBytes(transfer.size)}</span>
        {transfer.status === 'done' && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
        {transfer.status === 'failed' && <X className="h-4 w-4 text-red-500 dark:text-red-400" />}
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-neutral-800">
        <div
          className={`h-full transition-[width] duration-150 ${transfer.status === 'failed' ? 'bg-red-500' : 'bg-zinc-900 dark:bg-white'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-neutral-500">
        <span className="truncate">
          {transfer.status === 'done' ? t('complete') : `${pct}%`} · {dirLabel} {peerName}
        </span>
        {transfer.direction === 'in' && transfer.status === 'done' && transfer.downloadUrl && (
          <a
            href={transfer.downloadUrl}
            download={transfer.name}
            className="flex shrink-0 items-center gap-1 text-zinc-700 hover:text-zinc-900 dark:text-neutral-300 dark:hover:text-white"
          >
            <Download className="h-3 w-3" /> {t('save_again')}
          </a>
        )}
      </div>
    </div>
  )
}
