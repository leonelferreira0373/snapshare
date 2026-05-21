import { useState } from 'react'
import { Transfer } from '../hooks/usePeer'
import { deviceName } from '../lib/deviceName'
import { iconForFile } from '../lib/fileIcon'
import { useT } from '../lib/i18n'
import { ArrowDown, ArrowUp, Check, Download, X, Copy, Send } from 'lucide-react'

interface Props {
  transfer: Transfer
  remotePlatform?: string
  onResend?: (transfer: Transfer) => void
  canResend: boolean
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function TransferRow({ transfer, remotePlatform, onResend, canResend }: Props) {
  const { t } = useT()
  const [copied, setCopied] = useState(false)
  const [resending, setResending] = useState(false)
  const pct = transfer.size > 0 ? Math.min(100, Math.round((transfer.bytes / transfer.size) * 100)) : 0
  const FileIcon = iconForFile(transfer.name, transfer.mime)
  const DirIcon = transfer.direction === 'in' ? ArrowDown : ArrowUp
  const peerName = deviceName(transfer.peerId, remotePlatform)
  const dirLabel = transfer.direction === 'in' ? t('from') : t('to')
  const dirColor = transfer.direction === 'in'
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-sky-600 dark:text-sky-400'
  const dirBgColor = transfer.direction === 'in'
    ? 'bg-emerald-50 dark:bg-emerald-950/40'
    : 'bg-sky-50 dark:bg-sky-950/40'
  const dirSolid = transfer.direction === 'in' ? 'bg-emerald-500' : 'bg-sky-500'

  const isTextCopyable = transfer.status === 'done' && typeof transfer.textContent === 'string'
  const showResend = transfer.status === 'done' && canResend && onResend !== undefined

  async function copyText() {
    if (!transfer.textContent) return
    try {
      await navigator.clipboard.writeText(transfer.textContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* permission denied */ }
  }

  async function handleResend(e: React.MouseEvent) {
    e.stopPropagation()
    if (!onResend) return
    setResending(true)
    try { await Promise.resolve(onResend(transfer)) } finally { setResending(false) }
  }

  const baseClasses = 'flex flex-col gap-1.5 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm shadow-zinc-900/[0.03] dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-none'
  const interactiveClasses = isTextCopyable
    ? 'cursor-pointer transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:border-emerald-700/50 dark:hover:bg-emerald-950/20'
    : ''

  return (
    <div
      className={`${baseClasses} ${interactiveClasses}`}
      onClick={isTextCopyable ? copyText : undefined}
      role={isTextCopyable ? 'button' : undefined}
      title={isTextCopyable ? t('tap_to_copy') : undefined}
    >
      <div className="flex items-center gap-2.5">
        <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${dirBgColor}`}>
          <FileIcon className={`h-4 w-4 ${dirColor}`} />
          <span className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${dirSolid} dark:border-neutral-900`}>
            <DirIcon className="h-2.5 w-2.5 text-white" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{transfer.name}</p>
          <p className="text-[11px] text-zinc-500 dark:text-neutral-500">
            {formatBytes(transfer.size)} · {dirLabel} {peerName}
          </p>
        </div>
        {transfer.status === 'done' && <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
        {transfer.status === 'failed' && <X className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />}
      </div>

      {isTextCopyable && transfer.textContent && (
        <div className="rounded-md bg-zinc-50 px-2.5 py-1.5 dark:bg-neutral-900/80">
          <p className="line-clamp-2 break-words text-[11px] leading-snug text-zinc-600 dark:text-neutral-400">
            {transfer.textContent}
          </p>
        </div>
      )}

      {transfer.status !== 'done' && (
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-neutral-800">
          <div
            className={`h-full transition-[width] duration-150 ${transfer.status === 'failed' ? 'bg-red-500' : 'bg-zinc-900 dark:bg-white'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-neutral-500">
        <span className="truncate">
          {transfer.status === 'done'
            ? (isTextCopyable
              ? (copied
                ? <span className="text-emerald-600 dark:text-emerald-400">✓ {t('copied')}</span>
                : <span className="inline-flex items-center gap-1"><Copy className="h-3 w-3" /> {t('tap_to_copy')}</span>)
              : t('complete'))
            : `${pct}%`}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {transfer.direction === 'in' && transfer.status === 'done' && transfer.downloadUrl && (
            <a
              href={transfer.downloadUrl}
              download={transfer.name}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-zinc-700 hover:text-zinc-900 dark:text-neutral-300 dark:hover:text-white"
            >
              <Download className="h-3 w-3" /> {t('save_again')}
            </a>
          )}
          {showResend && (
            <button
              onClick={handleResend}
              disabled={resending}
              className="flex items-center gap-1 text-zinc-700 hover:text-zinc-900 disabled:opacity-50 dark:text-neutral-300 dark:hover:text-white"
            >
              <Send className="h-3 w-3" /> {t('resend')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
