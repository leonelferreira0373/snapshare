import { useRef, useState, DragEvent } from 'react'
import { DataConnection } from 'peerjs'
import { useFileTransfer } from '../hooks/useFileTransfer'
import { TransferRow } from './TransferRow'
import { deviceName } from '../lib/deviceName'
import { Upload, LogOut, FileUp } from 'lucide-react'

interface Props {
  connection: DataConnection
  remoteId: string
  onDisconnect: () => void
}

export function SessionScreen({ connection, remoteId, onDisconnect }: Props) {
  const { transfers, sendFiles } = useFileTransfer(connection)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const remoteName = deviceName(remoteId)

  function handlePick() {
    fileInputRef.current?.click()
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    sendFiles(files)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col px-4 py-5">
      <header className="flex items-center justify-between gap-3 pb-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-neutral-500">Paired with</p>
          <p className="truncate text-base font-medium">{remoteName}</p>
        </div>
        <button
          onClick={onDisconnect}
          className="flex items-center gap-1 rounded-lg border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300 active:bg-neutral-900"
        >
          <LogOut className="h-3.5 w-3.5" /> Disconnect
        </button>
      </header>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={handlePick}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-12 text-center transition-colors ${
          dragOver ? 'border-white bg-neutral-900' : 'border-neutral-800 hover:border-neutral-700'
        }`}
      >
        <div className="rounded-full bg-neutral-900 p-3">
          <Upload className="h-6 w-6 text-neutral-300" />
        </div>
        <p className="text-sm font-medium">Tap or drop files</p>
        <p className="text-xs text-neutral-500">Anything — photos, videos, docs</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <button
        onClick={handlePick}
        className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-black active:bg-neutral-200"
      >
        <FileUp className="h-4 w-4" /> Add files
      </button>

      <div className="mt-5 flex flex-col gap-2 overflow-y-auto pb-6">
        {transfers.length === 0 && (
          <p className="py-6 text-center text-xs text-neutral-600">No transfers yet</p>
        )}
        {transfers.slice().reverse().map((t) => (
          <TransferRow key={t.id} transfer={t} />
        ))}
      </div>
    </div>
  )
}
