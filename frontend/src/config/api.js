// Ubah VITE_API_BASE_URL pada .env atau build args Docker Compose.
const DEFAULT_API_BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:8000/api'
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '')
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000)

// Origin backend untuk aset statis (hapus akhiran /api dari base URL).
// Dipakai memprefiks path media relatif laporan warga, mis. /uploads/reports/x.jpg
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '')

/**
 * Mengubah path media relatif backend menjadi URL absolut.
 * @param {string} path - mis. '/uploads/reports/x.jpg' atau URL penuh
 * @returns {string}
 */
export function mediaUrl(path) {
  if (!path || typeof path !== 'string') return ''
  if (/^https?:\/\//.test(path)) return path
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}
