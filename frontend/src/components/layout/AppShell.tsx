import type { ReactNode } from 'react'
import {
  Activity,
  Contrast,
  Pill,
  RotateCcw,
  Settings2,
  Share2,
  Type,
  UserRound,
  Users,
} from 'lucide-react'
import { Badge, Button, IconButton, Segmented } from '../primitives/Ui'
import type { AppStateApi, Mode } from '../../hooks/useAppState'

export type Tab = 'today' | 'meds' | 'safety' | 'adherence'

const TABS: Array<{ value: Tab; label: string; icon: typeof Activity }> = [
  { value: 'today', label: 'Today', icon: Activity },
  { value: 'meds', label: 'Medicines', icon: Pill },
  { value: 'safety', label: 'Safety', icon: Users },
  { value: 'adherence', label: 'Progress', icon: Activity },
]

export function AppShell({
  api,
  tab,
  setTab,
  onShare,
  onSettings,
  children,
}: {
  api: AppStateApi
  tab: Tab
  setTab: (tab: Tab) => void
  onShare: () => void
  onSettings: () => void
  children: ReactNode
}) {
  const { mode, setMode, state, setPreference, resetAll, loadDemo } = api

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-[var(--ink)] focus:px-4 focus:py-3 focus:text-[var(--surface)]"
      >
        Skip to content
      </a>

      <header className="no-print sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--accent)] text-white">
              <Pill size={26} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-black leading-tight">MediTrack SafetyNet</p>
              <p className="muted truncate text-xs font-semibold">
                {state.profile.name} · {state.profile.caregiverName || 'No caregiver set'}
              </p>
            </div>
            <Badge className="hidden sm:inline-flex">Demo</Badge>
          </div>

          <Segmented<Mode>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'elderly', label: 'Elderly', icon: <UserRound size={17} /> },
              { value: 'caregiver', label: 'Caregiver', icon: <Users size={17} /> },
            ]}
          />

          <div className="flex items-center gap-2">
            <IconButton
              label="Toggle large text"
              aria-pressed={state.profile.preferences.largeText}
              onClick={() => setPreference('largeText', !state.profile.preferences.largeText)}
              className={state.profile.preferences.largeText ? 'bg-[var(--accent-soft)]' : ''}
            >
              <Type size={21} />
            </IconButton>
            <IconButton
              label="Toggle high contrast"
              aria-pressed={state.profile.preferences.highContrast}
              onClick={() => setPreference('highContrast', !state.profile.preferences.highContrast)}
              className={state.profile.preferences.highContrast ? 'bg-[var(--accent-soft)]' : ''}
            >
              <Contrast size={21} />
            </IconButton>
            <IconButton label="Share summary" onClick={onShare}>
              <Share2 size={21} />
            </IconButton>
            <IconButton label="Settings" onClick={onSettings}>
              <Settings2 size={21} />
            </IconButton>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3" aria-label="Main views">
          {TABS.map((item) => {
            const Icon = item.icon
            const active = tab === item.value
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                aria-current={active ? 'page' : undefined}
                className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold transition-colors"
                style={{
                  background: active ? 'var(--accent)' : 'var(--surface-2)',
                  color: active ? '#ffffff' : 'var(--muted)',
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto hidden shrink-0 sm:inline-flex"
            onClick={resetAll}
          >
            <RotateCcw size={16} /> Reset demo
          </Button>
        </nav>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-6">
        {api.emptyState ? (
          <div className="card mx-auto max-w-lg text-center">
            <p className="text-2xl font-black">Start with Meera's demo</p>
            <p className="muted mt-2">
              A fictional 68-year-old with five medicines. Everything works offline.
            </p>
            <Button className="mt-5" onClick={loadDemo}>
              Load demo
            </Button>
          </div>
        ) : (
          <div className="animate-in">{children}</div>
        )}
      </main>

      <footer className="no-print mx-auto max-w-6xl px-4 pb-10 pt-2">
        <p className="muted text-xs sm:text-sm">
          Educational aid, not medical advice. Confirm changes with your doctor or pharmacist.
        </p>
      </footer>
    </div>
  )
}
