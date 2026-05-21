# SnapShare — Design Spec

**Date:** 2026-05-21
**Owner:** Leonel Ferreira
**Status:** Approved for build

## Goal

Free, instant, lossless image/file transfer between phone and PC paired via QR code. Zero install, zero accounts, browser-only. Files land in the device's Downloads folder (which the OS Gallery indexes), preserving original bytes.

## Non-goals (v1)

- Accounts, history, sync, cloud backup
- Folder transfer, transfer resume on disconnect
- E2E password on top of room code
- Native apps
- Cross-network fallback via TURN (paid)

## Architecture

```
   PC browser                                 Phone browser
       |                                            |
       |   1. open URL → get peerId + room code     |
       |--------------------------------------------|
       |                                            |
       |   2. show QR (URL + peerId)                |
       |                                            |
       |   3. scan QR → open URL with ?peer=xxx     |
       |                                            |
       |   4. WebRTC offer/answer via PeerJS broker |
       |<------------------------------------------>|
       |                                            |
       |   5. DataChannel open — P2P                |
       |  ============= file bytes ===============  |
       |                                            |
```

- **Frontend:** Vite + React + TypeScript, single-page
- **WebRTC:** `peerjs` library, default public broker (`0.peerjs.com`)
- **Signaling:** PeerJS broker — used only for the initial offer/answer handshake
- **Data path:** WebRTC DataChannel — bytes never touch a server
- **Hosting:** Vercel free tier (static deploy from GitHub)
- **STUN:** Google's free public STUN servers (PeerJS default)

## Components

### `App.tsx`
Top-level. Owns peer state, paired state. Renders one of: `<PairingScreen>` or `<SessionScreen>`.

### `usePeer()` hook
Wraps PeerJS. Exposes: `myId`, `connection`, `connect(remoteId)`, `onData`, `send(chunk)`. Auto-creates peer on mount.

### `<PairingScreen>`
- Large centered QR (encodes URL like `https://snapshare.vercel.app/?peer=<myId>`)
- 4-digit human-readable room code below QR (derived from `myId` hash, for manual entry)
- "Or enter code:" input + connect button
- Auto-pairs if URL has `?peer=` query param on load

### `<SessionScreen>`
- Header: "Paired with [device-name]" + disconnect button
- Drop zone / file input button
- Transfer list — one row per file with name, size, direction (↑/↓), progress bar
- On receive complete: auto-trigger download via `<a download>` from Blob URL

### `useFileTransfer(connection)` hook
- `sendFile(file: File)` — chunks into 16KB pieces, sends metadata header then chunks, ends with EOF marker
- Inbound: assembles chunks into Blob, on EOF triggers download
- Tracks progress per transfer (Map of transferId → {bytesSent, bytesTotal})
- Backpressure: pauses when `dc.bufferedAmount > 16 MB`, resumes via `bufferedAmountLow` event

### `deviceName()` util
Generates `Adjective-Animal-Platform` (e.g., "Swift-Otter-PC") from peer ID hash. Stable for the session, no storage.

## Data flow — file send

```
sender.useFileTransfer.sendFile(file):
  1. Generate transferId
  2. dc.send({ type: "meta", transferId, name, size, mime })
  3. Read file as stream, slice into 16KB chunks
  4. For each chunk:
     - if dc.bufferedAmount > 16 MB → await 'bufferedamountlow'
     - dc.send(chunk)  // ArrayBuffer
     - update progress
  5. dc.send({ type: "eof", transferId })

receiver:
  - on 'meta' → create entry in transfers map, allocate Uint8Array buffer
  - on ArrayBuffer chunk → append to current transfer's buffer
  - on 'eof' → wrap buffer in Blob, create object URL, programmatically click hidden <a download>
```

## Error handling

- **PeerJS broker unreachable** → show retry button, log to console
- **Peer disconnects mid-transfer** → mark transfer as failed in UI, keep partial data discarded
- **File too large for browser memory** → warn when user adds file >500 MB; allow proceed
- **No camera permission for QR scan** → fall back to manual 4-digit code entry (always visible)
- **WebRTC ICE failure (rare, no STUN reach)** → show "Connection failed — try same WiFi" error

## Testing approach

- Manual: PC ↔ Android over same WiFi, multiple file sizes (1KB / 10MB / 500MB / 2GB)
- Manual: PC ↔ iPhone, verify Photos.app sees received image after save
- Manual: PC↔PC over different networks (STUN path)
- Unit: chunking logic, progress math (vitest)

## File limits

| Size | Behavior |
|---|---|
| <100 MB | No warning, smooth |
| 100 MB – 500 MB | No warning |
| 500 MB – 2 GB | Warning before send |
| >2 GB | Block on mobile (memory risk), allow on desktop |

## Project structure

```
snapshare/
├── docs/superpowers/specs/2026-05-21-snapshare-design.md
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── PairingScreen.tsx
│   │   ├── SessionScreen.tsx
│   │   ├── TransferRow.tsx
│   │   └── QRDisplay.tsx
│   ├── hooks/
│   │   ├── usePeer.ts
│   │   └── useFileTransfer.ts
│   └── lib/
│       ├── deviceName.ts
│       └── codeFromId.ts
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── vercel.json
```

## Deploy

- New GitHub repo: `leonelferreira0373/snapshare`
- Link Vercel project to it (free tier)
- Auto-deploy on push to `main`
- Default `*.vercel.app` domain — custom domain optional later
