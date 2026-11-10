<template>
  <div class="admin-notif-page">
    <!-- Header -->
    <header class="notif-head">
      <div>
        <h2 class="notif-title">Log &amp; Retensi Notifikasi Surel Pelapor</h2>
        <p class="notif-desc">
          Audit pengiriman notifikasi pembaruan status laporan warga via surel dan pembersihan data kontak (FR-54, FR-26, AC-20).
        </p>
      </div>
      <div class="notif-head-actions">
        <button
          v-if="auth.hasRole('admin')"
          class="btn-retention"
          :disabled="retentionLoading"
          @click="showRetentionModal = true"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 0 1 1.34-1.34h2.66a1.33 1.33 0 0 1 1.34 1.34V4M12.67 4v9.33a1.33 1.33 0 0 1-1.34 1.34H4.67a1.33 1.33 0 0 1-1.34-1.34V4" />
          </svg>
          <span>Jalankan Retensi Kontak (30 Hari)</span>
        </button>
        <div class="notif-status-indicator">
          <span class="notif-indicator-dot" />
          <span>KANAL SUREL AKTIF</span>
        </div>
      </div>
    </header>

    <!-- Top KPI Cards -->
    <div class="notif-kpi-grid">
      <div class="notif-kpi-card">
        <span class="notif-kpi-lbl">TOTAL NOTIFIKASI</span>
        <div class="notif-kpi-val-wrap">
          <SkeletonBlock v-if="loading && !dataLoaded" height="28px" width="70px" radius="6px" />
          <span v-else class="notif-kpi-val">{{ total.toLocaleString('id-ID') }}</span>
        </div>
        <span class="notif-kpi-sub">Total log tercatat di sistem</span>
      </div>

      <div class="notif-kpi-card">
        <span class="notif-kpi-lbl">BERHASIL TERKIRIM</span>
        <div class="notif-kpi-val-wrap">
          <SkeletonBlock v-if="loading && !dataLoaded" height="28px" width="70px" radius="6px" />
          <span v-else class="notif-kpi-val text-success">{{ countSuccess.toLocaleString('id-ID') }}</span>
        </div>
        <span class="notif-kpi-sub">Diterima oleh server surel</span>
      </div>

      <div class="notif-kpi-card">
        <span class="notif-kpi-lbl">DALAM ANTREAN</span>
        <div class="notif-kpi-val-wrap">
          <SkeletonBlock v-if="loading && !dataLoaded" height="28px" width="70px" radius="6px" />
          <span v-else class="notif-kpi-val text-warning">{{ countPending.toLocaleString('id-ID') }}</span>
        </div>
        <span class="notif-kpi-sub">Menunggu jadwal dispatch</span>
      </div>

      <div class="notif-kpi-card">
        <span class="notif-kpi-lbl">GAGAL KIRIM</span>
        <div class="notif-kpi-val-wrap">
          <SkeletonBlock v-if="loading && !dataLoaded" height="28px" width="70px" radius="6px" />
          <span v-else class="notif-kpi-val text-danger">{{ countFailed.toLocaleString('id-ID') }}</span>
        </div>
        <span class="notif-kpi-sub">Dapat dikirim ulang manual</span>
      </div>
    </div>

    <!-- Alert Success / Info -->
    <div v-if="successMsg" class="notif-alert notif-alert--success">
      <div class="notif-alert-body">
        <p>{{ successMsg }}</p>
      </div>
      <button class="notif-alert-close" aria-label="Tutup" @click="successMsg = ''">✕</button>
    </div>

    <!-- Alert Error -->
    <div v-if="error" class="notif-alert notif-alert--danger">
      <div class="notif-alert-body">
        <p>{{ error }}</p>
      </div>
      <button class="notif-alert-close" aria-label="Tutup" @click="error = ''">✕</button>
    </div>

    <!-- Banner Privasi & Retensi (AC-20) -->
    <div class="notif-banner-privacy">
      <div class="notif-banner-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M8 0a4 4 0 0 0-4 4v2H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-1V4a4 4 0 0 0-4-4Zm2 6H6V4a2 2 0 1 1 4 0v2Z" />
        </svg>
      </div>
      <div class="notif-banner-text">
        <strong>Perlindungan Privasi Kontak (AC-20):</strong>
        Alamat surel pelapor disimpan dengan enkripsi simetris AES-256-GCM dan digest SHA-256 tidak pernah dibocorkan.
        Setelah 30 hari laporan dinyatakan Selesai atau Ditolak, kontak pelapor wajib dihapus permanen oleh prosedur retensi.
      </div>
    </div>

    <!-- Main Card: Table + Filter -->
    <div class="notif-card">
      <!-- Filter Bar -->
      <div class="notif-filters">
        <div class="notif-filter-search">
          <svg class="notif-search-icon" viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" />
            <path d="M9.5 9.5 13 13" />
          </svg>
          <input
            v-model="filterTiket"
            type="text"
            class="notif-input-search"
            placeholder="Cari kode tiket, mis. CS-2026-..."
            @input="handleSearchInput"
          />
        </div>

        <div class="notif-filter-select-wrap">
          <label class="notif-filter-lbl">Status Kirim:</label>
          <select v-model="filterStatus" class="notif-select" @change="handleFilterChange">
            <option value="semua">Semua Status</option>
            <option value="terkirim">Terkirim</option>
            <option value="dalam_antrean">Dalam Antrean</option>
            <option value="gagal">Gagal Kirim</option>
          </select>
        </div>

        <button class="notif-btn-refresh" :disabled="loading" @click="fetchNotifications">
          <span v-if="loading">Memuat…</span>
          <span v-else>↻ Segarkan</span>
        </button>
      </div>

      <!-- Table -->
      <div class="notif-table-container">
        <table class="notif-table">
          <thead>
            <tr>
              <th scope="col" class="th-ticket">TIKET LAPORAN</th>
              <th scope="col" class="th-channel">KANAL</th>
              <th scope="col" class="th-transition">TRANSISI STATUS</th>
              <th scope="col" class="th-status">STATUS KIRIM</th>
              <th scope="col" class="th-attempt">PERCOBAAN</th>
              <th scope="col" class="th-error">GALAT / ALASAN</th>
              <th scope="col" class="th-time">WAKTU</th>
              <th scope="col" class="th-action">AKSI</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading && !dataLoaded">
              <td colspan="8" class="td-skeleton">
                <div class="skeleton-col">
                  <SkeletonBlock height="20px" width="100%" radius="4px" />
                  <SkeletonBlock height="20px" width="100%" radius="4px" />
                  <SkeletonBlock height="20px" width="100%" radius="4px" />
                </div>
              </td>
            </tr>

            <tr v-else-if="items.length === 0">
              <td colspan="8" class="td-empty">
                <p class="td-empty-title">Tidak ada log notifikasi</p>
                <p class="td-empty-desc">
                  Belum ada notifikasi surel yang tercatat atau cocok dengan kriteria filter saat ini.
                </p>
              </td>
            </tr>

            <tr v-for="item in items" :key="item.id" class="notif-row">
              <td class="td-ticket">
                <RouterLink
                  :to="`/admin/laporan/${encodeURIComponent(item.tiket)}`"
                  class="notif-ticket-link"
                  :title="`Buka detail laporan ${item.tiket}`"
                >
                  {{ item.tiket }}
                </RouterLink>
              </td>

              <td class="td-channel">
                <span class="badge-channel">
                  {{ (item.kanal || 'email').toUpperCase() }}
                </span>
              </td>

              <td class="td-transition">
                <span class="transition-from">{{ item.status_dari || 'Baru' }}</span>
                <span class="transition-arrow" aria-hidden="true">→</span>
                <span class="transition-to">{{ item.status_ke || '—' }}</span>
              </td>

              <td class="td-status">
                <span
                  class="notif-pill"
                  :class="{
                    'notif-pill--success': item.status_kirim === 'terkirim',
                    'notif-pill--warning': item.status_kirim === 'dalam_antrean',
                    'notif-pill--danger': item.status_kirim === 'gagal',
                  }"
                >
                  <span v-if="item.status_kirim === 'terkirim'">✓ Terkirim</span>
                  <span v-else-if="item.status_kirim === 'dalam_antrean'">⏳ Dalam Antrean</span>
                  <span v-else-if="item.status_kirim === 'gagal'">✕ Gagal Kirim</span>
                  <span v-else>{{ item.status_kirim }}</span>
                </span>
              </td>

              <td class="td-attempt">
                <span class="attempt-count">{{ item.percobaan ?? 1 }}×</span>
              </td>

              <td class="td-error">
                <span v-if="item.galat" class="error-text" :title="item.galat">
                  {{ item.galat }}
                </span>
                <span v-else class="text-muted">—</span>
              </td>

              <td class="td-time">
                <div class="time-wrap">
                  <span class="time-main">{{ formatDateTime(item.dikirim_pada || item.dibuat_pada) }}</span>
                  <span v-if="item.dikirim_pada && item.dibuat_pada !== item.dikirim_pada" class="time-sub">
                    Dibuat: {{ formatDateTime(item.dibuat_pada) }}
                  </span>
                </div>
              </td>

              <td class="td-action">
                <button
                  v-if="item.status_kirim === 'gagal' && auth.hasRole('admin')"
                  class="btn-retry"
                  :disabled="retryingId === item.id"
                  @click="handleRetry(item)"
                >
                  {{ retryingId === item.id ? 'Mengirim…' : 'Kirim Ulang ↻' }}
                </button>
                <span v-else-if="item.status_kirim === 'gagal' && !auth.hasRole('admin')" class="text-muted">
                  Hanya Admin
                </span>
                <span v-else class="text-muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer / Pagination -->
      <footer class="notif-footer">
        <div class="notif-count-info">
          Menampilkan {{ paginationStart }}-{{ paginationEnd }} dari {{ total.toLocaleString('id-ID') }} entri notifikasi
        </div>

        <div class="notif-pagination">
          <button
            class="pg-btn"
            :disabled="currentOffset <= 0 || loading"
            @click="prevPage"
          >
            Sebelumnya
          </button>
          <span class="pg-indicator">Halaman {{ currentPage }} dari {{ totalPages }}</span>
          <button
            class="pg-btn"
            :disabled="currentOffset + currentLimit >= total || loading"
            @click="nextPage"
          >
            Berikutnya
          </button>
        </div>
      </footer>
    </div>

    <!-- Modal Konfirmasi Retensi Kontak (AC-20) -->
    <div v-if="showRetentionModal" class="modal-backdrop" @click.self="showRetentionModal = false">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="retention-modal-title">
        <div class="modal-head">
          <h3 id="retention-modal-title" class="modal-title">Konfirmasi Prosedur Retensi Kontak</h3>
          <button class="modal-close" aria-label="Tutup" @click="showRetentionModal = false">✕</button>
        </div>

        <div class="modal-body">
          <div class="retention-alert">
            <strong>PERINGATAN PENGHAPUSAN PERMANEN (SRS §8 / AC-20):</strong>
            <p>
              Prosedur ini akan memindai seluruh laporan yang telah melewati masa 30 hari sejak status akhir
              (<strong>Selesai</strong> atau <strong>Ditolak</strong>), lalu menghapus alamat surel pelapor secara permanen.
            </p>
          </div>

          <ul class="retention-points">
            <li>Alamat surel terenkripsi akan dihapus dan disetel menjadi <code>null</code>.</li>
            <li>Status laporan, media bukti, dan log audit investigasi tetap dipertahankan.</li>
            <li>Eksekusi ini dicatat secara permanen di Log Audit atas nama <strong>{{ auth.user?.nama || 'Administrator' }}</strong>.</li>
          </ul>
        </div>

        <div class="modal-foot">
          <button class="btn-cancel" :disabled="retentionLoading" @click="showRetentionModal = false">
            Batal
          </button>
          <button class="btn-confirm-retention" :disabled="retentionLoading" @click="executeRetention">
            {{ retentionLoading ? 'Menjalankan Retensi…' : 'Eksekusi Retensi Sekarang' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { adminNotificationsApi } from '@/services/api/admin-notifications.api'
import { useAuthStore } from '@/stores/auth'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'

const auth = useAuthStore()

// State
const items = ref([])
const total = ref(0)
const loading = ref(false)
const dataLoaded = ref(false)
const error = ref('')
const successMsg = ref('')

const filterTiket = ref('')
const filterStatus = ref('semua')
const currentLimit = ref(20)
const currentOffset = ref(0)

const retryingId = ref(null)
const retentionLoading = ref(false)
const showRetentionModal = ref(false)

let searchTimeout = null

// Computed
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / currentLimit.value)))
const currentPage = computed(() => Math.floor(currentOffset.value / currentLimit.value) + 1)
const paginationStart = computed(() => (total.value === 0 ? 0 : currentOffset.value + 1))
const paginationEnd = computed(() => Math.min(currentOffset.value + currentLimit.value, total.value))

