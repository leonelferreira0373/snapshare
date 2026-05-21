export function codeFromId(peerId: string): string {
  let h = 0
  for (let i = 0; i < peerId.length; i++) h = ((h << 5) - h + peerId.charCodeAt(i)) | 0
  const n = Math.abs(h) % 10000
  return n.toString().padStart(4, '0')
}
