// Generate a short, readable peer ID like "K7M-Q3X" that doubles as the
// human-typed pairing code. PeerJS accepts custom IDs, so the code IS the ID.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I confusion

export function generateShortId(): string {
  const len = 6
  let id = ''
  const arr = new Uint32Array(len)
  crypto.getRandomValues(arr)
  for (let i = 0; i < len; i++) id += ALPHABET[arr[i] % ALPHABET.length]
  return id
}

export function formatCode(id: string): string {
  if (id.length !== 6) return id
  return `${id.slice(0, 3)}-${id.slice(3)}`
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}