const countSuccess = computed(() => items.value.filter((i) => i.status_kirim === 'terkirim').length)
const countPending = computed(() => items.value.filter((i) => i.status_kirim === 'dalam_antrean').length)
const countFailed = computed(() => items.value.filter((i) => i.status_kirim === 'gagal').length)

// Formatters
function formatDateTime(val) {
  if (!val) return '—'
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return String(val)
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

// Fetch list
async function fetchNotifications() {
  loading.value = true
  error.value = ''
  try {
    const res = await adminNotificationsApi.list({
      tiket: filterTiket.value,
      status_kirim: filterStatus.value,
      limit: currentLimit.value,
      offset: currentOffset.value,
    })
    items.value = res.notifications
    total.value = res.total
    dataLoaded.value = true
  } catch (err) {
    error.value = err.message || 'Gagal memuat log notifikasi'
  } finally {
    loading.value = false
  }
}

function handleSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentOffset.value = 0
    fetchNotifications()
  }, 350)
}

function handleFilterChange() {
  currentOffset.value = 0
  fetchNotifications()
}

function prevPage() {
  if (currentOffset.value > 0) {
    currentOffset.value = Math.max(0, currentOffset.value - currentLimit.value)
    fetchNotifications()
  }
}

function nextPage() {
  if (currentOffset.value + currentLimit.value < total.value) {
    currentOffset.value += currentLimit.value
    fetchNotifications()
  }
}

