import { reactive, toRef } from 'vue'
import { dashboardApi } from '../services/dashboard.api'

/** @typedef {import('../types/dashboard').DashboardProject} DashboardProject */
/** @typedef {import('../types/dashboard').RiskDimensionPoint} RiskDimensionPoint */
/** @typedef {import('../types/dashboard').RiskIndicator} RiskIndicator */
/** @typedef {import('../types/dashboard').NearbyReport} NearbyReport */
/** @typedef {import('../types/dashboard').PaymentStage} PaymentStage */
/** @typedef {import('../types/dashboard').AnalysisStep} AnalysisStep */
/** @typedef {import('../types/dashboard').CostRow} CostRow */
/** @typedef {import('../types/dashboard').DashboardData} DashboardData */

const initial = dashboardApi.getMockDashboard()

const state = reactive({
  project: { ...initial.project },
  nearbyReports: [...initial.nearbyReports],
  dimensions: [...initial.dimensions],
  indicators: [...initial.indicators],
  fund: { ...initial.fund },
  stages: [...initial.stages],
  ai: { ...initial.ai },
  loading: false,
  loaded: false,
  error: '',
  aiLoading: false,
  aiLoaded: false,
})

let activeFetchPromise = null

/**
 * Memuat data async dari API dengan status loading dan penanganan galat nyata.
 * @param {boolean} [force=false]
 */
// Ubah parameternya agar bisa menerima force (true/false) atau ID (string)
async function loadData(forceOrId = false) {
  // Pisahkan: mana yang jadi ID, mana yang jadi 'force'
  const requestedId = typeof forceOrId === 'string' ? forceOrId : null
  const force = typeof forceOrId === 'boolean' ? forceOrId : false

  // Tambahkan kondisi: izinkan fetch ulang jika ada requestedId
  if (state.loaded && !force && !requestedId) return
  if (activeFetchPromise) return activeFetchPromise

  state.loading = true
  state.error = ''

  activeFetchPromise = (async () => {
    try {
      const data = await dashboardApi.getDashboard(requestedId)
      if (data) {
        if (data.project) Object.assign(state.project, data.project)
        if (data.nearbyReports) state.nearbyReports.splice(0, state.nearbyReports.length, ...data.nearbyReports)
        if (data.dimensions) state.dimensions.splice(0, state.dimensions.length, ...data.dimensions)
        if (data.indicators) state.indicators.splice(0, state.indicators.length, ...data.indicators)
        if (data.fund) Object.assign(state.fund, data.fund)
        if (data.stages) state.stages.splice(0, state.stages.length, ...data.stages)
        if (data.ai) Object.assign(state.ai, data.ai)
        state.loaded = true

        // Muat penjelasan AI secara terpisah & non-blocking: data utama sudah
        // tampil, section AI menampilkan skeleton sendiri sampai explain balik.
        void loadExplanation(state.project.id)
      }
    } catch {
      state.loaded = false
      state.error = 'Backend belum dapat diakses; data simulasi ditampilkan.'
    } finally {
      state.loading = false
      activeFetchPromise = null
    }
  })()

  return activeFetchPromise
}

/**
 * Memuat penjelasan AI (explain) secara terpisah dari data utama. Men-set
 * aiLoading selama berjalan; mengisi state.ai bila sukses. Gagal → biarkan
 * explanation apa adanya (mock/placeholder), aiLoading tetap dimatikan.
 * @param {string} projectId
 */
async function loadExplanation(projectId) {
  if (!projectId) return
  state.aiLoading = true
  state.aiLoaded = false
  try {
    const result = await dashboardApi.getExplanation(projectId)
    if (result) {
      state.ai.explanation = result.explanation
      state.ai.chips = result.chips
      state.aiLoaded = true
    }
  } finally {
    state.aiLoading = false
  }
}

/**
 * Composable untuk menyediakan data dashboard yang bersumber dari API service/mocks.
 * Mengembalikan state reaktif beserta status loading dan pesan galat.
 */
export function useDashboardData() {
  if (!state.loaded && !state.loading) {
    void loadData()
  }

  return {
    project: state.project,
    nearbyReports: state.nearbyReports,
    dimensions: state.dimensions,
    indicators: state.indicators,
    fund: state.fund,
    stages: state.stages,
    ai: state.ai,
    loading: toRef(state, 'loading'),
    aiLoading: toRef(state, 'aiLoading'),
    error: toRef(state, 'error'),
    loadData,
  }
}
