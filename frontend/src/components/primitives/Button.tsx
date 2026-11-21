import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const base =
  'inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-slate-700',
  secondary: 'border-2 border-ink/20 bg-white text-ink hover:bg-slate-100',
  danger: 'bg-alert text-white hover:bg-red-800',
  ghost: 'bg-transparent text-ink underline underline-offset-4 hover:bg-slate-100',
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
