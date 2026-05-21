import { Github, ExternalLink, ShieldCheck } from 'lucide-react'
import { useT } from '../lib/i18n'

export function Footer() {
  const { t } = useT()
  return (
    <footer className="mx-auto mt-10 w-full max-w-6xl border-t border-slate-200 px-4 py-6 text-xs text-slate-500 dark:border-neutral-900 dark:text-neutral-500 lg:px-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">SnapShare</p>
          <p className="leading-relaxed">{t('footer_tagline')}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-slate-600 dark:text-neutral-400">
            <ShieldCheck className="h-3 w-3" /> {t('privacy')}
          </p>
          <p className="leading-relaxed">{t('privacy_body')}</p>
          <p className="leading-relaxed text-slate-400 dark:text-neutral-600">{t('privacy_disclaimer')}</p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-600 dark:text-neutral-400">{t('built_by')}</p>
          <a
            href="https://leonelferreira.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5 text-sm font-medium text-slate-800 hover:text-black dark:text-neutral-200 dark:hover:text-white"
          >
            Leonel Ferreira
            <ExternalLink className="h-3 w-3 text-slate-400 transition-colors group-hover:text-slate-700 dark:text-neutral-500 dark:group-hover:text-neutral-300" />
          </a>
          <a
            href="https://leonelferreira.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-700 dark:text-neutral-500 dark:hover:text-neutral-300"
          >
            leonelferreira.vercel.app
          </a>
          <a
            href="https://github.com/leonelferreira0373/snapshare"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] text-slate-700 hover:border-slate-400 hover:text-black dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-white"
          >
            <Github className="h-3 w-3" /> {t('source_github')}
          </a>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-start justify-between gap-2 border-t border-slate-200 pt-4 text-[11px] text-slate-400 dark:border-neutral-900 dark:text-neutral-600 lg:flex-row lg:items-center">
        <p>© {new Date().getFullYear()} SnapShare · MIT License</p>
        <p>{t('made_in')} · v1.9</p>
      </div>
    </footer>
  )
}
