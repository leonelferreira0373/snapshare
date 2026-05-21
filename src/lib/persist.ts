const KEY_PEER_ID = 'snapshare.peerId'
const KEY_LAST_PAIR = 'snapshare.lastPair'

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

export function loadLastPair(): LastPair | null {
  try {
    const raw = localStorage.getItem(KEY_LAST_PAIR)
    if (!raw) return null
    return JSON.parse(raw) as LastPair
  } catch { return null }
}

export function saveLastPair(pair: LastPair): void {
  try { localStorage.setItem(KEY_LAST_PAIR, JSON.stringify(pair)) } catch { /* noop */ }
}

export function clearLastPair(): void {
  try { localStorage.removeItem(KEY_LAST_PAIR) } catch { /* noop */ }
}
