import { QRCodeSVG } from 'qrcode.react'

interface Props {
  value: string
  size?: number
}

export function QRDisplay({ value, size = 256 }: Props) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-2xl shadow-black/40">
      <QRCodeSVG value={value} size={size} level="M" includeMargin={false} />
    </div>
  )
}
