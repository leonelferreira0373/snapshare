import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'
import { X, Camera, Monitor, AlertTriangle } from 'lucide-react'
import { useT } from '../lib/i18n'

interface Props {
  open: boolean
  onClose: () => void
  onDecode: (text: string) => void
}

type Source = 'camera' | 'screen'

export function QRScanner({ open, onClose, onDecode }: Props) {
  const { t } = useT()
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const [source, setSource] = useState<Source>('camera')
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!open) return
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    setSource(isMobile ? 'camera' : 'screen')
  }, [open])

  useEffect(() => {
    if (!open) { stop(); return }
    start(source)
    return stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source])

  async function start(src: Source) {
    setError(null)
    setStarting(true)
    stop()
    const video = videoRef.current
    if (!video) { setStarting(false); return }

    try {
      if (src === 'camera') {
        const scanner = new QrScanner(
          video,
          (result) => { onDecode(result.data); stop(); onClose() },
          { preferredCamera: 'environment', highlightScanRegion: true, returnDetailedScanResult: true }
        )
        scannerRef.current = scanner
        await scanner.start()
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 10 },
          audio: false,
        })
        screenStreamRef.current = stream
        video.srcObject = stream
        await video.play()
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!
        let stopped = false
        const tick = async () => {
          if (stopped || !video.videoWidth) {
            if (!stopped) requestAnimationFrame(tick)
            return
          }
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0)
          try {
            const result = await QrScanner.scanImage(canvas, { returnDetailedScanResult: true })
            if (result?.data) {
              onDecode(result.data); stopped = true; stop(); onClose(); return
            }
          } catch { /* not found this frame */ }
          if (!stopped) requestAnimationFrame(tick)
        }
        ;(screenStreamRef as unknown as { stopTick?: () => void }).stopTick = () => { stopped = true }
        requestAnimationFrame(tick)
      }
    } catch (err) {
      const e = err as Error
      setError(e.message || 'Unable to start scanner')
    } finally {
      setStarting(false)
    }
  }

  function stop() {
    scannerRef.current?.stop()
    scannerRef.current?.destroy()
    scannerRef.current = null
    const stopper = (screenStreamRef as unknown as { stopTick?: () => void }).stopTick
    if (stopper) { stopper(); delete (screenStreamRef as unknown as { stopTick?: () => void }).stopTick }
    screenStreamRef.current?.getTracks().forEach((tr) => tr.stop())
    screenStreamRef.current = null
    const v = videoRef.current
    if (v) v.srcObject = null
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur">
      <header className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-medium text-white">{t('scan_qr_code')}</p>
        <button
          onClick={() => { stop(); onClose() }}
          className="rounded-full bg-neutral-800 p-2 text-white"
          aria-label={t('close')}
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex justify-center gap-2 px-4 pb-3">
        <button
          onClick={() => setSource('camera')}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            source === 'camera' ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-300'
          }`}
        >
          <Camera className="h-3.5 w-3.5" /> {t('camera')}
        </button>
        <button
          onClick={() => setSource('screen')}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            source === 'screen' ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-300'
          }`}
        >
          <Monitor className="h-3.5 w-3.5" /> {t('screen')}
        </button>
      </div>

      <div className="relative mx-4 flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-neutral-950">
        <video ref={videoRef} playsInline muted className="h-full w-full object-contain" />
        {starting && <p className="absolute text-xs text-neutral-400">{t('starting')} {source === 'camera' ? t('camera').toLowerCase() : t('screen').toLowerCase()}…</p>}
      </div>

      <div className="px-4 py-4 text-center text-xs text-neutral-500">
        {source === 'camera' ? t('camera_hint') : t('screen_hint')}
      </div>

      {error && (
        <div className="mx-4 mb-4 flex items-start gap-2 rounded-lg border border-red-900/40 bg-red-950/30 p-3 text-xs text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
