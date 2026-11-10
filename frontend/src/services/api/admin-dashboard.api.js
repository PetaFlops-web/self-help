import { http } from './http'
import { endpoints } from './endpoints'
import { adminReportsApi } from './admin-reports.api'
import { projectsApi } from './projects.api'

/**
 * Service agregator untuk Ringkasan Operasional Panel Admin (Fase F3).
 * Mengumpulkan metrik secara paralel via Promise.allSettled tanpa angka karangan.
 */
export const adminDashboardApi = {
  /**
   * Mengambil data ringkasan operasional berdasarkan peran pengguna aktif.
   * @param {string} [userRole] - 'admin' | 'verifikator' | 'peninjau'
   * @returns {Promise<Object>}
   */
  async getSummary(userRole = '') {
    const isAdmin = userRole === 'admin'
    const canReadAudit = isAdmin || userRole === 'peninjau'

    const queuePromise = adminReportsApi.list({ limit: 5, status: 'Dilaporkan' })
    const statsPromise = projectsApi.stats()
    const trendPromise = adminReportsApi.getTrend(14)
    const auditPromise = canReadAudit
      ? http.get(endpoints.adminAudit, { params: { limit: 10 } })
      : Promise.resolve(null)
    const etlErrorsPromise = isAdmin
      ? http.get(endpoints.adminEtlErrors, { params: { limit: 1 } })
      : Promise.resolve(null)
    const unmatchedPromise = isAdmin
      ? http.get(endpoints.adminEtlUnmatched, { params: { limit: 1 } })
      : Promise.resolve(null)
    const alertsPromise = isAdmin
      ? http.get(endpoints.adminNotifications, { params: { status_kirim: 'gagal', limit: 5 } })
      : Promise.resolve(null)

    const [
      queueRes,
      statsRes,
      trendRes,
      auditRes,
      etlErrorsRes,
      unmatchedRes,
      alertsRes,
    ] = await Promise.allSettled([
      queuePromise,
      statsPromise,
      trendPromise,
      auditPromise,
      etlErrorsPromise,
      unmatchedPromise,
      alertsPromise,
    ])

    // 1. Data antrean laporan
    let queueReports = []
    let totalReports = 0
    let totalByStatus = {}
    if (queueRes.status === 'fulfilled' && queueRes.value) {
      queueReports = queueRes.value.reports || []
      totalReports = queueRes.value.total ?? 0
      totalByStatus = queueRes.value.totalByStatus || {}
    }

    // 2. Data statistik risiko proyek
    let projectStats = {
      total_proyek: 0,
      kategori: { Rendah: 0, 'Perlu Perhatian': 0, Tinggi: 0 },
      rata_rata_skor: null,
    }
    if (statsRes.status === 'fulfilled' && statsRes.value) {
      projectStats = {
        total_proyek: statsRes.value.total_proyek ?? 0,
        kategori: statsRes.value.kategori || { Rendah: 0, 'Perlu Perhatian': 0, Tinggi: 0 },
        rata_rata_skor: statsRes.value.rata_rata_skor ?? null,
      }
    }

    // 2b. Data tren volume laporan 14 hari
    let dailyTrend = []
    if (trendRes.status === 'fulfilled' && Array.isArray(trendRes.value)) {
      dailyTrend = trendRes.value
    }

    // 3. Log audit terkini
    let recentAudit = []
    if (auditRes.status === 'fulfilled' && auditRes.value?.data?.audit_logs) {
      recentAudit = auditRes.value.data.audit_logs
    }

    // 4. Baris ETL error
    let etlErrorsTotal = null
    if (etlErrorsRes.status === 'fulfilled' && etlErrorsRes.value?.data) {
      etlErrorsTotal = etlErrorsRes.value.data.total ?? 0
    }

    // 5. Paket lelang belum cocok (SiRUP vs SPSE)
    let unmatchedTotal = null
    if (unmatchedRes.status === 'fulfilled' && unmatchedRes.value?.data) {
      unmatchedTotal = unmatchedRes.value.data.total ?? 0
    }

    // 6. Peringatan sistem (notifikasi surel gagal)
    let systemAlerts = []
    if (alertsRes.status === 'fulfilled' && alertsRes.value?.data?.notifications) {
      systemAlerts = alertsRes.value.data.notifications
    }

    return {
      kpi: {
        totalReports,
        waitingVerification: totalByStatus.Dilaporkan ?? 0,
        totalByStatus,
        etlErrorsTotal,
        unmatchedTotal,
      },
      projectStats,
      dailyTrend,
      queueReports,
      recentAudit,
      systemAlerts,
    }
  },
}
