import { useState } from 'react'
import { CalendarClock, Pencil, Pill, Plus, Square, Utensils } from 'lucide-react'
import type { FoodRelation, Medication, MedicationForm as MedFormType, ScheduleType } from '../../shared/contracts'
import { resolveBrand } from '../../engine'
import { Badge, Button, Card, Meter, Modal } from '../primitives/Ui'
import { FOOD_LABEL, daysLeftLabel } from '../../utils/format'
import type { AppStateApi } from '../../hooks/useAppState'

const FOOD_OPTIONS = Object.keys(FOOD_LABEL) as FoodRelation[]

function blankForm() {
  return {
    id: '',
    brandName: '',
    genericName: '',
    strength: '',
    form: 'tablet' as MedFormType,
    doseAmount: '1',
    foodRelation: 'after_meal' as FoodRelation,
    scheduleType: 'fixedTimes' as ScheduleType,
    times: '08:00',
    intervalHours: '8',
    inventoryCount: '10',
    refillThresholdDays: '5',
    reason: '',
  }
}

function formFrom(medication: Medication) {
  return {
    id: medication.id,
    brandName: medication.brandName,
    genericName: medication.genericName,
    strength: medication.strength,
    form: medication.form,
    doseAmount: String(medication.doseAmount),
    foodRelation: medication.foodRelation,
    scheduleType: medication.schedule.type,
    times: medication.schedule.times.join(', '),
    intervalHours: String(medication.schedule.intervalHours ?? 8),
    inventoryCount: String(medication.inventory?.currentCount ?? 10),
    refillThresholdDays: String(medication.inventory?.refillThresholdDays ?? 5),
    reason: medication.reason ?? '',
  }
}

