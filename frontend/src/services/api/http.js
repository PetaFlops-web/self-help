import axios from 'axios'
import { API_BASE_URL, API_TIMEOUT_MS } from '@/config/api'

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})
http.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.data?.message) {
      error.userMessage = error.response.data.message
    }
    if (import.meta.env.DEV) console.error('[API]', error.config?.url, error.response?.status, error.message)
    return Promise.reject(error)
  },
)

