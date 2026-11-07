import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/services/api/auth.api'
import { TOKEN_KEY } from '@/services/api/http'

/**
 * @typedef {import('@/services/api/auth.api').UserProfile} UserProfile
 * @typedef {import('@/services/api/auth.api').UserRole} UserRole
 */

// Promise inisialisasi tunggal — agar guard dan main.js berbagi hasil fetchMe().
let initPromise = null

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  /** @type {import('vue').Ref<UserProfile | null>} */
  const user = ref(null)
  const loading = ref(false)
  const error = ref('')
  const ready = ref(false)

  /** True bila token ada DAN profil pengguna sudah termuat. */
  const isAuthenticated = computed(() => Boolean(token.value && user.value))

  /**
   * Mengecek apakah peran pengguna saat ini termasuk dalam daftar yang diizinkan.
   * @param {...UserRole} roles
   * @returns {boolean}
   */
  function hasRole(...roles) {
    const peran = user.value?.peran
    return Boolean(peran) && roles.includes(peran)
  }

  /**
   * Menyetel sesi: simpan token ke state + localStorage, dan profil pengguna.
   * @param {string} tokenValue
   * @param {UserProfile} pengguna
   */
  function setSession(tokenValue, pengguna) {
    token.value = tokenValue
    user.value = pengguna
    localStorage.setItem(TOKEN_KEY, tokenValue)
  }

  /**
   * Membersihkan sesi dari state dan localStorage.
   */
  function clearSession() {
    token.value = ''
    user.value = null
    error.value = ''
    localStorage.removeItem(TOKEN_KEY)
  }

  /**
   * Login ke panel admin.
   * @param {string} surel
   * @param {string} kata_sandi
   * @returns {Promise<UserProfile>}
   */
  async function login(surel, kata_sandi) {
    loading.value = true
    error.value = ''
    try {
      const { token: tokenValue, pengguna } = await authApi.login(surel, kata_sandi)
      setSession(tokenValue, pengguna)
      return pengguna
    } catch (err) {
      // Backend sengaja mengembalikan pesan generik — jangan bedakan
      // "surel tidak ditemukan" dan "kata sandi salah".
      clearSession()
      error.value = err?.userMessage || err?.message || 'Login gagal'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Logout dari panel admin. Bersihkan sesi lokal bahkan jika panggilan
   * backend gagal (token mungkin sudah kedaluwarsa).
   * @returns {Promise<void>}
   */
  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // Abaikan error — tetap bersihkan sesi lokal.
    }
    clearSession()
  }

  /**
   * Memverifikasi token yang tersimpan masih sah dengan memanggil GET /auth/me.
   * Bila token tidak ada atau tidak sah, sesi dibersihkan.
   * @returns {Promise<void>}
   */
  async function fetchMe() {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    if (!storedToken) {
      clearSession()
      return
    }
    token.value = storedToken
    try {
      const pengguna = await authApi.me()
      user.value = pengguna
    } catch {
      // Token rusak/kedaluwarsa — bersihkan sesi.
      // Interceptor http.js sudah menghapus token dari localStorage.
      clearSession()
    }
  }

  /**
   * Inisialisasi tunggal: panggil fetchMe() sekali saat aplikasi dimuat.
   * Guard router dan main.js berbagi promise yang sama.
   * @returns {Promise<void>}
   */
  function initialize() {
    if (!initPromise) {
      initPromise = fetchMe().finally(() => {
        ready.value = true
      })
    }
    return initPromise
  }

  return {
    token,
    user,
    loading,
    error,
    ready,
    isAuthenticated,
    hasRole,
    login,
    logout,
    fetchMe,
    initialize,
    clearSession,
  }
})
