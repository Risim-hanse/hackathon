import type { BrandBook, BrandEntry } from '../shared/contracts'
import brandBook from '../data/brands.json'

const book = brandBook as unknown as BrandBook

export function normalizeName(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Resolve a brand name to its generic(s). Returns null when unknown. */
export function resolveBrand(input: string): BrandEntry | null {
  const key = normalizeName(input)
  if (!key) return null
  return book.brands[key] ?? null
}

/** Split a generic string into individual active ingredients. */
export function expandGeneric(genericName: string): string[] {
  return genericName
    .split('+')
    .map((part) => normalizeName(part))
    .filter(Boolean)
}

export function getBrandBook(): BrandBook {
  return book
}
