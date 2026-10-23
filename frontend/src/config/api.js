// Ubah VITE_API_BASE_URL pada .env di root project, bukan di folder src.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/+$/, '')
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000)
