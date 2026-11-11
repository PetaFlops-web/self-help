import { http } from './http'
import { endpoints } from './endpoints'

/**
 * Service API untuk Manajemen Proyek & Tender Panel Admin (Fase F7).
 * Dasar: PRD §7 Amandemen CRUD & SRS v1.3 §9.
 *
 * Pagar Pengaman Wajib:
 * - Dilarang keras mengirim field `skor_total` atau `kategori` pada mutasi data.
 * - Skor dihitung murni di backend dan dibaca sebagai tampilan informatif.
 */

// Helper sanitasi: hapus properti yang terkait perhitungan skor
function sanitizeProjectPayload(payload) {
  const clean = { ...payload }
  delete clean.skor_total
  delete clean.kategori
  delete clean.skor
  delete clean.score
  delete clean.indikator
  delete clean.indicators
  return clean
}

export const adminProjectsApi = {
  /**
   * Mengambil daftar proyek dengan filter pengawasan & paginasi.
   * @param {{ search?: string, dinas?: string, kode_bps?: string, kategori?: string, asal_data?: string, tahun_anggaran?: number|string, limit?: number, offset?: number }} [params]
   * @returns {Promise<{ projects: Array<Object>, total: number, limit: number, offset: number, kpi?: Object }>}
   */
  async list(params = {}) {
    const cleanParams = {}
    const rawQuery = params.q ?? params.search
    if (typeof rawQuery === 'string' && rawQuery.trim()) cleanParams.q = rawQuery.trim()
    if (params.dinas && params.dinas !== 'semua') cleanParams.dinas = params.dinas
    if (params.kode_bps && params.kode_bps !== 'semua') cleanParams.kode_bps = params.kode_bps
    if (params.kategori && params.kategori !== 'semua') cleanParams.kategori = params.kategori
    if (params.asal_data && params.asal_data !== 'semua') cleanParams.asal_data = params.asal_data
    if (params.tahun_anggaran && params.tahun_anggaran !== 'semua') cleanParams.tahun_anggaran = params.tahun_anggaran
    if (params.has_waiting_reports) cleanParams.has_waiting_reports = 'true'
    if (params.match_status && params.match_status !== 'semua') cleanParams.match_status = params.match_status

    const limit = Math.min(Number(params.limit) || 10, 100)
    const offset = Math.max(Number(params.offset) || 0, 0)
    cleanParams.limit = limit
    cleanParams.offset = offset

    try {
      const { data } = await http.get(endpoints.projects, { params: cleanParams })
      if (data?.status === 'error') {
        throw new Error(data.message || 'Gagal memuat daftar proyek')
      }

      const rows = Array.isArray(data.projects)
        ? data.projects
        : Array.isArray(data.data)
          ? data.data
          : []

      return {
        projects: rows,
        total: data.total ?? rows.length,
        limit: data.limit ?? limit,
        offset: data.offset ?? offset,
        kpi: data.kpi || null,
      }
    } catch (err) {
      // Fallback ke endpoint publik jika endpoint admin backend belum aktif
      if (err.response?.status === 404) {
        const { data: pubData } = await http.get(endpoints.projects, { params: cleanParams })
        const pubRows = Array.isArray(pubData.projects)
          ? pubData.projects
          : Array.isArray(pubData.data)
            ? pubData.data
            : []
        return {
          projects: pubRows,
          total: pubData.total ?? pubRows.length,
          limit: pubData.limit ?? limit,
          offset: pubData.offset ?? offset,
          kpi: null,
        }
      }
      throw err
    }
  },

  /**
   * Mengambil detail proyek untuk form admin.
   * Memanggil langsung endpoint resmi GET /api/projects/:id tanpa galat 404 redundant.
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async get(id) {
    if (!id) throw new Error('ID proyek wajib diisi')
    const { data } = await http.get(endpoints.project(id))
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memuat detail proyek')
    }
    return data.project || data.data || data
  },

  /**
   * Menambahkan proyek baru secara manual (SRS §9.2).
   * @param {Object} payload
   * @returns {Promise<{ data: Object, skor_sebelum?: number, skor_sesudah?: number, kategori?: string }>}
   */
  async create(payload) {
    const clean = sanitizeProjectPayload(payload)
    const { data } = await http.post(endpoints.adminProjects, clean)
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal menyimpan proyek baru')
    }
    return data
  },

  /**
   * Memperbarui data proyek yang ada (SRS §9.2).
   * @param {string|number} id
   * @param {Object} payload
   * @returns {Promise<{ data: Object, skor_sebelum?: number, skor_sesudah?: number, kategori?: string }>}
   */
  async update(id, payload) {
    if (!id) throw new Error('ID proyek wajib diisi')
    const clean = sanitizeProjectPayload(payload)
    const { data } = await http.patch(endpoints.adminProject(id), clean)
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memperbarui proyek')
    }
    return data
  },

  /**
   * Menghapus proyek manual (SRS §9.4).
   * Hanya diizinkan bila asal_data === 'manual_admin'.
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async delete(id) {
    if (!id) throw new Error('ID proyek wajib diisi')
    const { data } = await http.delete(endpoints.adminProject(id))
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal menghapus proyek')
    }
    return data
  },

  /**
   * Mengambil daftar tender turunan di bawah proyek (SRS §9.3).
   * @param {string|number} projectId
   * @returns {Promise<Array<Object>>}
   */
  async getTenders(projectId) {
    if (!projectId) throw new Error('ID proyek wajib diisi')
    const { data } = await http.get(endpoints.adminProjectTenders(projectId))
    return Array.isArray(data.tenders) ? data.tenders : (data.data || [])
  },

  /**
   * Menambah tender turunan baru untuk proyek (SRS §9.3).
   * @param {string|number} projectId
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  async createTender(projectId, payload) {
    if (!projectId) throw new Error('ID proyek wajib diisi')
    const { data } = await http.post(endpoints.adminProjectTenders(projectId), payload)
    return data
  },

  /**
   * Memperbarui data tender (SRS §9.3).
   * @param {string|number} tenderId
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  async updateTender(tenderId, payload) {
    if (!tenderId) throw new Error('ID tender wajib diisi')
    const { data } = await http.patch(endpoints.adminTender(tenderId), payload)
    return data
  },

  /**
   * Menghapus tender turunan (SRS §9.3).
   * @param {string|number} tenderId
   * @returns {Promise<Object>}
   */
  async deleteTender(tenderId) {
    if (!tenderId) throw new Error('ID tender wajib diisi')
    const { data } = await http.delete(endpoints.adminTender(tenderId))
    return data
  },

  /**
   * Mengambil kronologi riwayat perubahan nilai & dampak skor (FR-59, SRS §9.5).
   * @param {string|number} id
   * @returns {Promise<Array<Object>>}
   */
  async getValueHistory(id) {
    if (!id) throw new Error('ID proyek wajib diisi')
    const { data } = await http.get(endpoints.adminProjectValueHistory(id))
    return Array.isArray(data.history)
      ? data.history
      : Array.isArray(data.value_history)
        ? data.value_history
        : (data.data || [])
  },

  // ==========================================
  // DATA EKSEKUSI PROYEK (FASE 29 / SRC-10)
  // ==========================================

  /**
   * Mengambil daftar rincian RAB proyek.
   * @param {string|number} projectId
   * @returns {Promise<Array<Object>>}
   */
  async getRabItems(projectId) {
    if (!projectId) throw new Error('ID proyek wajib diisi')
    const { data } = await http.get(endpoints.projectRabItems(projectId))
    if (Array.isArray(data.rab_items?.items)) return data.rab_items.items
    if (Array.isArray(data.items)) return data.items
    if (Array.isArray(data.rab_items)) return data.rab_items
    return []
  },

  /**
   * Menambahkan item anggaran RAB.
   * @param {string|number} projectId
   * @param {{ uraian: string, satuan: string, volume: number, harga_satuan: number, kode_harga_acuan?: string|null }} payload
   * @returns {Promise<{ rab_item: Object, scoring: Object }>}
   */
  async createRabItem(projectId, payload) {
    if (!projectId) throw new Error('ID proyek wajib diisi')
    const { data } = await http.post(endpoints.adminProjectRabItems(projectId), payload)
    return data
  },

  /**
   * Memperbarui item anggaran RAB.
   * @param {string|number} itemId
   * @param {Object} payload
   * @returns {Promise<{ rab_item: Object, scoring: Object }>}
   */
  async updateRabItem(itemId, payload) {
    if (!itemId) throw new Error('ID item RAB wajib diisi')
    const { data } = await http.patch(endpoints.adminRabItem(itemId), payload)
    return data
  },

  /**
   * Menghapus item anggaran RAB.
   * @param {string|number} itemId
   * @returns {Promise<{ deleted: Object, scoring: Object }>}
   */
  async deleteRabItem(itemId) {
    if (!itemId) throw new Error('ID item RAB wajib diisi')
    const { data } = await http.delete(endpoints.adminRabItem(itemId))
    return data
  },

  /**
   * Mengambil daftar termin pembayaran & ringkasan keuangan.
   * @param {string|number} projectId
   * @returns {Promise<{ pembayaran: Array<Object>, ringkasan: Object }>}
   */
  async getPayments(projectId) {
    if (!projectId) throw new Error('ID proyek wajib diisi')
    const { data } = await http.get(endpoints.projectPayments(projectId))
    const container = data.payments || data
    return {
      pembayaran: Array.isArray(container.pembayaran)
        ? container.pembayaran
        : Array.isArray(data.pembayaran)
          ? data.pembayaran
          : [],
      ringkasan: container.ringkasan || data.ringkasan || null,
    }
  },

  /**
   * Menambahkan termin pembayaran.
   * @param {string|number} projectId
   * @param {{ termin_ke: number, tanggal: string, jumlah: number, persen_kontrak: number }} payload
   * @returns {Promise<{ pembayaran: Object, scoring: Object }>}
   */
  async createPayment(projectId, payload) {
    if (!projectId) throw new Error('ID proyek wajib diisi')
    const { data } = await http.post(endpoints.adminProjectPayments(projectId), payload)
    return data
  },

  /**
   * Memperbarui termin pembayaran.
   * @param {string|number} paymentId
   * @param {Object} payload
   * @returns {Promise<{ pembayaran: Object, scoring: Object }>}
   */
  async updatePayment(paymentId, payload) {
    if (!paymentId) throw new Error('ID pembayaran wajib diisi')
    const { data } = await http.patch(endpoints.adminPayment(paymentId), payload)
    return data
  },

  /**
   * Menghapus termin pembayaran.
   * @param {string|number} paymentId
   * @returns {Promise<{ deleted: Object, scoring: Object }>}
   */
  async deletePayment(paymentId) {
    if (!paymentId) throw new Error('ID pembayaran wajib diisi')
    const { data } = await http.delete(endpoints.adminPayment(paymentId))
    return data
  },

  /**
   * Mengambil riwayat progres fisik proyek.
   * @param {string|number} projectId
   * @returns {Promise<Array<Object>>}
   */
  async getProgress(projectId) {
    if (!projectId) throw new Error('ID proyek wajib diisi')
    const { data } = await http.get(endpoints.projectProgress(projectId))
    const container = data.progress || data
    return Array.isArray(container.progres)
      ? container.progres
      : Array.isArray(data.progres)
        ? data.progres
        : []
  },

  /**
   * Menambahkan catatan progres fisik.
   * @param {string|number} projectId
   * @param {{ tanggal: string, persen_fisik: number }} payload
   * @returns {Promise<{ progres: Object, scoring: Object }>}
   */
  async createProgress(projectId, payload) {
    if (!projectId) throw new Error('ID proyek wajib diisi')
    const { data } = await http.post(endpoints.adminProjectProgress(projectId), payload)
    return data
  },

  /**
   * Memperbarui catatan progres fisik.
   * @param {string|number} progressId
   * @param {Object} payload
   * @returns {Promise<{ progres: Object, scoring: Object }>}
   */
  async updateProgress(progressId, payload) {
    if (!progressId) throw new Error('ID progres wajib diisi')
    const { data } = await http.patch(endpoints.adminProgress(progressId), payload)
    return data
  },

  /**
   * Menghapus catatan progres fisik.
   * @param {string|number} progressId
   * @returns {Promise<{ deleted: Object, scoring: Object }>}
   */
  async deleteProgress(progressId) {
    if (!progressId) throw new Error('ID progres wajib diisi')
    const { data } = await http.delete(endpoints.adminProgress(progressId))
    return data
  },
}
