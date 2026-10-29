import { http } from './http'
import { endpoints } from './endpoints'
import { toReportPayload, toReportResult } from './mappers'

export const reportsApi = {
  /**
   * Mengirim laporan warga ke endpoint POST /reports.
   * @param {Record<string, any>} form
   * @returns {Promise<{ trackingCode: string, status: string }>}
   */
  async create(form, files = []) {
    const payload = toReportPayload(form, files)
    // Override default JSON header: set multipart + biarkan axios/browser isi boundary.
    const { data } = await http.post(endpoints.reports, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
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

