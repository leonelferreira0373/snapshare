const ADJECTIVES = [
  'Swift', 'Bright', 'Calm', 'Brave', 'Quick', 'Sharp', 'Lucky', 'Quiet',
  'Bold', 'Warm', 'Cool', 'Wild', 'Royal', 'Silver', 'Golden', 'Crimson',
  'Cobalt', 'Misty', 'Sunny', 'Stormy', 'Lunar', 'Solar', 'Crystal', 'Velvet',
]

const ANIMALS = [
  'Otter', 'Fox', 'Hawk', 'Wolf', 'Lynx', 'Owl', 'Falcon', 'Panda',
  'Tiger', 'Lion', 'Bear', 'Eagle', 'Shark', 'Whale', 'Dolphin', 'Raven',
  'Heron', 'Crane', 'Stag', 'Puma', 'Cobra', 'Gecko', 'Mantis', 'Phoenix',
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function deviceName(peerId: string): string {
  const h = hash(peerId)
  const adj = ADJECTIVES[h % ADJECTIVES.length]
  const animal = ANIMALS[(h >> 8) % ANIMALS.length]
  const platform = detectPlatform()
  return `${adj}-${animal}-${platform}`
}

function detectPlatform(): string {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (/Android/.test(ua)) return 'Android'
  if (/Mac/.test(ua)) return 'Mac'
  if (/Win/.test(ua)) return 'PC'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Device'
}
