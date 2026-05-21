import { QRCodeSVG } from 'qrcode.react'

interface Props {
  value: string
  size?: number
}

export function QRDisplay({ value, size = 256 }: Props) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg shadow-zinc-900/10 dark:border-transparent dark:shadow-2xl dark:shadow-black/40">
      <QRCodeSVG value={value} size={size} level="M" includeMargin={false} />
    </div>
  )
}
