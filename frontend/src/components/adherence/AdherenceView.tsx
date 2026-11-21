import { CalendarDays, Flame, Target, TrendingUp } from 'lucide-react'
import { Badge, Card, Meter, Stat } from '../primitives/Ui'
import { localDateFor } from '../../engine'
import type { AppStateApi } from '../../hooks/useAppState'

export function AdherenceView({ api }: { api: AppStateApi }) {
  const { adherence, weekDoses, now } = api

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setDate(date.getDate() - (6 - index))
    const key = localDateFor(date)
    const forDay = weekDoses.filter((dose) => localDateFor(dose.scheduledFor) === key)
    return {
      key,
      label: date.toLocaleDateString([], { weekday: 'short' }),
      day: date.getDate(),
      taken: forDay.filter((dose) => dose.status === 'taken' || dose.status === 'late').length,
      missed: forDay.filter((dose) => dose.status === 'missed').length,
      skipped: forDay.filter((dose) => dose.status === 'skipped').length,
      planned: forDay.length,
    }
  })

  return (
    <div className="space-y-5">
      <div>
        <p className="muted text-sm font-bold uppercase tracking-wide">Progress</p>
        <h1 className="mt-1 text-3xl font-black">Last 7 days</h1>
        <p className="muted mt-1 text-base">An honest record of what happened, including missed doses.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Adherence" value={`${adherence.adherencePercent}%`} icon={<Target size={22} />} />
        <Stat label="Streak" value={`${adherence.streakDays} days`} icon={<Flame size={22} />} tone="var(--warn)" />
        <Stat label="Taken" value={String(adherence.taken + adherence.late)} icon={<TrendingUp size={22} />} />
        <Stat label="Missed" value={String(adherence.missed)} icon={<CalendarDays size={22} />} tone="var(--danger)" />
      </div>

      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black">Your week</h2>
          <Badge tone="info">Most missed: {adherence.mostMissedSlot ?? 'none'}</Badge>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const total = Math.max(day.planned, 1)
            return (
              <div key={day.key} className="rounded-2xl bg-[var(--surface-2)] p-2 text-center">
                <p className="muted text-xs font-bold uppercase">{day.label}</p>
                <p className="text-lg font-black">{day.day}</p>
                <div className="mx-auto mt-2 flex h-24 w-full max-w-12 flex-col-reverse justify-start gap-0.5">
                  {Array.from({ length: total }, (_, index) => {
                    const tone = index < day.missed ? 'var(--danger)' : index < day.missed + day.skipped ? 'var(--warn)' : 'var(--accent)'
                    return <div key={index} className="h-3 w-full rounded-sm" style={{ background: tone }} />
                  })}
                </div>
                <p className="muted mt-1 text-xs">{day.taken}/{day.planned}</p>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm" style={{ background: 'var(--accent)' }} /> Taken</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm" style={{ background: 'var(--warn)' }} /> Skipped</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm" style={{ background: 'var(--danger)' }} /> Missed</span>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-black">Adherence rate</h2>
        <p className="muted mt-1 text-sm">Late doses count as taken. Future doses are excluded.</p>
        <div className="mt-4">
          <Meter value={adherence.adherencePercent} max={100} />
          <div className="mt-2 flex justify-between text-sm font-bold">
            <span>{adherence.taken + adherence.late} taken</span>
            <span>{adherence.skipped} skipped</span>
            <span>{adherence.missed} missed</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