// Aksi Kirim Ulang (Retry)
async function handleRetry(item) {
  if (!item?.id) return
  retryingId.value = item.id
  error.value = ''
  successMsg.value = ''
  try {
    const res = await adminNotificationsApi.retry(item.id)
    successMsg.value = `Notifikasi tiket ${item.tiket} berhasil dikirim ulang.`
    // Perbarui baris lokal secara responsif
    if (res) {
      item.status_kirim = res.status_kirim || 'terkirim'
      item.percobaan = res.percobaan ?? (item.percobaan + 1)
      item.galat = null
    }
  } catch (err) {
    error.value = err.message || `Gagal mengirim ulang notifikasi tiket ${item.tiket}`
  } finally {
    retryingId.value = null
  }
}

// Aksi Retensi Kontak
async function executeRetention() {
  retentionLoading.value = true
  error.value = ''
  successMsg.value = ''
  try {
    const res = await adminNotificationsApi.runRetention()
    const cleanedCount = Array.isArray(res.tiket_dibersihkan) ? res.tiket_dibersihkan.length : 0
    showRetentionModal.value = false
    successMsg.value = `Prosedur retensi selesai: ${cleanedCount} kontak surel pelapor yang melewati 30 hari telah dibersihkan secara permanen.`
    // Segarkan daftar
    fetchNotifications()
  } catch (err) {
    error.value = err.message || 'Gagal menjalankan prosedur retensi kontak'
  } finally {
    retentionLoading.value = false
  }
}

