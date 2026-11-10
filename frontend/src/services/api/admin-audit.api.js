import { http } from './http'
import { endpoints } from './endpoints'

/**
 * Service API untuk Log Audit Panel Admin (Fase F4).
 * Backend Fase 20: GET /api/admin/audit.
 * Hanya dapat diakses oleh peran 'admin' dan 'peninjau'.
 */
export const adminAuditApi = {
  /**
   * Mengambil daftar log audit dengan filter dan paginasi.
   * @param {{ modul?: string, aktor_id?: string, start_date?: string, end_date?: string, limit?: number, offset?: number }} [params]
   * @returns {Promise<{ logs: Array<Object>, total: number, limit: number, offset: number }>}
   */
  async list(params = {}) {
    const cleanParams = {}
    if (params.modul) cleanParams.modul = params.modul
    if (params.aktor_id) cleanParams.aktor_id = params.aktor_id
    if (params.start_date) cleanParams.start_date = params.start_date
    if (params.end_date) cleanParams.end_date = params.end_date

    // Batas aman backend maks 100 baris
    const limit = Math.min(Number(params.limit) || 50, 100)
    const offset = Math.max(Number(params.offset) || 0, 0)
    cleanParams.limit = limit
    cleanParams.offset = offset

    const { data } = await http.get(endpoints.adminAudit, { params: cleanParams })
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memuat log audit')
    }

    return {
      logs: Array.isArray(data.audit_logs) ? data.audit_logs : [],
      total: data.total ?? 0,
      limit: data.limit ?? limit,
      offset: data.offset ?? offset,
    }
  },
}
