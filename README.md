# SnapShare

Free, instant, lossless file transfer between any two devices. Open the same URL on both, scan the QR (or type the 6-character code), drop your files.

🟢 **Live:** [snapshare-share.vercel.app](https://snapshare-share.vercel.app)

## What it is

- Phone ↔ PC ↔ phone ↔ tablet — any browser pair
- WebRTC DataChannel — bytes never touch a server
- No accounts, no install, no quality loss
- Free forever (free Vercel + free PeerJS broker + free public STUN)

## How it works

1. Open the URL on Device A → you see a QR + a 6-char code (like `K7M-Q3X`)
2. Open the URL on Device B → scan A's QR with the camera (or type the code)
3. Once paired, drag/drop files on either side — they fly straight to the other device's Downloads

## Stack

- Vite + React + TypeScript (static build, no server)
- [PeerJS](https://peerjs.com) for WebRTC signaling (uses their free public broker)
- Tailwind CSS + Lucide icons

## Limits

- Same WiFi: 100% reliable
- Different networks: ~95% via STUN; the rare NAT edge case can't relay (would need a paid TURN server)
- Files held in browser memory — fine for typical photos/videos; large multi-GB files risky on mobile
- iOS Safari downloads land in the Files app, not Photos (Android lands in Downloads → Gallery picks up)

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and the LAN IP shown (use that one on your phone).
