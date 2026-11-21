import type { SafetyBand, SafetyFinding } from '../shared/contracts'
import { SAFETY_BANDS, SCORE_WEIGHTS } from '../shared/constants'

export function bandForScore(score: number): SafetyBand {
  if (score >= SAFETY_BANDS.safe) return 'safe'
  if (score >= SAFETY_BANDS.review) return 'review'
  return 'high_risk'
}

/** Heuristic 0-100 score. Not a clinical grade. */
export function scoreFromFindings(findings: SafetyFinding[]): {
  score: number
  band: SafetyBand
} {
  let score = 100
  for (const finding of findings) {
    if (finding.category === 'beers') {
      score -= SCORE_WEIGHTS.beers
    } else if (finding.category === 'duplicate') {
      score -= SCORE_WEIGHTS.duplicate
    } else if (finding.severity === 'major') {
      score -= SCORE_WEIGHTS.major
    } else if (finding.severity === 'moderate') {
      score -= SCORE_WEIGHTS.moderate
    } else if (finding.severity === 'minor') {
      score -= SCORE_WEIGHTS.minor
    }
  }
  const clamped = Math.max(0, Math.min(100, score))
  return { score: clamped, band: bandForScore(clamped) }
}
