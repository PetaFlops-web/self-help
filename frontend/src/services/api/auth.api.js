import { http } from './http'
import { endpoints } from './endpoints'

/**
 * @typedef {'admin' | 'verifikator' | 'peninjau'} UserRole
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} nama
 * @property {string} surel
 * @property {UserRole} peran
 * @property {boolean} aktif
 * @property {string} dibuat_pada
 */

/**
 * @typedef {Object} LoginResult
 * @property {string} token
 * @property {UserProfile} pengguna
 */

export const authApi = {
  /**
   * Masuk ke panel admin.
   * Backend mengembalikan pesan generik untuk surel/kata sandi salah —
   * jangan mencoba membedakan keduanya di sisi klien.
   * @param {string} surel
   * @param {string} kata_sandi
   * @returns {Promise<LoginResult>}
   */
  async login(surel, kata_sandi) {
    const { data } = await http.post(endpoints.authLogin, { surel, kata_sandi })
    if (data?.status === 'error') {
      throw new Error(data.message || 'Login gagal')
    }
    return {
      token: data.token,
      pengguna: data.pengguna,
    }
  },

  /**
   * Keluar dari panel admin. Token Bearer disisipkan otomatis oleh interceptor.
   * @returns {Promise<void>}
   */
  async logout() {
    await http.post(endpoints.authLogout)
  },

  /**
   * Mengambil profil pengguna saat ini untuk memverifikasi token masih sah.
   * @returns {Promise<UserProfile>}
   */
  async me() {
    const { data } = await http.get(endpoints.authMe)
    if (data?.status === 'error') {
      throw new Error(data.message || 'Sesi tidak valid')
    }
    return data.pengguna
  },
}
