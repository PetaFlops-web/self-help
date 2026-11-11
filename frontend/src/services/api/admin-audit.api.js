import { http } from './http'
import { endpoints } from './endpoints'

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Mengonversi tanggal 'YYYY-MM-DD' menjadi batas awal/akhir hari waktu lokal
 * dalam format ISO-8601 UTC agar filter PostgreSQL ::timestamptz akurat.
 * Nilai timestamp lengkap diteruskan apa adanya.
 * @param {string | undefined | null} value
 * @param {'start' | 'end'} boundary
 * @returns {string | undefined}
 */
export function normalizeAuditDateBoundary(value, boundary) {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const match = DATE_ONLY_PATTERN.exec(trimmed)
  if (!match) return trimmed

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = boundary === 'end'
    ? new Date(year, month, day, 23, 59, 59, 999)
    : new Date(year, month, day, 0, 0, 0, 0)

  if (Number.isNaN(date.getTime())) return undefined
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return undefined
  }
  return date.toISOString()
}

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

    const startDate = normalizeAuditDateBoundary(params.start_date, 'start')
    const endDate = normalizeAuditDateBoundary(params.end_date, 'end')
    if (startDate) cleanParams.start_date = startDate
    if (endDate) cleanParams.end_date = endDate

    // Batas aman backend maks 100 baris
    const limit = Math.min(Math.max(Number(params.limit) || 50, 1), 100)
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
