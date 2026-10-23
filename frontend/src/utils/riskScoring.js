/** @typedef {import('@/services/api/projects.api').RiskLevel} RiskLevel */

/** @param {number} score @returns {RiskLevel} */
export function getRiskLevel(score) {
  if (score >= 66) return 'high'
  if (score >= 35) return 'attention'
  return 'low'
}
/** @param {RiskLevel} level @returns {string} */
export function getRiskLabel(level) {
  return ({ low: 'Rendah', attention: 'Perlu perhatian', high: 'Tinggi' })[level]
}
export function clampScore(score) { return Math.max(0, Math.min(100, Math.round(score))) }
