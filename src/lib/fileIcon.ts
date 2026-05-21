import type { LucideIcon } from 'lucide-react'
import {
  FileText, FileCode, FileImage, FileVideo, FileAudio, FileArchive,
  FileSpreadsheet, ClipboardList, File as FileIconDefault,
} from 'lucide-react'

const EXT_MAP: Record<string, LucideIcon> = {
  // Audio
  mp3: FileAudio, wav: FileAudio, flac: FileAudio, m4a: FileAudio, ogg: FileAudio, aac: FileAudio, opus: FileAudio,
  // Video
  mp4: FileVideo, mov: FileVideo, webm: FileVideo, mkv: FileVideo, avi: FileVideo, m4v: FileVideo, '3gp': FileVideo,
  // Image
  jpg: FileImage, jpeg: FileImage, png: FileImage, gif: FileImage, webp: FileImage, svg: FileImage, bmp: FileImage,
  heic: FileImage, heif: FileImage, avif: FileImage, ico: FileImage,
  // Documents
  pdf: FileText, doc: FileText, docx: FileText, odt: FileText, rtf: FileText, txt: FileText, md: FileText,
  // Spreadsheets
  xls: FileSpreadsheet, xlsx: FileSpreadsheet, csv: FileSpreadsheet, ods: FileSpreadsheet,
  // Archives
  zip: FileArchive, rar: FileArchive, '7z': FileArchive, tar: FileArchive, gz: FileArchive, bz2: FileArchive, xz: FileArchive,
  // Code
  js: FileCode, ts: FileCode, jsx: FileCode, tsx: FileCode, html: FileCode, css: FileCode, scss: FileCode,
  json: FileCode, xml: FileCode, yml: FileCode, yaml: FileCode, py: FileCode, java: FileCode, c: FileCode,
  cpp: FileCode, go: FileCode, rs: FileCode, rb: FileCode, php: FileCode, sh: FileCode, sql: FileCode,
  kt: FileCode, swift: FileCode, dart: FileCode,
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  if (i < 0) return ''
  return name.slice(i + 1).toLowerCase()
}

export function iconForFile(name: string, mime?: string): LucideIcon {
  const ext = extOf(name)
  if (ext && EXT_MAP[ext]) return EXT_MAP[ext]
  if (mime) {
    if (mime.startsWith('audio/')) return FileAudio
    if (mime.startsWith('video/')) return FileVideo
    if (mime.startsWith('image/')) return FileImage
    if (mime === 'text/plain') return FileText
    if (mime.startsWith('text/') || mime.includes('json') || mime.includes('xml')) return FileCode
    if (mime.includes('zip') || mime.includes('compressed') || mime.includes('tar')) return FileArchive
    if (mime.includes('spreadsheet') || mime.includes('excel')) return FileSpreadsheet
    if (mime.includes('pdf') || mime.includes('document') || mime.includes('msword')) return FileText
  }
  return FileIconDefault
}

export const ClipboardIcon = ClipboardList
