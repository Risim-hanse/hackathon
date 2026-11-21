import type {
  BeersBook,
  InteractionBook,
  Medication,
  Profile,
  SafetyFinding,
  SafetyReport,
  SafetySeverity,
} from '../shared/contracts'
import { MAX_DAILY_MG } from '../shared/constants'
import beersData from '../data/beers.json'
import interactionsData from '../data/interactions.json'
import { expandGeneric, getBrandBook, normalizeName } from './brands'
import { daysOfStockLeft } from './refill'
import { scheduledDosesPerDay } from './scheduler'
import { scoreFromFindings } from './score'

const interactions = interactionsData as unknown as InteractionBook
const beers = beersData as unknown as BeersBook

const SEVERITY_ORDER: Record<SafetySeverity, number> = {
  major: 0,
  moderate: 1,
  minor: 2,
  info: 3,
}

interface MedicationComponents {
  medication: Medication
  components: string[]
  /** mg of each component per single dose, when known. */
  mgPerDose: Record<string, number>
}

function buildComponents(medication: Medication): MedicationComponents {
  const genericComponents = expandGeneric(medication.genericName)
  const ingredientComponents = (medication.activeIngredients ?? []).map((item) =>
    normalizeName(item.generic),
  )
  const components = Array.from(new Set([...genericComponents, ...ingredientComponents])).filter(
    Boolean,
  )

  const mgPerDose: Record<string, number> = {}

  for (const ingredient of medication.activeIngredients ?? []) {
    const generic = normalizeName(ingredient.generic)
    const mg = ingredient.mgPerUnit * medication.doseAmount
    mgPerDose[generic] = (mgPerDose[generic] ?? 0) + mg
  }

  if ((medication.activeIngredients ?? []).length === 0) {
    const parsed = /^(\d+(?:\.\d+)?)\s*mg$/i.exec(medication.strength.trim())
    if (parsed && components.length === 1) {
      mgPerDose[components[0]] = Number(parsed[1]) * medication.doseAmount
    }
  }

  return { medication, components, mgPerDose }
}

function knownGenerics(): Set<string> {
  const known = new Set<string>()
  for (const entry of Object.values(getBrandBook().brands)) {
    for (const component of expandGeneric(entry.generic)) known.add(component)
  }
  for (const rule of interactions.pairs) {
    known.add(normalizeName(rule.a))
    known.add(normalizeName(rule.b))
  }
  for (const rule of beers.rules) {
    for (const generic of rule.generics) known.add(normalizeName(generic))
  }
  for (const generic of Object.keys(MAX_DAILY_MG)) known.add(normalizeName(generic))
  return known
}

function activeMedications(medications: Medication[]): Medication[] {
  return medications.filter((medication) => medication.status === 'active')
}

