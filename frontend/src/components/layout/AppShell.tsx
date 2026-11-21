import type { ReactNode } from 'react'
import { APP_NAME, SAFETY_DISCLAIMER } from '../../shared/constants'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-3 focus:text-white"
      >
        Skip to content
      </a>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <p className="text-xl font-bold">{APP_NAME}</p>
          <p className="text-base text-slate-600">A second pair of eyes for your medicines</p>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 py-8">
        {children}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 text-sm text-slate-600">
        <p>{SAFETY_DISCLAIMER}</p>
      </footer>
    </div>
  )
}
