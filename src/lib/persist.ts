const KEY_PEER_ID = 'snapshare.peerId'
const KEY_LAST_PAIRS = 'snapshare.lastPairs'
const MAX_REMEMBERED = 8

export interface LastPair {
  peerId: string
  platform?: string
  at: number
}

export function loadPeerId(): string | null {
  try { return localStorage.getItem(KEY_PEER_ID) } catch { return null }
}

export function savePeerId(id: string): void {
  try { localStorage.setItem(KEY_PEER_ID, id) } catch { /* noop */ }
}

export function loadLastPairs(): LastPair[] {
  try {
    const raw = localStorage.getItem(KEY_LAST_PAIRS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((p): p is LastPair => p && typeof p.peerId === 'string')
  } catch { return [] }
}

export function saveLastPairs(pairs: LastPair[]): void {
  try {
    const trimmed = pairs.slice(0, MAX_REMEMBERED)
    localStorage.setItem(KEY_LAST_PAIRS, JSON.stringify(trimmed))
  } catch { /* noop */ }
}

export function upsertLastPair(pair: LastPair): LastPair[] {
  const existing = loadLastPairs()
  const filtered = existing.filter((p) => p.peerId !== pair.peerId)
  const next = [pair, ...filtered].slice(0, MAX_REMEMBERED)
  saveLastPairs(next)
  return next
}

export function removeLastPair(peerId: string): LastPair[] {
  const next = loadLastPairs().filter((p) => p.peerId !== peerId)
  saveLastPairs(next)
  return next
}

export function clearLastPairs(): void {
  try { localStorage.removeItem(KEY_LAST_PAIRS) } catch { /* noop */ }
}
