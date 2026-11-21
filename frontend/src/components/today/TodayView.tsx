import { useState } from 'react'
import {
  AlarmClock,
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  HeartPulse,
  Pencil,
  Phone,
  Pill,
  ShieldAlert,
  SkipForward,
  Utensils,
} from 'lucide-react'
import type { DoseInstance, SkipReason } from '../../shared/contracts'
import { Badge, Button, Card, IconButton, Meter, Stat } from '../primitives/Ui'
import { FOOD_LABEL, STATUS_LABEL, friendlyTime, greeting, longDate } from '../../utils/format'
import type { AppStateApi } from '../../hooks/useAppState'
import type { Tab } from '../layout/AppShell'

const SKIP_REASONS: Array<{ value: SkipReason; label: string }> = [
  { value: 'felt_fine', label: 'Feeling fine' },
  { value: 'side_effect', label: 'Side effect' },
  { value: 'forgot', label: 'Forgot earlier' },
  { value: 'nausea', label: 'Nausea' },
  { value: 'doctor_advised', label: 'Doctor advised' },
  { value: 'ran_out', label: 'Ran out' },
  { value: 'other', label: 'Other' },
]

function StatusIcon({ status }: { status: DoseInstance['status'] }) {
  if (status === 'taken') return <CheckCircle2 size={24} style={{ color: 'var(--accent)' }} />
  if (status === 'late' || status === 'missed')
    return <AlertTriangle size={24} style={{ color: 'var(--danger)' }} />
  if (status === 'skipped') return <SkipForward size={22} style={{ color: 'var(--warn)' }} />
  return <Circle size={23} className="muted" />
}

function statusTone(status: DoseInstance['status']): 'success' | 'major' | 'moderate' | 'info' {
  if (status === 'taken') return 'success'
  if (status === 'late' || status === 'missed') return 'major'
  if (status === 'skipped') return 'moderate'
  return 'info'
}

