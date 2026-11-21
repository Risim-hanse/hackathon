import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ClipboardList, Info, ShieldCheck } from 'lucide-react'
import type { SafetyFinding, SafetySeverity } from '../../shared/contracts'
import { Badge, Card } from '../primitives/Ui'
import type { AppStateApi } from '../../hooks/useAppState'

const BAND_COPY = {
  safe: 'No known issues in our curated list',
  review: 'Worth a pharmacist review',
  high_risk: 'High-risk combination found',
} as const

const SEVERITY_ICON: Record<SafetySeverity, typeof AlertTriangle> = {
  major: AlertTriangle,
  moderate: AlertTriangle,
  minor: Info,
  info: Info,
}

function ScoreRing({ score, band }: { score: number; band: string }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const color = band === 'high_risk' ? 'var(--danger)' : band === 'review' ? 'var(--warn)' : 'var(--accent)'
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--surface-2)" strokeWidth="14" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p data-testid="safety-score" className="text-4xl font-black leading-none">{score}</p>
          <p className="muted text-xs font-bold">OUT OF 100</p>
        </div>
      </div>
    </div>
  )
}

function FindingCard({ finding }: { finding: SafetyFinding }) {
  const [open, setOpen] = useState(false)
  const Icon = SEVERITY_ICON[finding.severity]
  const tone = finding.severity === 'major' ? 'var(--danger)' : finding.severity === 'moderate' ? 'var(--warn)' : 'var(--info)'

  return (
    <Card data-testid="finding-card" className="border-l-4" style={{ borderLeftColor: tone }}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={finding.severity === 'info' ? 'info' : finding.severity}>{finding.severity}</Badge>
          <Badge tone="neutral">{finding.category.replace('_', ' ')}</Badge>
        </div>
        <div className="mt-3 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone }}>
            <Icon size={22} />
          </span>
          <div className="min-w-0">
            <h3 className="text-xl font-black">{finding.title}</h3>
            <p className="mt-1 text-base">{finding.plainLanguage}</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-[var(--surface-2)] p-3">
          <p className="text-sm font-bold uppercase tracking-wide" style={{ color: tone }}>What to do</p>
          <p className="mt-1 font-semibold">{finding.action}</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button className="flex items-center gap-1 text-sm font-bold underline" onClick={() => setOpen(!open)} aria-expanded={open}>
            <ChevronDown size={16} className={open ? 'rotate-180' : ''} /> Why this happens
          </button>
          {finding.source && <span className="muted text-xs">Source: {finding.source}</span>}
        </div>
        {open && finding.mechanism && <p className="muted mt-2 text-sm">{finding.mechanism}</p>}
      </div>
    </Card>
  )
}

export function SafetyView({ api }: { api: AppStateApi }) {
  const { report, mode } = api
  const [filter, setFilter] = useState<'all' | 'major' | 'other'>('all')
  const findings = report.findings.filter((finding) =>
    filter === 'all' ? true : filter === 'major' ? finding.severity === 'major' : finding.severity !== 'major',
  )

  return (
    <div className="space-y-5">
      <div>
        <p className="muted text-sm font-bold uppercase tracking-wide">Safety check</p>
        <h1 className="mt-1 text-3xl font-black">Your regimen at a glance</h1>
        <p className="muted mt-1 text-base">
          {mode === 'elderly'
            ? 'A simple check of the medicines you take together.'
            : 'Curated checks over active medicines. Not a complete interaction checker.'}
        </p>
      </div>

      <Card className="flex flex-wrap items-center gap-6">
        <ScoreRing score={report.score} band={report.band} />
        <div className="min-w-[14rem] flex-1">
          <Badge tone={report.band === 'high_risk' ? 'major' : report.band === 'review' ? 'moderate' : 'info'}>
            {report.band === 'high_risk' ? <AlertTriangle size={15} /> : <ShieldCheck size={15} />}
            {BAND_COPY[report.band]}
          </Badge>
          <p className="mt-3 text-lg font-semibold">
            {report.findings.length === 0
              ? 'Nothing flagged by our curated rules.'
              : `${report.findings.length} thing${report.findings.length === 1 ? '' : 's'} to look at with your pharmacist.`}
          </p>
          <p className="muted mt-2 text-sm">
            We check duplicates, daily limits, interactions, and age-related cautions. We never claim a medicine is safe.
          </p>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(['all', 'major', 'other'] as const).map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className="chip capitalize"
            style={filter === item ? { background: 'var(--accent)', color: '#ffffff', borderColor: 'var(--accent)' } : undefined}
          >
            {item === 'all' ? 'All findings' : item === 'major' ? 'Major only' : 'Other'}
          </button>
        ))}
      </div>

      {findings.length === 0 ? (
        <Card className="flex items-center gap-4">
          <CheckCircle2 size={38} style={{ color: 'var(--accent)' }} />
          <div>
            <p className="text-xl font-black">Nothing in this filter</p>
            <p className="muted">That does not mean there are no interactions. Ask your pharmacist.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {findings.map((finding) => <FindingCard key={finding.id} finding={finding} />)}
        </div>
      )}

      <p className="muted flex items-center gap-2 text-xs">
        <ClipboardList size={16} /> Checked {new Date(report.checkedAt).toLocaleString()} · Educational aid only.
      </p>
    </div>
  )
}
