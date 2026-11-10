import { http } from './http'
import { endpoints } from './endpoints'

/**
 * Service API untuk Log & Retensi Notifikasi Surel Pelapor (Fase F10).
 * Backend Fase 26:
 * - GET /api/admin/notifications (admin, peninjau)
 * - POST /api/admin/notifications/:id/retry (admin)
 * - POST /api/admin/notifications/retention (admin)
 */
export const adminNotificationsApi = {
  /**
   * Mengambil daftar log notifikasi surel pelapor dengan filter dan paginasi.
   * @param {{ tiket?: string, status_kirim?: string, limit?: number, offset?: number }} [params]
   * @returns {Promise<{ notifications: Array<Object>, total: number, limit: number, offset: number }>}
   */
  async list(params = {}) {
    const cleanParams = {}
    if (params.tiket && params.tiket.trim()) {
      cleanParams.tiket = params.tiket.trim()
    }
    if (params.status_kirim && params.status_kirim !== 'semua') {
      cleanParams.status_kirim = params.status_kirim
    }

    const limit = Math.min(Number(params.limit) || 20, 100)
    const offset = Math.max(Number(params.offset) || 0, 0)
    cleanParams.limit = limit
    cleanParams.offset = offset

    const { data } = await http.get(endpoints.adminNotifications, { params: cleanParams })
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memuat log notifikasi')
    }

    return {
      notifications: Array.isArray(data.notifications) ? data.notifications : [],
      total: data.total ?? 0,
      limit: data.limit ?? limit,
      offset: data.offset ?? offset,
    }
  },

  /**
   * Mengirim ulang notifikasi surel yang berstatus gagal.
   * @param {string} id - UUID notifikasi
   * @returns {Promise<{ id: string, status_kirim: string, percobaan: number }>}
   */
  async retry(id) {
    if (!id) throw new Error('ID notifikasi wajib diisi')
    const { data } = await http.post(endpoints.adminNotificationRetry(id))
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal mengirim ulang notifikasi')
    }
    return data.result || data
  },

  /**
   * Menjalankan prosedur retensi kontak surel pelapor.
   * @returns {Promise<{ tiket_dibersihkan: Array<string> }>}
   */
  async runRetention() {
    const { data } = await http.post(endpoints.adminNotificationRetention)
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal menjalankan retensi kontak')
    }
    return data.retention || { tiket_dibersihkan: [] }
  },
}
