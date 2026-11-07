import axios from 'axios'
import { API_BASE_URL, API_TIMEOUT_MS } from '@/config/api'

/** Key localStorage untuk token Bearer. Dipakai store auth.js dan interceptor. */
export const TOKEN_KEY = 'clearsight_token'

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})

// ── Request interceptor ──────────────────────────────────────────────
// Sisipkan Authorization: Bearer <token> bila token ada di localStorage.
// Saat token kosong, header tidak dipasang agar endpoint publik tetap bersih.
http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor ─────────────────────────────────────────────
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.message) {
      error.userMessage = error.response.data.message
    }

    const status = error.response?.status
    const url = error.config?.url || ''

    if (status === 401) {
      // Token kedaluwarsa/invalid — kecuali jika ini permintaan login itu sendiri
      // (login 401 = kredensial salah, biarkan form yang menangani).
      if (!url.includes('/auth/login')) {
        localStorage.removeItem(TOKEN_KEY)
        // Hanya arahkan ke login bila sedang di halaman admin (bukan login).
        const path = window.location.pathname
        if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
          window.location.href = '/admin/login'
        }
      }
    } else if (status === 403) {
      // Akses ditolak: peran tidak mencukupi — BUKAN berarti sesi mati.
      // Jangan logout paksa; cukup beri pesan yang jelas.
      if (!error.userMessage) {
        error.userMessage = 'Akses ditolak: peran Anda tidak mencukupi untuk aksi ini.'
      }
    }

    if (import.meta.env.DEV) {
      console.error('[API]', url, status, error.message)
    }
    return Promise.reject(error)
  },
)
