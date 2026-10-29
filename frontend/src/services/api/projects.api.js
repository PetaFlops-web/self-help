import { http } from './http'
import { endpoints } from './endpoints'
import { toProject } from './mappers'

/** @typedef {'low' | 'attention' | 'high'} RiskLevel */
/**
 * @typedef {Object} Project
 * @property {string | number} id
 * @property {string} name
 * @property {string} location
 * @property {string} [agency]
 * @property {number} budget
 * @property {number} riskScore
 * @property {RiskLevel} riskLevel
 * @property {number} [progress]
 * @property {boolean} [is_dummy]
 * @property {string} [updatedAt]
 * @property {number} [lat] - Latitude lokasi proyek
 * @property {number} [lng] - Longitude lokasi proyek
 * @property {Record<string, any>} [raw] - Data mentah asli dari API
 */

/** Cache konfigurasi scoring aktif per sesi di memori modul */
let cachedScoringConfig = null

export const projectsApi = {
  /**
   * Mengambil daftar proyek dari backend dengan filter opsional.
   * @param {Record<string, any>} [params]
   * @returns {Promise<Project[]>}
   */
  async list(params) {
    const { data } = await http.get(endpoints.projects, { params })
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memuat daftar proyek')
    }

    const rawList = Array.isArray(data)
      ? data
      : Array.isArray(data?.projects)
        ? data.projects
        : Array.isArray(data?.data)
          ? data.data
          : []

    return rawList.map((p) => toProject(p)).filter(Boolean)
  },

  /**
   * Mengambil detail lengkap proyek berdasarkan ID UUID.
   * @param {string | number} id
   * @returns {Promise<Project>}
   */
  async get(id) {
    const { data } = await http.get(endpoints.project(id))
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memuat detail proyek')
    }

    const rawProject = data?.project ?? data
    const project = toProject(rawProject, { includeRaw: true })
    if (!project) {
      throw new Error('Data proyek tidak valid')
    }
    project.raw = rawProject
    return project
  },

  /**
   * Mengambil daftar indikator temuan proyek.
   * @param {string | number} id
   * @returns {Promise<Array<Record<string, any>>>}
   */
  async indicators(id) {
    const { data } = await http.get(endpoints.projectIndicators(id))
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memuat indikator proyek')
    }
    return Array.isArray(data?.indicators) ? data.indicators : Array.isArray(data) ? data : []
  },

  /**
   * Mengambil penjelasan risiko proyek berbasis LLM awam.
   * @param {string | number} id
   * @returns {Promise<Record<string, any>>}
   */
  async explain(id) {
    const { data } = await http.post(endpoints.projectExplain(id))
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memuat penjelasan proyek')
    }
    return data?.penjelasan || data
  },

  /**
   * Menghasilkan draf surat tindak lanjut proyek.
   * @param {string | number} id
   * @param {'inspektorat' | 'BPK' | 'KPK' | 'Ombudsman' | 'dinas_terkait'} [tujuan='inspektorat']
   * @returns {Promise<Record<string, any>>}
   */
  async draft(id, tujuan = 'inspektorat') {
    const { data } = await http.post(endpoints.projectDraft(id), { tujuan })
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal membuat draf laporan')
    }
    return data?.draft || data
  },

  /**
   * Mengambil data progres fisik proyek.
   * @param {string | number} id
   * @returns {Promise<Record<string, any> | null>}
   */
  async progress(id) {
    try {
      const { data } = await http.get(endpoints.projectProgress(id))
      if (data?.status === 'error') return null
      return data
    } catch {
      return null
    }
  },

  /**
   * Mengambil data pembayaran proyek.
   * @param {string | number} id
   * @returns {Promise<Record<string, any> | null>}
   */
  async payments(id) {
    try {
      const { data } = await http.get(endpoints.projectPayments(id))
      if (data?.status === 'error') return null
      return data
    } catch {
      return null
    }
  },

  /**
   * Mengambil rincian item RAB proyek.
   * @param {string | number} id
   * @returns {Promise<Record<string, any> | null>}
   */
  async rabItems(id) {
    try {
      const { data } = await http.get(endpoints.projectRabItems(id))
      if (data?.status === 'error') return null
      return data
    } catch {
      return null
    }
  },

  /**
   * Mengambil statistik ringkasan beranda.
   * @returns {Promise<Record<string, any>>}
   */
  async stats() {
    const { data } = await http.get(endpoints.stats)
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memuat statistik')
    }
    return data?.stats || data
  },

  /**
   * Mengambil konfigurasi scoring aktif (dicache di memori modul per sesi).
   * @returns {Promise<Record<string, any>>}
   */
  async scoringConfig() {
    if (cachedScoringConfig) {
      return cachedScoringConfig
    }
    const { data } = await http.get(endpoints.scoringConfig)
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memuat konfigurasi scoring')
    }
    cachedScoringConfig = data?.scoring || data
    return cachedScoringConfig
  },

  /**
   * Mengambil data wilayah dalam format GeoJSON.
   * @returns {Promise<Record<string, any>>}
   */
  async regions() {
    const { data } = await http.get(endpoints.regions)
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memuat data wilayah')
    }
    return data?.regions || data
  },

  /**
   * Mengambil daftar sumber data publik.
   * @returns {Promise<Array<Record<string, any>>>}
   */
  async sources() {
    const { data } = await http.get(endpoints.sources)
    if (data?.status === 'error') {
      throw new Error(data.message || 'Gagal memuat sumber data')
    }
    return data?.sources || data
  },
}

