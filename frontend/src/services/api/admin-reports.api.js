import { http } from './http'
import { endpoints } from './endpoints'

/**
 * @typedef {import('./auth.api').UserRole} UserRole
 */

/**
 * @typedef {Object} AdminReportListItem
 * @property {string} tiket
 * @property {string | null} kategori
 * @property {string} status
 * @property {string | null} dibuat_pada
 * @property {{ nama: string | null, kabupaten: string | null, kode_bps: string | null } | null} proyek
 */

/**
 * @typedef {Object} AdminReportDetail
 * @property {string} tiket
 * @property {string | null} proyek_id
 * @property {string | null} kategori
 * @property {string | null} keterangan
 * @property {string | null} lat
 * @property {string | null} lng
 * @property {string[] | null} foto_urls
 * @property {boolean} anonim
 * @property {string} status
 * @property {string | null} alasan_tolak
 * @property {string | null} catatan_verifikator
 * @property {string | null} lembaga_tujuan
 * @property {string | null} diteruskan_pada
 * @property {string | null} dibuat_pada
 * @property {string | null} diubah_pada
 * @property {{ nama: string | null, kabupaten: string | null, kode_bps: string | null } | null} proyek
 */

export const adminReportsApi = {
  /**
   * Mengambil daftar laporan admin dengan filter + paginasi.
   * Backend membatasi limit maksimum 100.
   * @param {{ status?: string, kategori?: string, kode_bps?: string, limit?: number, offset?: number }} [params]
   * @returns {Promise<{ reports: AdminReportListItem[], total: number, totalByStatus: Record<string, number>, limit: number, offset: number }>}
   */
  async list(params = {}) {
    const cleanParams = {}
    if (params.status) cleanParams.status = params.status
    if (params.kategori) cleanParams.kategori = params.kategori
    if (params.kode_bps) cleanParams.kode_bps = params.kode_bps
    // Hormati batas maksimum 100 milik backend
    const limit = Math.min(Number(params.limit) || 50, 100)
    const offset = Math.max(Number(params.offset) || 0, 0)
    cleanParams.limit = limit
    cleanParams.offset = offset

    const { data } = await http.get(endpoints.adminReports, { params: cleanParams })
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memuat daftar laporan')
    }
    return {
      reports: Array.isArray(data.reports) ? data.reports : [],
      total: data.total ?? 0,
      totalByStatus: data.total_by_status ?? {},
      limit: data.limit ?? limit,
      offset: data.offset ?? offset,
    }
  },

  /**
   * Mengambil detail laporan berdasarkan tiket.
   * @param {string} tiket
   * @returns {Promise<AdminReportDetail>}
   */
  async getDetail(tiket) {
    const { data } = await http.get(endpoints.adminReport(tiket))
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memuat detail laporan')
    }
    return data.report
  },

  /**
   * Mengambil tren volume laporan deret waktu harian (default 14 hari).
   * @param {number} [days=14]
   * @returns {Promise<Array<{ tanggal: string, total_masuk: number, diverifikasi: number, selesai: number }>>}
   */
  async getTrend(days = 14) {
    const { data } = await http.get(endpoints.adminReportsTrend, { params: { days } })
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memuat tren laporan')
    }
    return Array.isArray(data.trend) ? data.trend : []
  },

  /**
   * Memperbarui status laporan (verifikasi/tolak/dst) lewat PATCH.
   * @param {string} tiket
   * @param {{ status: string, catatan_verifikator?: string, alasan_tolak?: string }} input
   * @returns {Promise<AdminReportDetail>}
   */
  async verify(tiket, input) {
    const body = { status: input.status }
    if (input.catatan_verifikator) body.catatan_verifikator = input.catatan_verifikator
    if (input.alasan_tolak) body.alasan_tolak = input.alasan_tolak

    const { data } = await http.patch(endpoints.adminReport(tiket), body)
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memperbarui status laporan')
    }
    return data.report
  },

  /**
   * Meneruskan laporan ke lembaga terkait lewat POST forward.
   * @param {string} tiket
   * @param {string} lembaga
   * @returns {Promise<AdminReportDetail>}
   */
  async forward(tiket, lembaga) {
    const { data } = await http.post(endpoints.adminReportForward(tiket), { lembaga })
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal meneruskan laporan')
    }
    return data.report
  },
}
