import { http } from './http'
import { endpoints } from './endpoints'
import { toReportPayload, toReportResult } from './mappers'

export const reportsApi = {
  /**
   * Mengirim laporan warga ke endpoint POST /reports.
   * @param {Record<string, any>} form
   * @returns {Promise<{ trackingCode: string, status: string }>}
   */
  async create(form) {
    const payload = toReportPayload(form)
    const { data } = await http.post(endpoints.reports, payload)
    return toReportResult(data)
  },

  /**
   * TODO: Konfirmasi path backend untuk melacak laporan.
   * @param {string} code
   */
  async track(code) {
    return (await http.get(endpoints.trackReport(code))).data
  },
}