function brandList(medications: Medication[]): string {
  const names = Array.from(new Set(medications.map((medication) => medication.brandName)))
  if (names.length <= 1) return names[0] ?? 'this medicine'
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

/* ------------------------------ detectors ------------------------------- */

function duplicateFindings(meds: MedicationComponents[]): SafetyFinding[] {
  const byComponent = new Map<string, Medication[]>()

  for (const entry of meds) {
    for (const component of entry.components) {
      const group = byComponent.get(component) ?? []
      group.push(entry.medication)
      byComponent.set(component, group)
    }
  }

  const findings: SafetyFinding[] = []
  for (const [component, medications] of byComponent) {
    const unique = Array.from(
      new Map(medications.map((medication) => [medication.id, medication])).values(),
    )
    if (unique.length < 2) continue

    findings.push({
      id: `duplicate:${component}`,
      category: 'duplicate',
      severity: 'moderate',
      title: `Two medicines contain ${component}`,
      plainLanguage: `${brandList(unique)} both contain ${component}. Taking both can accidentally double your dose.`,
      action: 'Check with your pharmacist before taking both. One of them may be unnecessary.',
      source: 'Curated brand-to-generic map (verify with your pharmacist)',
      relatedMedicationIds: unique.map((medication) => medication.id),
    })
  }
  return findings
}

function ceilingFindings(meds: MedicationComponents[]): SafetyFinding[] {
  const findings: SafetyFinding[] = []
  const flaggedUnknown = new Set<string>()

  for (const [component, limit] of Object.entries(MAX_DAILY_MG)) {
    const generic = normalizeName(component)
    const contributors = meds.filter((entry) => entry.components.includes(generic))
    if (contributors.length === 0) continue

    const unknown = contributors.filter((entry) => entry.mgPerDose[generic] === undefined)
    const known = contributors.filter((entry) => entry.mgPerDose[generic] !== undefined)

    const total = known.reduce((sum, entry) => {
      const mg = entry.mgPerDose[generic] ?? 0
      const perDay = scheduledDosesPerDay(entry.medication) * mg
      return sum + (Number.isFinite(perDay) ? perDay : 0)
    }, 0)

    if (total > limit) {
      findings.push({
        id: `ceiling:${generic}`,
        category: 'ceiling',
        severity: 'major',
        title: `Too much ${generic} in one day`,
        plainLanguage: `Your schedule adds up to ${Math.round(total)}mg of ${generic} a day. The usual adult limit is ${limit}mg a day.`,
        mechanism:
          'Taking more than the daily limit raises the risk of liver or organ damage, depending on the medicine.',
        action: 'Do not take extra doses. Call your doctor or pharmacist today to review this schedule.',
        source: 'Product labeling; common adult maximum daily dose',
        relatedMedicationIds: contributors.map((entry) => entry.medication.id),
      })
    }

    if (unknown.length > 0 && !flaggedUnknown.has(generic)) {
      flaggedUnknown.add(generic)
      findings.push({
        id: `ceiling-unknown:${generic}`,
        category: 'ceiling',
        severity: 'info',
        title: `We could not check your daily ${generic} total`,
        plainLanguage: `Some of your medicines do not list how much ${generic} each dose contains. We could not add up your daily total.`,
        action: 'Ask your pharmacist to confirm the strength and your daily limit.',
        relatedMedicationIds: unknown.map((entry) => entry.medication.id),
      })
    }
  }

  return findings
}

function interactionFindings(meds: MedicationComponents[]): SafetyFinding[] {
  const findings: SafetyFinding[] = []

  for (const rule of interactions.pairs) {
    const a = normalizeName(rule.a)
    const b = normalizeName(rule.b)

    const medsWithA = meds.filter((entry) => entry.components.includes(a))
    const medsWithB = meds.filter((entry) => entry.components.includes(b))

    const crossPairs: Array<[MedicationComponents, MedicationComponents]> = []
    for (const left of medsWithA) {
      for (const right of medsWithB) {
        if (left.medication.id !== right.medication.id) crossPairs.push([left, right])
      }
    }
    if (crossPairs.length === 0) continue

    const involved = Array.from(
      new Map(
        crossPairs
          .flatMap(([left, right]) => [left.medication, right.medication])
          .map((medication) => [medication.id, medication]),
      ).values(),
    )

    findings.push({
      id: `interaction:${a}+${b}`,
      category: 'interaction',
      severity: rule.severity,
      title: rule.title,
      plainLanguage: `${brandList(involved)} can affect each other. Taking them together may cause serious side effects.`,
      mechanism: rule.mechanism,
      action: rule.action,
      source: rule.source,
      relatedMedicationIds: involved.map((medication) => medication.id),
    })
  }

  return findings
}

function beersFindings(meds: MedicationComponents[], profile: Profile): SafetyFinding[] {
  if (profile.age === undefined || profile.age < 65) return []

  const findings: SafetyFinding[] = []
  for (const rule of beers.rules) {
    if (profile.age < rule.minAge) continue
    const generics = rule.generics.map(normalizeName)
    const matches = meds.filter((entry) =>
      entry.components.some((component) => generics.includes(component)),
    )
    if (matches.length === 0) continue

    findings.push({
      id: `beers:${rule.id}`,
      category: 'beers',
      severity: rule.severity,
      title: rule.title,
      plainLanguage: rule.plainLanguage,
      action: rule.action,
      source: rule.source,
      relatedMedicationIds: matches.map((entry) => entry.medication.id),
    })
  }
  return findings
}

function unknownFindings(meds: MedicationComponents[]): SafetyFinding[] {
  const known = knownGenerics()
  const findings: SafetyFinding[] = []

  for (const entry of meds) {
    const unknown = entry.components.filter((component) => !known.has(component))
    if (entry.components.length === 0) {
      findings.push({
        id: `unknown:${entry.medication.id}`,
        category: 'interaction',
        severity: 'info',
        title: 'We could not identify this medicine',
        plainLanguage: `${entry.medication.brandName} is not in our curated list, so we could not check it for duplicates or interactions.`,
        action: 'Ask your pharmacist to confirm the generic name. Do not assume it is safe to combine.',
        relatedMedicationIds: [entry.medication.id],
      })
    } else if (unknown.length > 0) {
      findings.push({
        id: `unknown:${entry.medication.id}`,
        category: 'interaction',
        severity: 'info',
        title: `Not in our curated list: ${entry.medication.brandName}`,
        plainLanguage: `We do not have interaction data for ${unknown.join(', ')}. That does not mean it is safe to combine with your other medicines.`,
        action: 'Ask your pharmacist to review this medicine with your full list.',
        relatedMedicationIds: [entry.medication.id],
      })
    }
  }

  return findings
}

function refillFindings(meds: Medication[]): SafetyFinding[] {
  const findings: SafetyFinding[] = []

  for (const medication of meds) {
    const inventory = medication.inventory
    if (!inventory) continue
    const daysLeft = daysOfStockLeft(medication)
    if (daysLeft === null) continue
    if (daysLeft > inventory.refillThresholdDays) continue

    const urgent = daysLeft <= 0
    findings.push({
      id: `refill:${medication.id}`,
      category: 'refill',
      severity: urgent ? 'moderate' : 'minor',
      title: urgent
        ? `You may have run out of ${medication.brandName}`
        : `${medication.brandName} is running low`,
      plainLanguage: urgent
        ? `Your recorded stock for ${medication.brandName} is empty or less than one day.`
        : `At your current schedule, your recorded stock of ${medication.brandName} lasts about ${daysLeft} more day${daysLeft === 1 ? '' : 's'}.`,
      action: 'Refill this medicine before your next dose. Do not skip doses to stretch the supply.',
      relatedMedicationIds: [medication.id],
    })
  }

  return findings
}

/* -------------------------------- engine -------------------------------- */

/**
 * Deterministic, local clinical safety review.
 *
 * The checklist is curated and incomplete by design. Every finding carries an
 * explanation, an action, and (where applicable) a source. Unknown medicines
 * produce an info finding; the engine never claims that a regimen is safe.
 */
export function analyzeRegimen(
  medications: Medication[],
  profile: Profile,
  now: Date,
): SafetyReport {
  const active = activeMedications(medications)
  const components = active.map(buildComponents)

  const findings: SafetyFinding[] = [
    ...duplicateFindings(components),
    ...ceilingFindings(components),
    ...interactionFindings(components),
    ...beersFindings(components, profile),
    ...refillFindings(active),
    ...unknownFindings(components),
  ].sort((left, right) => {
    const severity = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity]
    return severity !== 0 ? severity : left.title.localeCompare(right.title)
  })

  const { score, band } = scoreFromFindings(findings)

  return {
    score,
    band,
    findings,
    checkedAt: now.toISOString(),
  }
}
