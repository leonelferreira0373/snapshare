import { Github, ExternalLink, ShieldCheck } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mx-auto mt-10 w-full max-w-6xl border-t border-neutral-900 px-4 py-6 text-xs text-neutral-500 lg:px-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Left: brand + tagline */}
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-neutral-300">SnapShare</p>
          <p className="leading-relaxed">
            Free peer-to-peer file transfer between any two devices via QR code.
            No accounts, no quality loss.
          </p>
        </div>

        {/* Middle: privacy / legal */}
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-neutral-400">
            <ShieldCheck className="h-3 w-3" /> Privacy
          </p>
          <p className="leading-relaxed">
            Files transfer directly between devices over WebRTC and are never uploaded
            to any server. Only a brief signaling handshake (a few KB) passes through a
            broker; file contents do not.
          </p>
          <p className="leading-relaxed text-neutral-600">
            Provided as-is, without warranty. No data is collected or stored.
          </p>
        </div>

        {/* Right: credit + links */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Built by</p>
          <a
            href="https://leonelferreira.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5 text-sm font-medium text-neutral-200 hover:text-white"
          >
            Leonel Ferreira
            <ExternalLink className="h-3 w-3 text-neutral-500 transition-colors group-hover:text-neutral-300" />
          </a>
          <a
            href="https://leonelferreira.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-500 hover:text-neutral-300"
          >
            leonelferreira.vercel.app
          </a>
          <a
            href="https://github.com/leonelferreira0373/snapshare"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900/50 px-2.5 py-1 text-[11px] text-neutral-300 hover:border-neutral-700 hover:text-white"
          >
            <Github className="h-3 w-3" /> Source on GitHub
          </a>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-start justify-between gap-2 border-t border-neutral-900 pt-4 text-[11px] text-neutral-600 lg:flex-row lg:items-center">
        <p>© {new Date().getFullYear()} SnapShare · MIT License</p>
        <p>
          Made in Luanda · v1.7
        </p>
      </div>
    </footer>
  )
}