export function TodayView({ api, setTab }: { api: AppStateApi; setTab: (tab: Tab) => void }) {
  const { mode, state, now, doses, report, adherence, refills, snoozes, logDose, undo, snooze } = api
  const [skipFor, setSkipFor] = useState<string | null>(null)
  const [reason, setReason] = useState<SkipReason>('felt_fine')

  const medById = new Map(state.medications.map((medication) => [medication.id, medication]))
  const pending = doses.filter(
    (dose) => dose.status === 'scheduled' || dose.status === 'late',
  )
  const next = pending[0]
  const takenCount = doses.filter((dose) => dose.status === 'taken' || dose.status === 'late').length
  const refillDue = refills.filter(
    (entry) => entry.daysLeft !== null && entry.daysLeft <= (entry.medication.inventory?.refillThresholdDays ?? 5),
  )

  const take = (dose: DoseInstance) => logDose(dose, 'taken')
  const skip = (dose: DoseInstance) => {
    logDose(dose, 'skipped', reason)
    setSkipFor(null)
  }

  if (mode === 'caregiver') {
    return (
      <div className="space-y-5">
        <div>
          <p className="muted text-sm font-bold uppercase tracking-wide">Caregiver view</p>
          <h1 className="mt-1 text-3xl font-black">Today's overview</h1>
          <p className="muted mt-1 text-base">{longDate(now)} · {state.profile.name}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Doses logged" value={`${takenCount}/${doses.length}`} icon={<Check size={22} />} />
          <Stat label="7-day adherence" value={`${adherence.adherencePercent}%`} icon={<Activity size={22} />} />
          <Stat label="Safety score" value={`${report.score}/100`} icon={<ShieldAlert size={22} />} />
          <Stat label="Refill alerts" value={String(refillDue.length)} icon={<Pill size={22} />} tone="var(--warn)" />
        </div>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <h2 className="text-xl font-black">Today's schedule</h2>
              <p className="muted text-sm">Log a dose or edit the plan from here.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setTab('meds')}>
              <Pencil size={16} /> Edit plan
            </Button>
          </div>

          <ul className="divide-y divide-[var(--border)]">
            {doses.map((dose) => {
              const medication = medById.get(dose.medicationId)
              const snoozedUntil = snoozes[dose.id]
              return (
                <li key={dose.id} data-testid="dose-row" className="grid gap-3 px-5 py-4 md:grid-cols-[5rem_1fr_8rem_12rem] md:items-center">
                  <div className="flex items-center gap-2">
                    <Clock3 size={18} className="muted" />
                    <span className="font-extrabold">{friendlyTime(dose.scheduledFor)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{medication?.brandName ?? dose.medicationId}</p>
                    <p className="muted truncate text-sm">
                      {medication?.genericName} · {medication?.strength} · {medication ? FOOD_LABEL[medication.foodRelation] : ''}
                    </p>
                  </div>
                  <div>
                    <Badge tone={statusTone(dose.status)}>
                      <StatusIcon status={dose.status} />
                      {STATUS_LABEL[dose.status]}
                    </Badge>
                    {snoozedUntil && snoozedUntil > Date.now() ? (
                      <p className="muted mt-1 text-xs">Snoozed</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {(dose.status === 'scheduled' || dose.status === 'late') && (
                      <>
                        <Button size="sm" onClick={() => take(dose)}>
                          <Check size={16} /> Log dose
                        </Button>
                        <IconButton label="Snooze 15 minutes" onClick={() => snooze(dose.id, 15)}>
                          <AlarmClock size={18} />
                        </IconButton>
                        <IconButton label="Skip dose" onClick={() => setSkipFor(skipFor === dose.id ? null : dose.id)}>
                          <SkipForward size={18} />
                        </IconButton>
                      </>
                    )}
                    {dose.status === 'taken' && api.toast?.undoId && (
                      <Button size="sm" variant="ghost" onClick={() => undo(api.toast!.undoId!)}>
                        Undo last
                      </Button>
                    )}
                  </div>
                  {skipFor === dose.id && (
                    <div className="md:col-span-4 flex flex-wrap items-end gap-2 rounded-2xl bg-[var(--surface-2)] p-3">
                      <label className="flex-1">
                        <span className="label">Reason for skipping</span>
                        <select className="input" value={reason} onChange={(event) => setReason(event.target.value as SkipReason)}>
                          {SKIP_REASONS.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                          ))}
                        </select>
                      </label>
                      <Button variant="danger" onClick={() => skip(dose)}>Confirm skip</Button>
                      <Button variant="ghost" onClick={() => setSkipFor(null)}>Cancel</Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>

        {refillDue.length > 0 && (
          <Card>
            <h2 className="text-lg font-black">Refill soon</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {refillDue.map(({ medication, daysLeft }) => (
                <div key={medication.id} className="rounded-2xl bg-[var(--surface-2)] p-3">
                  <div className="flex justify-between font-bold">
                    <span>{medication.brandName}</span>
                    <span style={{ color: 'var(--warn)' }}>{daysLeft} days left</span>
                  </div>
                  <Meter className="mt-2" value={Math.max(daysLeft ?? 0, 0)} max={medication.inventory?.refillThresholdDays ?? 7} tone="var(--warn)" />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="muted text-base font-semibold">{longDate(now)}</p>
        <h1 className="mt-1 text-4xl font-black">
          {greeting(now)}, {state.profile.name.split(' ')[0]}
        </h1>
        <p className="muted mt-2 text-lg">Here is what is happening with your medicines today.</p>
      </div>

      {next ? (
        <div className="hero animate-in">
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-white/80">
              <Pill size={20} />
              <span className="text-base font-bold uppercase tracking-wide">Next dose</span>
            </div>
            <h2 className="mt-4 text-4xl font-black leading-tight">
              {medById.get(next.medicationId)?.brandName ?? next.medicationId}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-lg font-semibold text-white/90">
              <span className="flex items-center gap-2"><Clock3 size={21} /> {friendlyTime(next.scheduledFor)}</span>
              <span className="flex items-center gap-2"><Utensils size={21} /> {medById.get(next.medicationId) ? FOOD_LABEL[medById.get(next.medicationId)!.foodRelation] : ''}</span>
              {next.status === 'late' && <span className="flex items-center gap-2"><AlertTriangle size={21} /> Overdue</span>}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" className="bg-white text-[var(--accent)]" onClick={() => take(next)}>
                <Check size={26} /> Take now
              </Button>
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10" onClick={() => snooze(next.id, 15)}>
                <AlarmClock size={22} /> Later
              </Button>
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setSkipFor(skipFor === next.id ? null : next.id)}>
                <SkipForward size={22} /> Skip
              </Button>
            </div>
            {skipFor === next.id && (
              <div className="mt-4 rounded-2xl bg-white/15 p-3">
                <label className="text-sm font-bold">Why skip this dose?</label>
                <select className="input mt-2 bg-white text-black" value={reason} onChange={(event) => setReason(event.target.value as SkipReason)}>
                  {SKIP_REASONS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="bg-white text-[var(--accent)]" onClick={() => skip(next)}>Confirm skip</Button>
                  <Button size="sm" variant="ghost" className="text-white" onClick={() => setSkipFor(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="hero">
          <div className="relative z-10 flex items-center gap-4">
            <CheckCircle2 size={52} />
            <div>
              <h2 className="text-3xl font-black">All done for today</h2>
              <p className="text-lg text-white/85">Every scheduled dose has been logged. Well done.</p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl font-black">Today's schedule</h2>
          <Badge tone="info">{takenCount} of {doses.length} logged</Badge>
        </div>
        <ul className="divide-y divide-[var(--border)]">
          {doses.map((dose) => {
            const medication = medById.get(dose.medicationId)
            const done = dose.status === 'taken' || dose.status === 'skipped' || dose.status === 'missed'
            return (
              <li key={dose.id} data-testid="dose-row" className="flex flex-wrap items-center gap-3 py-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--surface-2)]">
                  <StatusIcon status={dose.status} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-extrabold">{medication?.brandName ?? dose.medicationId}</p>
                  <p className="muted text-sm">
                    {friendlyTime(dose.scheduledFor)} · {medication ? FOOD_LABEL[medication.foodRelation] : ''}
                  </p>
                </div>
                {done ? (
                  <Badge tone={statusTone(dose.status)}>{STATUS_LABEL[dose.status]}</Badge>
                ) : (
                  <Button size="sm" onClick={() => take(dose)}>
                    <Check size={17} /> Mark taken
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent-soft)]" style={{ color: 'var(--accent)' }}>
            <HeartPulse size={28} />
          </span>
          <div>
            <p className="muted text-sm font-bold uppercase">Your streak</p>
            <p className="text-2xl font-black">{adherence.streakDays} days</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--warn-soft)]" style={{ color: 'var(--warn)' }}>
            <Phone size={26} />
          </span>
          <div className="min-w-0">
            <p className="muted text-sm font-bold uppercase">Need help?</p>
            <a className="block truncate text-xl font-black underline" href={`tel:${state.profile.caregiverPhone ?? ''}`}>
              Call {state.profile.caregiverName ?? 'caregiver'}
            </a>
          </div>
        </Card>
      </div>

      {api.toast && (
        <div className="no-print toast" role="status">
          <CheckCircle2 size={22} />
          <span className="font-bold">{api.toast.message}</span>
          {api.toast.undoId && (
            <button className="font-black underline" onClick={() => undo(api.toast!.undoId!)}>Undo</button>
          )}
        </div>
      )}
    </div>
  )
}

export function UndoToast({ api }: { api: AppStateApi }) {
  if (!api.toast || api.mode === 'elderly') return null
  return (
    <div className="no-print toast" role="status">
      <CheckCircle2 size={20} />
      <span className="font-bold text-sm">{api.toast.message}</span>
      {api.toast.undoId && (
        <button className="font-black underline" onClick={() => undoToast(api, api.toast!.undoId!)}>Undo</button>
      )}
    </div>
  )
}

function undoToast(api: AppStateApi, id: string) {
  api.undo(id)
  api.setToast(null)
}

export function ScheduleHint({ onClick }: { onClick: () => void }) {
  return (
    <button className="flex w-full items-center justify-between rounded-2xl bg-[var(--accent-soft)] p-4 text-left" onClick={onClick}>
      <span className="font-bold">Review the full medicine plan</span>
      <ChevronRight size={20} />
    </button>
  )
}