onMounted(() => {
  fetchNotifications()
})
</script>

<style scoped>
.admin-notif-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Head */
.notif-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.notif-title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 800;
  color: var(--c-ink, #111111);
  line-height: 1.25;
}

.notif-desc {
  margin: 0;
  font-size: 12px;
  color: var(--c-muted, #6B6760);
  max-width: 680px;
  line-height: 1.4;
}

.notif-head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-retention {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  font-size: 11px;
  font-weight: 700;
  color: var(--c-ink, #111111);
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-sm, 6px);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.btn-retention:hover:not(:disabled) {
  background: var(--c-bg-alt, #F8F7F4);
  border-color: var(--c-border-strong, #DCD8D0);
}

.btn-retention:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.notif-status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--c-success, #2E8B57);
  background: var(--c-success-soft, #E3F2EA);
  border-radius: var(--r-pill, 999px);
}

.notif-indicator-dot {
  width: 6px;
  height: 6px;
  background: var(--c-success, #2E8B57);
  border-radius: 50%;
}

/* KPI Grid */
.notif-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.notif-kpi-card {
  padding: 16px;
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-lg, 12px);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notif-kpi-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--c-muted, #6B6760);
}

.notif-kpi-val-wrap {
  display: flex;
  align-items: baseline;
  min-height: 32px;
}

.notif-kpi-val {
  font-size: 24px;
  font-weight: 800;
  color: var(--c-ink, #111111);
  line-height: 1.2;
}

.notif-kpi-sub {
  font-size: 11px;
  color: var(--c-muted, #6B6760);
}

.text-success { color: var(--c-success, #2E8B57) !important; }
.text-warning { color: var(--c-warning, #D97706) !important; }
.text-danger { color: var(--c-danger, #D63A1F) !important; }

/* Alerts */
.notif-alert {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: var(--r-sm, 6px);
  font-size: 12px;
  line-height: 1.4;
}

.notif-alert--success {
  background: var(--c-success-soft, #E3F2EA);
  border: 1px solid #C3E6CB;
  color: #155724;
}

.notif-alert--danger {
  background: var(--c-danger-soft, #FCE4DF);
  border: 1px solid #F5C6CB;
  color: var(--c-danger, #D63A1F);
}

.notif-alert-body p {
  margin: 0;
}

.notif-alert-close {
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
}

.notif-alert-close:hover {
  opacity: 1;
}

/* Banner Privasi */
.notif-banner-privacy {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
  border-radius: var(--r-sm, 6px);
  font-size: 12px;
  color: #1E40AF;
  line-height: 1.45;
}

.notif-banner-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

/* Main Card */
.notif-card {
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-lg, 12px);
  overflow: hidden;
}

/* Filters */
.notif-filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  flex-wrap: wrap;
}

.notif-filter-search {
  position: relative;
  flex: 1;
  min-width: 240px;
  max-width: 400px;
}

.notif-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--c-muted, #6B6760);
}

.notif-input-search {
  width: 100%;
  height: 36px;
  padding: 0 12px 0 34px;
  font-size: 11px;
  font-family: inherit;
  color: var(--c-ink, #111111);
  background: var(--c-bg, #F4F2EE);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-md, 8px);
}

.notif-filter-select-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notif-filter-lbl {
  font-size: 11px;
  font-weight: 600;
  color: var(--c-muted, #6B6760);
}

.notif-select {
  height: 36px;
  padding: 0 12px;
  font-size: 11px;
  font-family: inherit;
  color: var(--c-ink, #111111);
  background: var(--c-bg, #F4F2EE);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-sm, 6px);
}

.notif-btn-refresh {
  height: 36px;
  padding: 0 14px;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-ink, #111111);
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-sm, 6px);
  cursor: pointer;
}

.notif-btn-refresh:hover:not(:disabled) {
  background: var(--c-bg-alt, #F8F7F4);
}

/* Table */
.notif-table-container {
  overflow-x: auto;
}

.notif-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 11px;
}

.notif-table th {
  background: var(--c-bg-alt, #F8F7F4);
  color: var(--c-ink, #111111);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 12px 16px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  white-space: nowrap;
}

.notif-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  vertical-align: middle;
}

.notif-row:hover {
  background: #FCFBF9;
}

.td-ticket {
  font-weight: 700;
}

.notif-ticket-link {
  color: var(--c-info, #2F6FDE);
  text-decoration: none;
  font-family: monospace;
  font-size: 11px;
}

.notif-ticket-link:hover {
  text-decoration: underline;
}

.badge-channel {
  display: inline-block;
  padding: 3px 8px;
  font-size: 9px;
  font-weight: 700;
  border-radius: var(--r-xs, 4px);
  background: var(--c-bg, #F4F2EE);
  color: var(--c-muted, #6B6760);
  border: 1px solid var(--c-border, #E7E3DC);
}

.transition-from,
.transition-to {
  font-weight: 600;
}

.transition-arrow {
  margin: 0 6px;
  color: var(--c-muted, #6B6760);
}

/* Pills */
.notif-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 10px;
  font-weight: 700;
  border-radius: var(--r-pill, 999px);
  white-space: nowrap;
}

.notif-pill--success {
  background: var(--c-success-soft, #E3F2EA);
  color: #137333;
}

.notif-pill--warning {
  background: var(--c-warning-soft, #FDF0D8);
  color: #B45309;
}

.notif-pill--danger {
  background: var(--c-danger-soft, #FCE4DF);
  color: var(--c-danger, #D63A1F);
}

.attempt-count {
  font-weight: 600;
  color: var(--c-muted, #6B6760);
}

.error-text {
  color: var(--c-danger, #D63A1F);
  font-size: 10px;
  max-width: 220px;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.time-main {
  color: var(--c-ink, #111111);
  white-space: nowrap;
}

.time-sub {
  font-size: 10px;
  color: var(--c-muted, #6B6760);
}

.btn-retry {
  height: 28px;
  padding: 0 10px;
  font-size: 10px;
  font-weight: 700;
  color: var(--c-danger, #D63A1F);
  background: var(--c-surface, #FFFFFF);
  border: 1px solid #F5C6CB;
  border-radius: var(--r-sm, 6px);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-retry:hover:not(:disabled) {
  background: var(--c-danger-soft, #FCE4DF);
}

.btn-retry:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.td-skeleton {
  padding: 24px 16px;
}

.skeleton-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.td-empty {
  padding: 48px 16px;
  text-align: center;
}

.td-empty-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 700;
  color: var(--c-ink, #111111);
}

.td-empty-desc {
  margin: 0;
  font-size: 11px;
  color: var(--c-muted, #6B6760);
}

/* Footer / Pagination */
.notif-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-top: 1px solid var(--c-border, #E7E3DC);
  flex-wrap: wrap;
  gap: 12px;
}

.notif-count-info {
  font-size: 11px;
  color: var(--c-muted, #6B6760);
}

.notif-pagination {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pg-btn {
  height: 32px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-ink, #111111);
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-sm, 6px);
  cursor: pointer;
}

.pg-btn:hover:not(:disabled) {
  background: var(--c-bg-alt, #F8F7F4);
}

.pg-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pg-indicator {
  font-size: 11px;
  color: var(--c-muted, #6B6760);
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 1000;
}

.modal-card {
  width: 100%;
  max-width: 520px;
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border-strong, #DCD8D0);
  border-radius: var(--r-lg, 12px);
  overflow: hidden;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--c-ink, #111111);
}

.modal-close {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: var(--c-muted, #6B6760);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--c-ink, #111111);
}

.retention-alert {
  padding: 12px;
  background: var(--c-warning-soft, #FDF0D8);
  border: 1px solid #FCD34D;
  border-radius: var(--r-sm, 6px);
  color: #78350F;
}

.retention-alert p {
  margin: 6px 0 0;
}

.retention-points {
  margin: 0;
  padding-left: 20px;
}

.retention-points li {
  margin-bottom: 6px;
}

.modal-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--c-border, #E7E3DC);
  background: var(--c-bg-alt, #F8F7F4);
}

.btn-cancel {
  height: 38px;
  padding: 0 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-ink, #111111);
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-sm, 6px);
  cursor: pointer;
}

.btn-confirm-retention {
  height: 38px;
  padding: 0 18px;
  font-size: 12px;
  font-weight: 700;
  color: #FFFFFF;
  background: var(--c-danger, #D63A1F);
  border: none;
  border-radius: var(--r-sm, 6px);
  cursor: pointer;
}

.btn-confirm-retention:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-confirm-retention:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsif */
@media (max-width: 768px) {
  .notif-head {
    flex-direction: column;
    align-items: stretch;
  }
  .notif-head-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
