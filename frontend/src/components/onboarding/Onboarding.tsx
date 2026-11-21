import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  HeartPulse,
  Pill,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import { Button, Card, Segmented } from '../primitives/Ui'
import type { AppStateApi, Mode } from '../../hooks/useAppState'

export type OnboardingPath = 'demo' | 'add' | 'scan'

export interface OnboardingSetup {
  caregiverName: string
  caregiverPhone: string
  mode: Mode
}

export function Onboarding({
  api,
  onPath,
}: {
  api: AppStateApi
  onPath: (path: OnboardingPath, setup?: OnboardingSetup) => void
}) {
  const [step, setStep] = useState<'welcome' | 'setup'>('welcome')
  const [path, setPath] = useState<Exclude<OnboardingPath, 'demo'> | null>(null)
  const [caregiverName, setCaregiverName] = useState('')
  const [caregiverPhone, setCaregiverPhone] = useState('')
  const [mode, setMode] = useState<Mode>('elderly')

  const choose = (selected: Exclude<OnboardingPath, 'demo'>) => {
    setPath(selected)
    setStep('setup')
  }

  const finish = () => {
    if (!path) return
    onPath(path, { caregiverName, caregiverPhone, mode })
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-6">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)] text-white">
          <Pill size={26} />
        </span>
        <div>
          <p className="text-lg font-black leading-tight">MediTrack SafetyNet</p>
          <p className="muted text-xs font-semibold">A second pair of eyes for your medicines</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        {step === 'welcome' ? (
          <div className="animate-in">
            <div className="max-w-2xl">
              <p className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                Welcome
              </p>
              <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
                Start with the medicines you actually take.
              </h1>
              <p className="muted mt-4 text-lg">
                Add a prescription photo, type them in yourself, or explore with a sample
                profile. Everything stays on this device.
              </p>
            </div>

            <div className="mt-9 grid gap-4 md:grid-cols-3">
              <button
                type="button"
                data-testid="onboarding-scan"
                onClick={() => choose('scan')}
                className="card group flex min-h-56 flex-col items-start text-left transition-transform hover:-translate-y-1"
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent-soft)]" style={{ color: 'var(--accent)' }}>
                  <ScanLine size={28} />
                </span>
                <span className="mt-5 text-xl font-black">Scan a prescription</span>
                <span className="muted mt-2 flex-1 text-base">
                  Upload a photo. Gemini reads the doctor, dates, pharmacy, and dosage plan for you.
                </span>
                <span className="mt-4 flex items-center gap-1 font-bold" style={{ color: 'var(--accent)' }}>
                  Start scanning <ArrowRight size={18} />
                </span>
              </button>

              <button
                type="button"
                data-testid="onboarding-add"
                onClick={() => choose('add')}
                className="card group flex min-h-56 flex-col items-start text-left transition-transform hover:-translate-y-1"
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--info-soft)]" style={{ color: 'var(--info)' }}>
                  <Pill size={28} />
                </span>
                <span className="mt-5 text-xl font-black">Add a medicine</span>
                <span className="muted mt-2 flex-1 text-base">
                  Enter the brand, strength, and times yourself. We resolve the generic and check the schedule.
                </span>
                <span className="mt-4 flex items-center gap-1 font-bold" style={{ color: 'var(--info)' }}>
                  Add manually <ArrowRight size={18} />
                </span>
              </button>

              <button
                type="button"
                data-testid="onboarding-demo"
                onClick={() => onPath('demo')}
                className="card group flex min-h-56 flex-col items-start text-left transition-transform hover:-translate-y-1"
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--warn-soft)]" style={{ color: 'var(--warn)' }}>
                  <Sparkles size={28} />
                </span>
                <span className="mt-5 text-xl font-black">Explore the demo</span>
                <span className="muted mt-2 flex-1 text-base">
                  Meera, 68, takes five medicines. See duplicate, interaction, and refill warnings instantly.
                </span>
                <span className="mt-4 flex items-center gap-1 font-bold" style={{ color: 'var(--warn)' }}>
                  Load sample <ArrowRight size={18} />
                </span>
              </button>
            </div>

            <Card className="mt-8">
              <h2 className="text-lg font-black">How it works</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="flex gap-3">
                  <span className="muted text-2xl font-black">1</span>
                  <p className="text-sm"><strong>Add</strong> a photo or type a medicine.</p>
                </div>
                <div className="flex gap-3">
                  <span className="muted text-2xl font-black">2</span>
                  <p className="text-sm"><strong>Review</strong> the extracted plan. Nothing is saved until you confirm.</p>
                </div>
                <div className="flex gap-3">
                  <span className="muted text-2xl font-black">3</span>
                  <p className="text-sm"><strong>Check</strong> duplicates, interactions, and adherence every day.</p>
                </div>
              </div>
            </Card>

            <p className="muted mt-6 flex items-center gap-2 text-sm">
              <ShieldCheck size={18} /> Educational aid, not medical advice. Photos stay in this browser.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl animate-in">
            <Button variant="ghost" onClick={() => setStep('welcome')}>
              <ArrowLeft size={18} /> Back
            </Button>

            <div className="mt-4">
              <p className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                One quick step
              </p>
              <h1 className="mt-3 text-3xl font-black">Make it yours</h1>
              <p className="muted mt-2 text-base">
                {path === 'scan'
                  ? 'Add a caregiver contact so they can receive the summary later.'
                  : 'A caregiver contact and your preferred view make the app feel right from the start.'}
              </p>
            </div>

            <Card className="mt-6 space-y-5">
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
                  <UserRound size={20} /> Who is this for?
                </h2>
                <Segmented<Mode>
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'elderly', label: 'Elderly', icon: <UserRound size={17} /> },
                    { value: 'caregiver', label: 'Caregiver', icon: <Users size={17} /> },
                  ]}
                />
                <p className="muted mt-2 text-sm">
                  {mode === 'elderly'
                    ? 'Large text, calm colours, one clear next dose.'
                    : 'Compact dashboard with all details and actions.'}
                </p>
              </div>

              <div>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
                  <HeartPulse size={20} /> Caregiver contact (optional)
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="label">Name</span>
                    <input
                      className="input"
                      value={caregiverName}
                      onChange={(event) => setCaregiverName(event.target.value)}
                      placeholder="e.g. Anita (daughter)"
                    />
                  </label>
                  <label>
                    <span className="label">Phone</span>
                    <input
                      className="input"
                      value={caregiverPhone}
                      onChange={(event) => setCaregiverPhone(event.target.value)}
                      placeholder="+91 90000 00000"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-[var(--surface-2)] p-3 text-sm">
                <FileText size={18} />
                <span className="muted">
                  You can change all of this later in Settings.
                </span>
              </div>
            </Card>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="secondary" onClick={() => onPath('demo')}>
                Use sample instead
              </Button>
              <Button size="lg" onClick={finish}>
                Continue <ArrowRight size={20} />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
