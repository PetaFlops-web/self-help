import { http } from './http'
import { endpoints } from './endpoints'

/**
 * Service API untuk Manajemen Data & Pipa ETL (Fase F8).
 * Backend Fase 22-25: /api/sources, /api/admin/etl/*
 */
export const adminEtlApi = {
  /**
   * Mengambil daftar seluruh sumber data publik (SRC-01 s/d SRC-08).
   * @returns {Promise<Array<Object>>}
   */
  async listSources() {
    const { data } = await http.get(endpoints.sources)
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memuat sumber data')
    }
    return Array.isArray(data) ? data : data?.sources || []
  },

  /**
   * Memicu eksekusi pipa ETL untuk sumber data tertentu.
   * @param {{ source_id: string, csv_content?: string, source_url?: string }} payload
   * @returns {Promise<Object>}
   */
  async runEtl(payload) {
    const body = {
      source_id: payload.source_id,
      csv_content: payload.csv_content || '',
      source_url: payload.source_url || 'https://inaproc.id/api/v1/mock',
    }
    const { data } = await http.post(endpoints.adminEtlRun, body)
    if (data?.status === 'error') {
      throw new Error(data.message || 'Eksekusi pipa ETL gagal')
    }
    return data
  },

  /**
   * Mengunggah berkas CSV atau JSON hasil ekspor resmi pemerintah untuk diproses pipa ETL (Fase 24).
   * @param {File} file
   * @param {string} sourceId
   * @param {string} [sourceUrl]
   * @returns {Promise<Object>}
   */
  async importFile(file, sourceId, sourceUrl = '') {
    if (!file) throw new Error('Berkas CSV/JSON wajib dipilih')
    if (!sourceId) throw new Error('ID sumber data wajib diisi')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('source_id', sourceId)
    if (sourceUrl) formData.append('source_url', sourceUrl)

    const { data } = await http.post(endpoints.adminEtlImport, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal mengimpor berkas ETL')
    }
    return data
  },

  /**
   * Mengambil daftar baris anomali validasi ETL.
   * @param {{ source_id?: string, limit?: number, offset?: number }} [params]
   * @returns {Promise<{ errors: Array<Object>, total: number, limit: number, offset: number }>}
   */
  async listErrors(params = {}) {
    const cleanParams = {}
    if (params.source_id) cleanParams.source_id = params.source_id
    const limit = Math.min(Number(params.limit) || 20, 100)
    const offset = Math.max(Number(params.offset) || 0, 0)
    cleanParams.limit = limit
    cleanParams.offset = offset

    const { data } = await http.get(endpoints.adminEtlErrors, { params: cleanParams })
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memuat daftar anomali ETL')
    }
    return {
      errors: Array.isArray(data.etl_errors) ? data.etl_errors : [],
      total: data.total ?? 0,
      limit: data.limit ?? limit,
      offset: data.offset ?? offset,
    }
  },

  /**
   * Mengambil antrean paket lelang yang belum cocok antarsumber (SiRUP vs SPSE).
   * @param {{ limit?: number, offset?: number }} [params]
   * @returns {Promise<{ unmatched: Array<Object>, total: number, limit: number, offset: number }>}
   */
  async listUnmatched(params = {}) {
    const limit = Math.min(Number(params.limit) || 20, 100)
    const offset = Math.max(Number(params.offset) || 0, 0)
    const cleanParams = { limit, offset }

    const { data } = await http.get(endpoints.adminEtlUnmatched, { params: cleanParams })
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memuat antrean paket belum cocok')
    }
    return {
      unmatched: Array.isArray(data.unmatched) ? data.unmatched : [],
      total: data.total ?? 0,
      limit: data.limit ?? limit,
      offset: data.offset ?? offset,
    }
  },

  /**
   * Menyimpan keputusan pencocokan paket secara manual.
   * @param {{ unmatched_id: string, matched_id: string, decision: 'match' | 'not_match' }} payload
   * @returns {Promise<Object>}
   */
  async matchDecision(payload) {
    const body = {
      unmatched_id: payload.unmatched_id,
      matched_id: payload.matched_id,
      decision: payload.decision,
    }
    const { data } = await http.post(endpoints.adminEtlMatch, body)
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memproses keputusan pencocokan')
    }
    return data
  },
}
