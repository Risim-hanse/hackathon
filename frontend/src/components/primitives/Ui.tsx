import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { X } from 'lucide-react'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function Card({
  className = '',
  style,
  children,
  ...rest
}: HTMLAttributes<HTMLElement> & {
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <section className={cx('card', className)} style={style} {...rest}>
      {children}
    </section>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx('btn', `btn-${variant}`, size !== 'md' && `btn-${size}`, className)}
      {...props}
    >
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button aria-label={label} title={label} className={cx('icon-btn', className)} {...props}>
      {children}
    </button>
  )
}

const TONES = {
  major: 'badge-major',
  moderate: 'badge-moderate',
  minor: 'badge-minor',
  info: 'badge-info',
  success: 'badge-info',
  neutral: 'badge-info',
} as const

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: keyof typeof TONES
  children: ReactNode
  className?: string
}) {
  return <span className={cx('badge', TONES[tone], className)}>{children}</span>
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string; icon?: ReactNode }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="seg" role="group" aria-label="View mode">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="seg-btn"
          data-active={value === option.value}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-3" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div className={cx('surface relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-3xl p-5 animate-in', wide ? 'max-w-3xl' : 'max-w-xl')}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X size={22} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <span>
        <span className="block font-bold">{label}</span>
        {hint && <span className="muted block text-sm">{hint}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-7 w-7 accent-[var(--accent)]"
      />
    </label>
  )
}

export function Meter({
  value,
  max,
  tone = 'var(--accent)',
  className = '',
}: {
  value: number
  max: number
  tone?: string
  className?: string
}) {
  const percent = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={cx('h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]', className)}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${percent}%`, background: tone }} />
    </div>
  )
}

export function Stat({ label, value, icon, tone }: { label: string; value: string; icon: ReactNode; tone?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
        style={{ background: tone ? `color-mix(in srgb, ${tone} 15%, transparent)` : 'var(--accent-soft)', color: tone ?? 'var(--accent)' }}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="muted block text-xs font-bold uppercase tracking-wide">{label}</span>
        <span className="block truncate text-2xl font-extrabold">{value}</span>
      </span>
    </div>
  )
}
