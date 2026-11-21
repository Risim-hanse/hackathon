import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Check,
  FileText,
  Image as ImageIcon,
  Loader2,
  Pill,
  ScanLine,
  Upload,
} from 'lucide-react'
import type {
  Medication,
  Prescription,
  PrescriptionSourceKind,
  ScanResponse,
} from '../../shared/contracts'
import { getScanStatus, scanPrescription } from '../../services/apiClient'
import { saveImage } from '../../storage/imageStore'
import { Badge, Button, Card, Modal } from '../primitives/Ui'
import { FOOD_LABEL } from '../../utils/format'
import type { AppStateApi } from '../../hooks/useAppState'

type medicationDraft = { selected: boolean; medication: Medication }
type PrescriptionDraft = Omit<Prescription, 'id' | 'createdAt'>

const KIND_OPTIONS: PrescriptionSourceKind[] = [
  'prescription',
  'pharmacy_bill',
  'medicine_box',
  'discharge_summary',
  'other',
]

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      <span className="label">{label}</span>
      {children}
    </label>
  )
}

async function makeThumbnail(file: File): Promise<string | undefined> {
  try {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, 180 / bitmap.width)
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return canvas.toDataURL('image/jpeg', 0.7)
  } catch {
    return undefined
  }
}

function toMedicationDraft(
  scanned: ScanResponse['medications'][number],
  index: number,
): medicationDraft {
  const generic = scanned.genericName?.trim() || scanned.brandName.trim()
  const mg = /(\d+(?:\.\d+)?)\s*mg/i.exec(scanned.strength ?? '')?.[1]
  const form = scanned.form ?? 'tablet'
  const unit = scanned.doseUnit ?? (form === 'syrup' ? 'ml' : 'tablet')
  const scheduleType = scanned.scheduleType ?? (scanned.times?.length ? 'fixedTimes' : 'asNeeded')

  const medication: Medication = {
    id: `med-scan-${Date.now()}-${index}`,
    brandName: scanned.brandName.trim(),
    genericName: generic,
    form,
    strength: scanned.strength ?? '—',
    activeIngredients: mg && !generic.includes('+') ? [{ generic, mgPerUnit: Number(mg) }] : undefined,
    doseAmount: scanned.doseAmount ?? 1,
    doseUnit: unit,
    foodRelation: scanned.foodRelation ?? 'anytime',
    schedule: {
      type: scheduleType,
      times: scanned.times ?? [],
      intervalHours: scanned.intervalHours,
    },
    status: 'active',
    reason: scanned.reason,
    directionsRaw: scanned.directionsRaw,
    durationDays: scanned.durationDays,
    quantityDispensed: scanned.quantityDispensed,
    refillsAuthorized: scanned.refillsAuthorized,
    route: form === 'tablet' || form === 'capsule' ? 'oral' : undefined,
    sourceDetail: scanned.sourceDetail,
    confidence: scanned.confidence,
    verification: 'draft',
    inventory: scanned.quantityDispensed
      ? {
          currentCount: scanned.quantityDispensed,
          unit,
          refillThresholdDays: 5,
        }
      : undefined,
  }
  return { selected: true, medication }
}

