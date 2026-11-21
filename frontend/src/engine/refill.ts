import type { Medication } from '../shared/contracts'
import { scheduledDosesPerDay } from './scheduler'

/**
 * Days of stock remaining, based on the scheduled doses per day.
 *
 * Returns `null` when the medication has no predictable schedule (`asNeeded`),
 * no recorded inventory, or a zero daily requirement.
 */
export function daysOfStockLeft(medication: Medication): number | null {
  const inventory = medication.inventory
  if (!inventory) return null

  const dosesPerDay = scheduledDosesPerDay(medication)
  if (dosesPerDay <= 0) return null

  const dailyUnits = dosesPerDay * medication.doseAmount
  if (!Number.isFinite(dailyUnits) || dailyUnits <= 0) return null

  return Math.max(0, Math.floor(inventory.currentCount / dailyUnits))
}
