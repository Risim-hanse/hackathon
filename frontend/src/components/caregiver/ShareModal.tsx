import { useState } from 'react'
import { Check, Copy, MessageCircle, Phone, Printer } from 'lucide-react'
import { Button, Modal } from '../primitives/Ui'
import { shareSummary } from '../../utils/format'
import type { AppStateApi } from '../../hooks/useAppState'

export function ShareModal({
  api,
  open,
  onClose,
}: {
  api: AppStateApi
  open: boolean
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const text = shareSummary({
    profile: api.state.profile,
    medications: api.state.medications,
    events: api.state.events,
    doses: api.doses,
    report: api.report,
    adherence: api.adherence,
    now: api.now,
  })

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Share today's summary" wide>
      <p className="muted mb-4 text-sm">
        Plain text that pastes cleanly into WhatsApp. Nothing is sent automatically.
      </p>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm leading-relaxed">
        {text}
      </pre>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={copy}>
          {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Copied' : 'Copy text'}
        </Button>
        <Button variant="secondary" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')}>
          <MessageCircle size={18} /> WhatsApp
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer size={18} /> Print
        </Button>
        {api.state.profile.caregiverPhone && (
          <Button variant="ghost" onClick={() => { window.location.href = `tel:${api.state.profile.caregiverPhone}` }}>
            <Phone size={18} /> Call caregiver
          </Button>
        )}
      </div>
    </Modal>
  )
}