export function MedicationsView({ api }: { api: AppStateApi }) {
  const { state, saveMedication, stopMedication, refills } = api
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blankForm)

  const brandEntry = form.brandName.trim() ? resolveBrand(form.brandName) : null

  const openNew = () => {
    setForm(blankForm())
    setOpen(true)
  }

  const openEdit = (medication: Medication) => {
    setForm(formFrom(medication))
    setOpen(true)
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const onBrandChange = (value: string) => {
    const entry = resolveBrand(value)
    setForm((current) => ({
      ...current,
      brandName: value,
      genericName: entry?.generic ?? current.genericName,
    }))
  }

  const save = () => {
    if (!form.brandName.trim()) return
    const generic = form.genericName.trim() || form.brandName.trim()
    const mg = /(\d+(?:\.\d+)?)\s*mg/i.exec(form.strength)?.[1]
    const times = form.times.split(',').map((time) => time.trim()).filter(Boolean)
    const medication: Medication = {
      id: form.id || `med-${Date.now()}`,
      brandName: form.brandName.trim(),
      genericName: generic,
      form: form.form,
      strength: form.strength.trim() || '—',
      activeIngredients:
        mg && !generic.includes('+')
          ? [{ generic, mgPerUnit: Number(mg) }]
          : undefined,
      doseAmount: Number(form.doseAmount) || 1,
      doseUnit: form.form === 'syrup' ? 'ml' : 'tablet',
      foodRelation: form.foodRelation,
      schedule: {
        type: form.scheduleType,
        times: form.scheduleType === 'asNeeded' ? [] : times,
        intervalHours:
          form.scheduleType === 'everyHours' ? Number(form.intervalHours) || 8 : undefined,
      },
      status: 'active',
      reason: form.reason.trim() || undefined,
      inventory: {
        currentCount: Number(form.inventoryCount) || 0,
        unit: form.form === 'syrup' ? 'ml' : 'tablet',
        refillThresholdDays: Number(form.refillThresholdDays) || 5,
      },
    }
    saveMedication(medication)
    setOpen(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="muted text-sm font-bold uppercase tracking-wide">Your plan</p>
          <h1 className="mt-1 text-3xl font-black">Medicines</h1>
          <p className="muted mt-1 text-base">{state.medications.length} medicines on record.</p>
        </div>
        <Button onClick={openNew}>
          <Plus size={20} /> Add medicine
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {state.medications.map((medication) => {
          const days = refills.find((entry) => entry.medication.id === medication.id)?.daysLeft ?? null
          const threshold = medication.inventory?.refillThresholdDays ?? 5
          return (
            <Card key={medication.id} className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--accent-soft)]" style={{ color: 'var(--accent)' }}>
                  <Pill size={26} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-xl font-black">{medication.brandName}</h2>
                    <Badge tone="info">{medication.strength}</Badge>
                  </div>
                  <p className="muted text-sm">{medication.genericName} · {medication.form}</p>
                </div>
                {medication.status !== 'active' && <Badge tone="moderate">Stopped</Badge>}
              </div>

              <div className="flex flex-wrap gap-2">
                {medication.schedule.times.map((time) => (
                  <span key={time} className="chip"><CalendarClock size={15} /> {time}</span>
                ))}
                {medication.schedule.type === 'everyHours' && (
                  <span className="chip">Every {medication.schedule.intervalHours}h</span>
                )}
                {medication.schedule.type === 'asNeeded' && <span className="chip">As needed</span>}
                <span className="chip"><Utensils size={15} /> {FOOD_LABEL[medication.foodRelation]}</span>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-sm font-bold">
                  <span className="muted">Stock</span>
                  <span style={{ color: days !== null && days <= threshold ? 'var(--warn)' : undefined }}>
                    {daysLeftLabel(days)}
                  </span>
                </div>
                <Meter value={Math.max(days ?? 0, 0)} max={Math.max(threshold * 3, 1)} tone={days !== null && days <= threshold ? 'var(--warn)' : 'var(--accent)'} />
              </div>

              <div className="mt-auto flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEdit(medication)}>
                  <Pencil size={16} /> Edit
                </Button>
                {medication.status === 'active' ? (
                  <Button variant="ghost" size="sm" onClick={() => stopMedication(medication.id)}>
                    <Square size={15} /> Stop
                  </Button>
                ) : null}
              </div>
            </Card>
          )
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? 'Edit medicine' : 'Add medicine'} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label">Brand name</span>
            <input className="input" value={form.brandName} onChange={(event) => onBrandChange(event.target.value)} placeholder="e.g. Dolo 650" />
            {brandEntry && (
              <span className="chip mt-2">Resolves to {brandEntry.generic}</span>
            )}
          </label>
          <label>
            <span className="label">Generic name</span>
            <input className="input" value={form.genericName} onChange={(event) => set('genericName', event.target.value)} placeholder="paracetamol" />
          </label>
          <label>
            <span className="label">Strength</span>
            <input className="input" value={form.strength} onChange={(event) => set('strength', event.target.value)} placeholder="650mg" />
          </label>
          <label>
            <span className="label">Form</span>
            <select className="input" value={form.form} onChange={(event) => set('form', event.target.value as MedFormType)}>
              {['tablet', 'capsule', 'syrup', 'injection', 'drops', 'inhaler', 'patch'].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Dose amount</span>
            <input className="input" type="number" min="0.25" step="0.25" value={form.doseAmount} onChange={(event) => set('doseAmount', event.target.value)} />
          </label>
          <label>
            <span className="label">Food relation</span>
            <select className="input" value={form.foodRelation} onChange={(event) => set('foodRelation', event.target.value as FoodRelation)}>
              {FOOD_OPTIONS.map((item) => <option key={item} value={item}>{FOOD_LABEL[item]}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Schedule</span>
            <select className="input" value={form.scheduleType} onChange={(event) => set('scheduleType', event.target.value as ScheduleType)}>
              <option value="fixedTimes">Fixed times</option>
              <option value="everyHours">Every N hours</option>
              <option value="asNeeded">As needed</option>
            </select>
          </label>
          {form.scheduleType === 'fixedTimes' && (
            <label>
              <span className="label">Times (HH:mm, comma separated)</span>
              <input className="input" value={form.times} onChange={(event) => set('times', event.target.value)} placeholder="08:00, 20:00" />
            </label>
          )}
          {form.scheduleType === 'everyHours' && (
            <label>
              <span className="label">Interval (hours)</span>
              <input className="input" type="number" min="1" max="24" value={form.intervalHours} onChange={(event) => set('intervalHours', event.target.value)} />
            </label>
          )}
          <label>
            <span className="label">Tablets in stock</span>
            <input className="input" type="number" min="0" value={form.inventoryCount} onChange={(event) => set('inventoryCount', event.target.value)} />
          </label>
          <label>
            <span className="label">Refill warning at (days)</span>
            <input className="input" type="number" min="1" value={form.refillThresholdDays} onChange={(event) => set('refillThresholdDays', event.target.value)} />
          </label>
          <label className="sm:col-span-2">
            <span className="label">Reason (optional)</span>
            <input className="input" value={form.reason} onChange={(event) => set('reason', event.target.value)} placeholder="Pain, sleep, blood pressure…" />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={!form.brandName.trim()}>Save medicine</Button>
        </div>
      </Modal>
    </div>
  )
}