export function ScanPrescriptionModal({
  api,
  open,
  onClose,
  onSaved,
}: {
  api: AppStateApi
  open: boolean
  onClose: () => void
  onSaved?: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [hints, setHints] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResponse | null>(null)
  const [draft, setDraft] = useState<PrescriptionDraft | null>(null)
  const [medications, setMedications] = useState<medicationDraft[]>([])
  const [status, setStatus] = useState<{ configured: boolean; model: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    getScanStatus().then(setStatus)
  }, [open])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setError(null)
    setResult(null)
    setDraft(null)
    setMedications([])
  }

  const chooseFile = (selected: File | undefined) => {
    if (!selected) return
    if (!selected.type.startsWith('image/')) {
      setError('Choose a PNG, JPEG, or WEBP image.')
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    setError(null)
    setResult(null)
  }

  const runScan = async () => {
    if (!file) return
    setScanning(true)
    setError(null)
    const { data, error: scanError } = await scanPrescription(file, hints)
    setScanning(false)
    if (!data) {
      setError(scanError ?? 'Scanning is unavailable.')
      return
    }
    setResult(data)
    setDraft({
      status: 'draft',
      issuedDate: data.prescription.issuedDate,
      documentDate: data.prescription.documentDate,
      prescriberName: data.prescription.prescriberName,
      prescriberSpecialty: data.prescription.prescriberSpecialty,
      clinicName: data.prescription.clinicName,
      prescriberPhone: data.prescription.prescriberPhone,
      pharmacyName: data.prescription.pharmacyName,
      pharmacyPhone: data.prescription.pharmacyPhone,
      pharmacyBillDate: data.prescription.pharmacyBillDate,
      billNumber: data.prescription.billNumber,
      directionsText: data.prescription.directionsText,
      durationDays: data.prescription.durationDays,
      refillsAuthorized: data.prescription.refillsAuthorized,
      confidence: data.prescription.confidence,
      notes: undefined,
      source: {
        imageRef: '',
        fileName: file.name,
        mimeType: file.type,
        sha256: data.sha256,
        capturedAt: new Date(file.lastModified).toISOString(),
        scannedAt: new Date().toISOString(),
        kind: data.prescription.kind ?? 'prescription',
        ocrText: data.prescription.ocrText,
      },
    })
    setMedications(data.medications.map(toMedicationDraft))
  }

  const startManual = () => {
    if (!file) return
    setDraft({
      status: 'draft',
      source: {
        imageRef: '',
        fileName: file.name,
        mimeType: file.type,
        sha256: '',
        capturedAt: new Date(file.lastModified).toISOString(),
        scannedAt: new Date().toISOString(),
        kind: 'prescription',
      },
    })
    setMedications([])
    setResult(null)
  }

  const updateDraft = <K extends keyof PrescriptionDraft>(key: K, value: PrescriptionDraft[K]) => {
    if (!draft) return
    setDraft({ ...draft, [key]: value })
  }

  const updateSource = <K extends keyof Prescription['source']>(
    key: K,
    value: Prescription['source'][K],
  ) => {
    if (!draft) return
    setDraft({ ...draft, source: { ...draft.source, [key]: value } })
  }

  const updateMedication = (index: number, patch: Partial<Medication>) => {
    setMedications((current) =>
      current.map((item, position) =>
        position === index ? { ...item, medication: { ...item.medication, ...patch } } : item,
      ),
    )
  }

  const save = async () => {
    if (!draft || !file || saving) return
    setSaving(true)
    try {
      const imageRef = await saveImage(file)
      const thumbnail = await makeThumbnail(file)
      const prescription: Prescription = {
        ...draft,
        id: `rx-${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: 'active',
        source: { ...draft.source, imageRef, thumbnailDataUrl: thumbnail },
      }
      const selected = medications
        .filter((item) => item.selected)
        .map((item) => ({ ...item.medication, verification: 'confirmed' as const }))
      api.addPrescription(prescription, selected)
      reset()
      onClose()
      onSaved?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the image locally.')
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = useMemo(
    () => medications.filter((item) => item.selected).length,
    [medications],
  )

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Scan a prescription" wide>
      <div className="space-y-5">
        {status === null && (
          <div className="flex gap-3 rounded-2xl bg-[var(--warn-soft)] p-3 text-sm">
            <AlertTriangle size={20} style={{ color: 'var(--warn)' }} />
            <p>
              The scanning service is <strong>offline</strong>. Start the API service and add{' '}
              <code>GEMINI_API_KEY</code> to enable extraction, or enter the details manually.
            </p>
          </div>
        )}

        {status && !status.configured && (
          <div className="flex gap-3 rounded-2xl bg-[var(--warn-soft)] p-3 text-sm">
            <AlertTriangle size={20} style={{ color: 'var(--warn)' }} />
            <p>
              Gemini scanning is <strong>not configured</strong> on the API. Add{' '}
              <code>GEMINI_API_KEY</code> to the backend service, then reopen this dialog.
              You can still attach the image and enter the details yourself.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div>
            <span className="label">Document image</span>
            <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)] p-4 text-center">
              <Upload size={30} style={{ color: 'var(--accent)' }} />
              <span className="font-bold">{file ? file.name : 'Choose a photo or file'}</span>
              <span className="muted text-xs">PNG, JPEG, WEBP · up to 10 MB</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => chooseFile(event.target.files?.[0])}
              />
            </label>
          </div>
          <div>
            <span className="label">Preview</span>
            <div className="grid h-40 place-items-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
              {previewUrl ? (
                <img src={previewUrl} alt="Selected prescription" className="h-full w-full object-contain" />
              ) : (
                <ImageIcon size={38} className="muted" />
              )}
            </div>
          </div>
        </div>

        <Field label="Anything the scanner should know (optional)">
          <input
            className="input"
            value={hints}
            onChange={(event) => setHints(event.target.value)}
            placeholder="e.g. Meera, 68 years old"
          />
        </Field>

        {error && (
          <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-soft)] p-3 text-sm font-semibold" style={{ color: 'var(--danger)' }}>
            <AlertTriangle size={18} /> {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={runScan} disabled={!file || scanning || !status?.configured}>
            {scanning ? <Loader2 size={18} className="animate-spin" /> : <ScanLine size={18} />}
            {scanning ? 'Reading document…' : 'Extract dosage plan'}
          </Button>
          <Button variant="secondary" onClick={startManual} disabled={!file}>
            <FileText size={18} /> Enter manually
          </Button>
        </div>

        {result && result.warnings.length > 0 && (
          <Card className="bg-[var(--warn-soft)]">
            <p className="flex items-center gap-2 font-black">
              <AlertTriangle size={18} /> Check these before saving
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {result.warnings.map((warning) => <li key={warning}>• {warning}</li>)}
            </ul>
          </Card>
        )}

        {draft && (
          <div className="space-y-5 border-t border-[var(--border)] pt-5">
            <div>
              <h3 className="text-lg font-black">Document details</h3>
              <p className="muted text-sm">These become the source record for every medicine below.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Document type">
                  <select
                    className="input"
                    value={draft.source.kind}
                    onChange={(event) => updateSource('kind', event.target.value as PrescriptionSourceKind)}
                  >
                    {KIND_OPTIONS.map((kind) => (
                      <option key={kind} value={kind}>{kind.replace('_', ' ')}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Prescription date">
                  <input className="input" type="date" value={draft.issuedDate ?? ''} onChange={(event) => updateDraft('issuedDate', event.target.value)} />
                </Field>
                <Field label="Doctor name">
                  <input className="input" value={draft.prescriberName ?? ''} onChange={(event) => updateDraft('prescriberName', event.target.value)} placeholder="Dr Rao" />
                </Field>
                <Field label="Clinic / hospital">
                  <input className="input" value={draft.clinicName ?? ''} onChange={(event) => updateDraft('clinicName', event.target.value)} />
                </Field>
                <Field label="Pharmacy">
                  <input className="input" value={draft.pharmacyName ?? ''} onChange={(event) => updateDraft('pharmacyName', event.target.value)} />
                </Field>
                <Field label="Pharmacy phone">
                  <input className="input" value={draft.pharmacyPhone ?? ''} onChange={(event) => updateDraft('pharmacyPhone', event.target.value)} />
                </Field>
                <Field label="Bill number">
                  <input className="input" value={draft.billNumber ?? ''} onChange={(event) => updateDraft('billNumber', event.target.value)} />
                </Field>
                <Field label="Document / bill date">
                  <input className="input" type="date" value={draft.documentDate ?? ''} onChange={(event) => updateDraft('documentDate', event.target.value)} />
                </Field>
              </div>
              {draft.source.ocrText && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-bold underline">Text read from the image</summary>
                  <pre className="muted mt-2 whitespace-pre-wrap rounded-xl bg-[var(--surface-2)] p-3 text-xs">
                    {draft.source.ocrText}
                  </pre>
                </details>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black">Medicines to add</h3>
                <Badge tone="info">{selectedCount} selected</Badge>
              </div>
              {medications.length === 0 && (
                <p className="muted mt-2 text-sm">
                  No medicines were extracted. Add them with the “Add medicine” form, or attach the image and use it as the source record.
                </p>
              )}
              <div className="mt-3 space-y-3">
                {medications.map((item, index) => (
                  <Card key={item.medication.id} className="bg-[var(--surface-2)]">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-2 h-6 w-6 accent-[var(--accent)]"
                        checked={item.selected}
                        onChange={(event) =>
                          setMedications((current) =>
                            current.map((entry, position) =>
                              position === index ? { ...entry, selected: event.target.checked } : entry,
                            ),
                          )
                        }
                      />
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Brand">
                            <input
                              className="input"
                              value={item.medication.brandName}
                              onChange={(event) => updateMedication(index, { brandName: event.target.value })}
                            />
                          </Field>
                          <Field label="Strength">
                            <input
                              className="input"
                              value={item.medication.strength}
                              onChange={(event) => updateMedication(index, { strength: event.target.value })}
                            />
                          </Field>
                          <Field label="Times (HH:mm, comma separated)">
                            <input
                              className="input"
                              value={item.medication.schedule.times.join(', ')}
                              onChange={(event) =>
                                updateMedication(index, {
                                  schedule: {
                                    ...item.medication.schedule,
                                    times: event.target.value.split(',').map((time) => time.trim()).filter(Boolean),
                                  },
                                })
                              }
                            />
                          </Field>
                          <Field label="Food relation">
                            <select
                              className="input"
                              value={item.medication.foodRelation}
                              onChange={(event) =>
                                updateMedication(index, { foodRelation: event.target.value as Medication['foodRelation'] })
                              }
                            >
                              {Object.entries(FOOD_LABEL).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </Field>
                        </div>
                        {item.medication.directionsRaw && (
                          <p className="muted text-xs">Original line: “{item.medication.directionsRaw}”</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {item.medication.confidence !== undefined && (
                            <Badge tone={item.medication.confidence < 0.6 ? 'moderate' : 'info'}>
                              {Math.round(item.medication.confidence * 100)}% confidence
                            </Badge>
                          )}
                          {item.medication.sourceDetail && <Badge tone="neutral">{item.medication.sourceDetail}</Badge>}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button variant="secondary" onClick={() => { reset(); onClose() }}>Cancel</Button>
          <Button onClick={save} disabled={!draft || saving}>
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            Save source & selected medicines
          </Button>
        </div>
        <p className="muted text-xs">
          The image stays in this browser’s local storage. Gemini is used only to read it; the extracted plan is a draft until you confirm it.
        </p>
      </div>
    </Modal>
  )
}
