/**
 * Definisi tipe JSDoc untuk fitur Dashboard.
 */

/** @typedef {import('@/services/api/projects.api').RiskLevel} RiskLevel */

/**
 * @typedef {Object} DashboardProject
 * @property {string} title - Judul proyek
 * @property {string} [titleHtml] - Format HTML judul proyek
 * @property {string} meta - Informasi instansi dan pelaksana
 * @property {string[]} tags - Tag proyek
 * @property {string} budgetLabel - Label pagu anggaran
 * @property {number} reportCount - Jumlah laporan warga
 * @property {number} lat - Latitude koordinat proyek
 * @property {number} lng - Longitude koordinat proyek
 * @property {number} riskScore - Skor risiko (0-100)
 * @property {string} riskLabel - Label tingkat risiko (Tinggi/Perlu Perhatian/Rendah)
 * @property {string} disclaimer - Catatan keabsahan data simulasi
 */

/** @typedef {{ label: string, value: number }} RiskDimensionPoint */
/** @typedef {{ key: string, icon: string, title: string, description: string, meta: string, level: RiskLevel, label: string }} RiskIndicator */

/**
 * @typedef {Object} NearbyReport
 * @property {string} code - Kode laporan (misal: LPR-0142)
 * @property {string} distance - Jarak relatif dari titik proyek
 * @property {string} status - Status tindak lanjut laporan
 * @property {RiskLevel} level - Tingkat risiko laporan
 * @property {number} lat - Latitude koordinat laporan
 * @property {number} lng - Longitude koordinat laporan
 */

/** @typedef {{ label: string, value: string, accent?: boolean }} FundStep */
/** @typedef {{ steps: FundStep[], paidPercent: number, paidLabel: string, unpaidLabel: string, note: string }} FundFlow */
/** @typedef {{ label: string, paid: number, done: number }} PaymentStage */
/** @typedef {{ no: string, title: string, text: string, active?: boolean }} AnalysisStep */
/** @typedef {{ item: string, budget: string, benchmark: string, diff: string, level: RiskLevel, label: string }} CostRow */
/** @typedef {{ createdAt: string, status: string, steps: AnalysisStep[], rows: CostRow[], formulaNote: string, validationNote: string, explanation: string[], chips: string[] }} AiAnalysis */

/**
 * @typedef {Object} DashboardData
 * @property {DashboardProject} project
 * @property {NearbyReport[]} nearbyReports
 * @property {RiskDimensionPoint[]} dimensions
 * @property {RiskIndicator[]} indicators
 * @property {FundFlow} fund
 * @property {PaymentStage[]} stages
 * @property {AiAnalysis} ai
 */

export {}
