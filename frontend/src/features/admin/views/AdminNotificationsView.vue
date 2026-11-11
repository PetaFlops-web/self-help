<template>
  <div class="admin-notif-page">
    <!-- Topbar / Header -->
    <header class="notif-head">
      <div class="notif-title-group">
        <h1 class="notif-title">
          Log &amp; Retensi Notifikasi Surel Pelapor
        </h1>
      </div>

      <div class="notif-head-actions">
        <button
          v-if="auth.hasRole('admin')"
          class="btn-retention"
          :disabled="retentionLoading"
          @click="showRetentionModal = true"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 0 1 1.34-1.34h2.66a1.33 1.33 0 0 1 1.34 1.34V4M12.67 4v9.33a1.33 1.33 0 0 1-1.34 1.34H4.67a1.33 1.33 0 0 1-1.34-1.34V4" />
          </svg>
          <span>Jalankan Retensi Kontak (30 Hari)</span>
        </button>
    
      </div>
    </header>

    <!-- Subheader Tabs (Pill Tab Bar Konsisten dengan Daftar Proyek & Laporan) -->
    <nav class="notif-tabs-bar" aria-label="Tab filter status notifikasi">
      <div class="tabs-list">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          class="tab-item"
          :class="{ 'is-active': filterStatus === tab.value }"
          @click="switchTab(tab.value)"
        >
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </nav>

    <!-- 4 KPI Cards (Ringkasan Eksekutif Pengiriman Surel) -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">TOTAL NOTIFIKASI</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="70px" radius="6px" />
          <span v-else class="kpi-val">{{ total.toLocaleString('id-ID') }}</span>
        </div>
        <span class="kpi-sub">Total log pengiriman tercatat di sistem</span>
      </div>

      <div class="kpi-card kpi-card--success">
        <span class="kpi-label">BERHASIL TERKIRIM</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="60px" radius="6px" />
          <span v-else class="kpi-val text-success">{{ countSuccess.toLocaleString('id-ID') }}</span>
        </div>
        <span class="kpi-sub">Diterima oleh server surel pelapor</span>
      </div>

      <div class="kpi-card kpi-card--warning">
        <span class="kpi-label">DALAM ANTREAN</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="60px" radius="6px" />
          <span v-else class="kpi-val text-warning">{{ countPending.toLocaleString('id-ID') }}</span>
        </div>
        <span class="kpi-sub">Menunggu jadwal dispatch backend</span>
      </div>

      <div class="kpi-card kpi-card--danger">
        <span class="kpi-label">GAGAL KIRIM</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="60px" radius="6px" />
          <span v-else class="kpi-val text-danger">{{ countFailed.toLocaleString('id-ID') }}</span>
        </div>
        <span class="kpi-sub">Dapat dikirim ulang manual (Admin)</span>
      </div>
    </div>

    <!-- Alert Success Feedback -->
    <div v-if="successMsg" class="alert-banner alert-banner--success">
      <div class="alert-left">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="alert-icon">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{{ successMsg }}</span>
      </div>
      <button class="alert-close-btn" aria-label="Tutup notifikasi" @click="successMsg = ''">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Alert Error -->
    <div v-if="error" class="alert-banner alert-banner--danger">
      <div class="alert-left">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="alert-icon">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ error }}</span>
      </div>
      <button class="alert-close-btn" aria-label="Tutup galat" @click="error = ''">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Banner Privasi & Retensi (AC-20) -->
    <div class="privacy-notice-card">
      <div class="privacy-icon-box" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div class="privacy-text-box">
        <h4 class="privacy-title">Perlindungan Privasi Kontak Pelapor</h4>
        <p class="privacy-desc">
          Alamat surel pelapor tersimpan dengan enkripsi simetris <strong>AES-256-GCM</strong> dan hash SHA-256 terlindungi.
          Setelah 30 hari laporan dinyatakan <em>Selesai</em> atau <em>Ditolak</em>, seluruh data kontak pelapor wajib dihapus permanen oleh prosedur retensi demi kepatuhan UU PDP.
        </p>
      </div>
    </div>

    <!-- Kartu Filter Toolbar Mandiri (2 Baris Sesuai Mockup) -->
    <div class="notif-filter-card">
      <div class="filter-row-top">
        <div class="search-box">
          <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" />
            <line x1="9.5" y1="9.5" x2="13" y2="13" />
          </svg>
          <input
            v-model="filterTiket"
            type="text"
            placeholder="Cari kode tiket laporan, mis. AT-2026-..."
            aria-label="Pencarian kode tiket laporan"
            @input="handleSearchInput"
          />
          <button v-if="filterTiket" class="search-clear-btn" aria-label="Hapus pencarian" @click="clearSearch">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <select v-model="filterStatus" class="filter-select" @change="handleFilterChange">
          <option value="semua">Semua Status Pengiriman</option>
          <option value="terkirim">Terkirim</option>
          <option value="dalam_antrean">Dalam Antrean</option>
          <option value="gagal">Gagal Kirim</option>
        </select>
      </div>

      <div class="filter-row-bottom">
        <div class="filter-chips-group">
          <button
            class="chip-filter"
            :class="{ 'is-active': filterStatus === 'gagal' }"
            @click="toggleChipStatus('gagal')"
          >
            <span class="chip-dot">●</span>
            <span>Hanya Gagal Kirim</span>
          </button>
          <button
            class="chip-filter"
            :class="{ 'is-active': filterStatus === 'dalam_antrean' }"
            @click="toggleChipStatus('dalam_antrean')"
          >
            <span class="chip-dot">●</span>
            <span>Dalam Antrean</span>
          </button>
          <button
            class="chip-filter"
            :class="{ 'is-active': filterStatus === 'terkirim' }"
            @click="toggleChipStatus('terkirim')"
          >
            <span class="chip-dot">●</span>
            <span>Terkirim</span>
          </button>
        </div>

        <div class="filter-right-actions">
          <button class="btn-refresh" :disabled="loading" @click="fetchNotifications">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'spin-icon': loading }">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>↻ Segarkan</span>
          </button>
          <span class="notif-counter">
            Menampilkan {{ paginationStart }}-{{ paginationEnd }} dari {{ total.toLocaleString('id-ID') }} notifikasi
          </span>
        </div>
      </div>
    </div>

    <!-- Kartu Tabel Mandiri (Radius 16px, Overflow Hidden) -->
    <div class="notif-table-card">
      <!-- Loading Skeleton State -->
      <div v-if="loading && !dataLoaded" class="table-loading-wrap">
        <div v-for="i in 8" :key="i" class="skeleton-row-item">
          <SkeletonBlock height="16px" width="140px" radius="4px" />
          <SkeletonBlock height="16px" width="70px" radius="4px" />
          <SkeletonBlock height="16px" width="150px" radius="4px" />
          <SkeletonBlock height="16px" width="100px" radius="4px" />
          <SkeletonBlock height="16px" width="50px" radius="4px" />
          <SkeletonBlock height="16px" width="160px" radius="4px" />
          <SkeletonBlock height="16px" width="120px" radius="4px" />
          <SkeletonBlock height="16px" width="80px" radius="4px" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="items.length === 0" class="notif-empty-wrap">
        <div class="empty-icon-wrap">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h3 class="empty-title">Tidak Ada Log Notifikasi</h3>
        <p class="empty-desc">Belum ada pengiriman notifikasi surel yang tercatat atau cocok dengan kriteria filter saat ini.</p>
        <button class="btn-reset-filter" @click="resetFilters">Reset Filter</button>
      </div>

      <!-- Tabel Data Notifikasi -->
      <div v-else class="table-container">
        <table class="notif-table">
          <thead>
            <tr>
              <th scope="col" style="width: 170px;">TIKET LAPORAN</th>
              <th scope="col" style="width: 100px;">KANAL</th>
              <th scope="col" style="width: 190px;">TRANSISI STATUS</th>
              <th scope="col" style="width: 140px;">STATUS KIRIM</th>
              <th scope="col" style="width: 100px; text-align: center;">PERCOBAAN</th>
              <th scope="col">GALAT / ALASAN</th>
              <th scope="col" style="width: 170px;">WAKTU</th>
              <th scope="col" style="width: 120px; text-align: right;">AKSI</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <!-- Kolom 1: Tiket Laporan -->
              <td class="cell-ticket">
                <RouterLink
                  :to="`/admin/laporan/${encodeURIComponent(item.tiket)}`"
                  class="notif-ticket-link"
                  :title="`Buka detail laporan ${item.tiket}`"
                >
                  <span>{{ item.tiket }}</span>
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </RouterLink>
              </td>

              <!-- Kolom 2: Kanal -->
              <td class="cell-channel">
                <span class="badge-channel">
                  {{ (item.kanal || 'email').toUpperCase() }}
                </span>
              </td>

              <!-- Kolom 3: Transisi Status -->
              <td class="cell-transition">
                <div class="transition-wrap">
                  <span class="transition-badge is-from">{{ item.status_dari || 'Baru' }}</span>
                  <span class="transition-arrow" aria-hidden="true">→</span>
                  <span class="transition-badge is-to">{{ item.status_ke || '—' }}</span>
                </div>
              </td>

              <!-- Kolom 4: Status Kirim -->
              <td class="cell-status">
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

              <!-- Kolom 5: Percobaan -->
              <td class="cell-attempt">
                <span class="attempt-badge">{{ item.percobaan ?? 1 }}×</span>
              </td>

              <!-- Kolom 6: Galat / Alasan -->
              <td class="cell-error">
                <span v-if="item.galat" class="error-text" :title="item.galat">
                  {{ item.galat }}
                </span>
                <span v-else class="text-muted">—</span>
              </td>

              <!-- Kolom 7: Waktu -->
              <td class="cell-time">
                <div class="time-wrap">
                  <span class="time-main">{{ formatDateTime(item.dikirim_pada || item.dibuat_pada) }}</span>
                  <span v-if="item.dikirim_pada && item.dibuat_pada !== item.dikirim_pada" class="time-sub">
                    Dibuat: {{ formatDateTime(item.dibuat_pada) }}
                  </span>
                </div>
              </td>

              <!-- Kolom 8: Aksi -->
              <td class="cell-action">
                <button
                  v-if="item.status_kirim === 'gagal' && auth.hasRole('admin')"
                  class="btn-retry"
                  :disabled="retryingId === item.id"
                  @click="handleRetry(item)"
                >
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" :class="{ 'spin-icon': retryingId === item.id }">
                    <path d="M23 4v6h-6" />
                    <path d="M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  <span>{{ retryingId === item.id ? 'Mengirim…' : 'Kirim Ulang' }}</span>
                </button>
                <span v-else-if="item.status_kirim === 'gagal' && !auth.hasRole('admin')" class="text-muted-role">
                  Hanya Admin
                </span>
                <span v-else class="text-muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer Paginasi Mandiri -->
      <footer class="notif-footer">
        <span class="pagination-info">
          Menampilkan {{ paginationStart }}-{{ paginationEnd }} dari {{ total.toLocaleString('id-ID') }} notifikasi
        </span>

        <div class="pagination-controls">
          <button
            class="btn-page"
            :disabled="currentOffset <= 0 || loading"
            @click="prevPage"
          >
            Sebelumnya
          </button>
          <span class="page-current">Hal {{ currentPage }} / {{ totalPages }}</span>
          <button
            class="btn-page"
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
          <div class="modal-title-group">
            <div class="modal-shield-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 id="retention-modal-title" class="modal-title">Konfirmasi Prosedur Retensi Kontak</h3>
          </div>
          <button class="modal-close" aria-label="Tutup" @click="showRetentionModal = false">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="retention-alert">
            <div class="alert-warn-header">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <strong>PERINGATAN PENGHAPUSAN PERMANEN:</strong>
            </div>
            <p>
              Prosedur ini akan memindai seluruh laporan yang telah melewati masa 30 hari sejak status akhir
              (<strong>Selesai</strong> atau <strong>Ditolak</strong>), lalu menghapus alamat surel pelapor secara permanen.
            </p>
          </div>

          <ul class="retention-points">
            <li>Alamat surel terenkripsi akan dihapus dan disetel menjadi <code>null</code>.</li>
            <li>Status laporan, media bukti, dan log audit investigasi tetap dipertahankan utuh.</li>
            <li>Eksekusi ini dicatat secara permanen di Log Audit atas nama <strong>{{ auth.user?.nama || 'Administrator' }}</strong>.</li>
          </ul>
        </div>

        <div class="modal-foot">
          <button class="btn-cancel" :disabled="retentionLoading" @click="showRetentionModal = false">
            Batal
          </button>
          <button class="btn-confirm-retention" :disabled="retentionLoading" @click="executeRetention">
            <svg v-if="retentionLoading" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>{{ retentionLoading ? 'Menjalankan Retensi…' : 'Eksekusi Retensi Sekarang' }}</span>
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
import { useToast } from '@/composables/useToast'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'

const auth = useAuthStore()
const toast = useToast()

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

// Tabs Configuration
const statusTabs = computed(() => [
  { value: 'semua', label: 'Semua Notifikasi', count: total.value, badgeClass: '' },
  { value: 'terkirim', label: 'Berhasil Terkirim', count: countSuccess.value || null, badgeClass: 'tab-count--success' },
  { value: 'dalam_antrean', label: 'Dalam Antrean', count: countPending.value || null, badgeClass: 'tab-count--warning' },
  { value: 'gagal', label: 'Gagal Kirim', count: countFailed.value || null, badgeClass: 'tab-count--danger' },
])

function switchTab(statusVal) {
  filterStatus.value = statusVal
  currentOffset.value = 0
  fetchNotifications()
}

function toggleChipStatus(statusVal) {
  if (filterStatus.value === statusVal) {
    filterStatus.value = 'semua'
  } else {
    filterStatus.value = statusVal
  }
  currentOffset.value = 0
  fetchNotifications()
}

// Formatters
function formatDateTime(val) {
  if (!val) return '—'
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return String(val)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d) + ' WIB'
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

function clearSearch() {
  filterTiket.value = ''
  currentOffset.value = 0
  fetchNotifications()
}

function handleFilterChange() {
  currentOffset.value = 0
  fetchNotifications()
}

function resetFilters() {
  filterTiket.value = ''
  filterStatus.value = 'semua'
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
    toast.success(successMsg.value, 'Notifikasi Terkirim')
    if (res) {
      item.status_kirim = res.status_kirim || 'terkirim'
      item.percobaan = res.percobaan ?? (item.percobaan + 1)
      item.galat = null
    }
  } catch (err) {
    error.value = err.message || `Gagal mengirim ulang notifikasi tiket ${item.tiket}`
    toast.error(error.value, 'Gagal Mengirim Ulang')
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
    toast.success(successMsg.value, 'Retensi Kontak Selesai')
    fetchNotifications()
  } catch (err) {
    error.value = err.message || 'Gagal menjalankan prosedur retensi kontak'
    toast.error(error.value, 'Gagal Menjalankan Retensi')
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
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 40px;
}

/* Breadcrumb Tag */
.notif-breadcrumb-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-muted, #6B6760);
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  padding: 4px 12px;
  border-radius: 999px;
  width: fit-content;
}

.notif-breadcrumb-tag .dot-orange {
  color: #ff5c00;
  font-size: 12px;
}

/* Header */
.notif-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.notif-title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notif-title {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--c-ink, #111111);
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.notif-count {
  font-size: 12px;
  font-weight: 500;
  color: var(--c-muted, #6B6760);
  letter-spacing: 0;
}

.notif-head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-retention {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 14px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  color: var(--c-ink, #111111);
  background: #FFFFFF;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-retention:hover:not(:disabled) {
  background: #F8F7F4;
  border-color: #DCD8D0;
}

.btn-retention:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sync-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: #059669;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  animation: pulse-green 2s infinite;
}

@keyframes pulse-green {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

/* Subheader Tabs Bar */
.notif-tabs-bar {
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 12px;
  padding: 4px 8px;
  overflow-x: auto;
}

.tabs-list {
  display: flex;
  gap: 4px;
  min-width: max-content;
}

.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-muted, #6B6760);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.tab-item:hover {
  color: var(--c-ink, #111111);
  background: var(--c-bg, #F4F2EE);
}

.tab-item.is-active {
  color: var(--c-ink, #111111);
  background: var(--c-bg, #F4F2EE);
  box-shadow: inset 0 -2px 0 #ff5c00;
}

.tab-count {
  padding: 1px 7px;
  font-size: 10px;
  border-radius: 999px;
  background: #e5e3dc;
  color: #4b5563;
  font-weight: 700;
}

.tab-count--success {
  background: #ecfdf5;
  color: #059669;
}

.tab-count--warning {
  background: #fef3c7;
  color: #b45309;
}

.tab-count--danger {
  background: #fee2e2;
  color: #b91c1c;
}

/* 4 KPI Cards */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.kpi-card {
  padding: 16px 18px;
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 94px;
  transition: border-color 0.15s ease;
}

.kpi-card--success { border-left: 3.5px solid #16a34a; }
.kpi-card--warning { border-left: 3.5px solid #d97706; }
.kpi-card--danger { border-left: 3.5px solid #dc2626; }

.kpi-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--c-muted, #6B6760);
}

.kpi-val-row {
  min-height: 28px;
  display: flex;
  align-items: baseline;
  margin: 4px 0 2px 0;
}

.kpi-val {
  font-size: 18px;
  font-weight: 800;
  color: var(--c-ink, #111111);
}

.text-success { color: #16a34a; }
.text-warning { color: #d97706; }
.text-danger { color: #dc2626; }

.kpi-sub {
  font-size: 11px;
  color: var(--c-subtle, #9CA3AF);
  font-weight: 500;
}

/* Alert Banner */
.alert-banner {
  padding: 12px 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
}

.alert-banner--success {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
}

.alert-banner--danger {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.alert-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.alert-close-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  padding: 2px;
}

/* Privacy Notice Card */
.privacy-notice-card {
  padding: 14px 18px;
  background: #F8F7F4;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 12px;
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.privacy-icon-box {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #ECFDF5;
  color: #059669;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.privacy-title {
  font-size: 12.5px;
  font-weight: 800;
  color: var(--c-ink, #111111);
  margin: 0 0 3px 0;
}

.privacy-desc {
  font-size: 11.5px;
  color: var(--c-muted, #6B6760);
  margin: 0;
  line-height: 1.45;
}

/* Kartu Filter Mandiri */
.notif-filter-card {
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 16px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-row-top {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 12px;
  background: #F8F7F4;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 8px;
  flex: 1;
  min-width: 260px;
  color: var(--c-muted, #6B6760);
}

.search-box input {
  border: none;
  background: transparent;
  outline: none;
  font-family: inherit;
  font-size: 11.5px;
  color: var(--c-ink, #111111);
  width: 100%;
}

.search-clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--c-muted, #6B6760);
  display: flex;
  padding: 0;
}

.filter-select {
  height: 34px;
  padding: 0 28px 0 12px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--c-ink, #111111);
  background: #F8F7F4;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' width='12' height='12' fill='%236B6760'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5' stroke='%236B6760' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  appearance: none;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 8px;
  outline: none;
}

.filter-row-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-chips-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.chip-filter {
  height: 32px;
  padding: 0 12px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  background: #F8F7F4;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 8px;
  color: var(--c-muted, #6B6760);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.chip-filter .chip-dot {
  color: #ff5c00;
  font-size: 9px;
}

.chip-filter.is-active {
  background: #FFFBEB;
  border-color: #F59E0B;
  color: #92400E;
}

.filter-right-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-refresh {
  height: 32px;
  padding: 0 14px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-ink, #111111);
  background: #FFFFFF;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.btn-refresh:hover:not(:disabled) {
  background: #F8F7F4;
}

.notif-counter {
  font-size: 11.5px;
  color: var(--c-muted, #6B6760);
  font-weight: 500;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

/* Standalone Kartu Tabel */
.notif-table-card {
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 16px;
  overflow: hidden;
}

.table-loading-wrap {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.skeleton-row-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.notif-empty-wrap {
  padding: 60px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #F4F2EE;
  color: #9CA3AF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.empty-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--c-ink, #111111);
  margin: 0 0 6px 0;
}

.empty-desc {
  font-size: 12px;
  color: var(--c-muted, #6B6760);
  max-width: 380px;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.btn-reset-filter {
  padding: 6px 14px;
  font-size: 11.5px;
  font-weight: 600;
  color: #ff5c00;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  cursor: pointer;
}

/* Table Style */
.table-container {
  overflow-x: auto;
}

.notif-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  text-align: left;
}

.notif-table thead th {
  background: #FAF8F5;
  color: var(--c-muted, #6B6760);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 12px 18px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
}

.notif-table tbody tr {
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  transition: background 0.1s ease;
}

.notif-table tbody tr:hover {
  background: #FAF8F5;
}

.notif-table tbody tr:last-child {
  border-bottom: none;
}

.notif-table td {
  padding: 12px 18px;
  vertical-align: middle;
}

/* Kolom 1: Tiket */
.notif-ticket-link {
  font-weight: 700;
  color: var(--c-ink, #111111);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: color 0.15s ease;
}

.notif-ticket-link:hover {
  color: #ff5c00;
}

/* Kolom 2: Kanal */
.badge-channel {
  display: inline-block;
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 700;
  background: #F4F2EE;
  color: #4b5563;
  border-radius: 4px;
  border: 1px solid #E7E3DC;
}

/* Kolom 3: Transisi Status */
.transition-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.transition-badge {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}

.transition-badge.is-from {
  background: #F4F2EE;
  color: #6B6760;
  border: 1px solid #E7E3DC;
}

.transition-badge.is-to {
  background: #ECFDF5;
  color: #059669;
  border: 1px solid #A7F3D0;
}

.transition-arrow {
  color: #9CA3AF;
  font-weight: 700;
  font-size: 11px;
}

/* Kolom 4: Status Kirim */
.notif-pill {
  display: inline-block;
  padding: 3px 10px;
  font-size: 10.5px;
  font-weight: 700;
  border-radius: 999px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.notif-pill--success {
  background: #ECFDF5;
  color: #059669;
  border: 1px solid #A7F3D0;
}

.notif-pill--warning {
  background: #FEF3C7;
  color: #B45309;
  border: 1px solid #FDE68A;
}

.notif-pill--danger {
  background: #FEE2E2;
  color: #B91C1C;
  border: 1px solid #FECACA;
}

/* Kolom 5: Percobaan */
.cell-attempt {
  text-align: center;
}

.attempt-badge {
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  background: #F4F2EE;
  padding: 2px 7px;
  border-radius: 6px;
  color: #4b5563;
  border: 1px solid #E7E3DC;
}

/* Kolom 6: Galat */
.error-text {
  font-size: 11px;
  color: #DC2626;
  max-width: 220px;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-muted {
  color: #9CA3AF;
}

.text-muted-role {
  font-size: 10.5px;
  color: #9CA3AF;
  font-style: italic;
}

/* Kolom 7: Waktu */
.time-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.time-main {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--c-ink, #111111);
}

.time-sub {
  font-size: 10px;
  color: var(--c-muted, #6B6760);
}

/* Kolom 8: Aksi */
.cell-action {
  text-align: right;
}

.btn-retry {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  color: #ff5c00;
  background: #FFF7ED;
  border: 1px solid #FED7AA;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-retry:hover:not(:disabled) {
  background: #ff5c00;
  color: #FFFFFF;
}

.btn-retry:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Footer Paginasi */
.notif-footer {
  padding: 12px 20px;
  background: #FAF8F5;
  border-top: 1px solid var(--c-border, #E7E3DC);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.pagination-info {
  font-size: 11.5px;
  color: var(--c-muted, #6B6760);
  font-weight: 500;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-page {
  height: 28px;
  padding: 0 12px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-ink, #111111);
  background: #FFFFFF;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-page:hover:not(:disabled) {
  background: #F4F2EE;
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-current {
  font-size: 11px;
  font-weight: 600;
  color: var(--c-muted, #6B6760);
  padding: 0 4px;
}

/* Modal Konfirmasi Retensi */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-card {
  background: #FFFFFF;
  border-radius: 16px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-head {
  padding: 18px 22px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.modal-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-shield-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #FFF7ED;
  color: #ff5c00;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--c-ink, #111111);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--c-muted, #6B6760);
  padding: 4px;
  display: flex;
}

.modal-body {
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.retention-alert {
  padding: 12px 14px;
  background: #FEF3C7;
  border: 1px solid #FDE68A;
  border-radius: 10px;
  color: #92400E;
  font-size: 11.5px;
  line-height: 1.45;
}

.alert-warn-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 800;
  margin-bottom: 4px;
}

.retention-alert p {
  margin: 0;
}

.retention-points {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: var(--c-muted, #6B6760);
  display: flex;
  flex-direction: column;
  gap: 8px;
  line-height: 1.45;
}

.retention-points code {
  background: #F4F2EE;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
  color: var(--c-ink, #111111);
}

.modal-foot {
  padding: 14px 22px;
  background: #FAF8F5;
  border-top: 1px solid var(--c-border, #E7E3DC);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel {
  height: 34px;
  padding: 0 16px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--c-ink, #111111);
  background: #FFFFFF;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 8px;
  cursor: pointer;
}

.btn-confirm-retention {
  height: 34px;
  padding: 0 18px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  color: #FFFFFF;
  background: #DC2626;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s ease;
}

.btn-confirm-retention:hover:not(:disabled) {
  background: #B91C1C;
}

.btn-confirm-retention:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsiveness */
@media (max-width: 1024px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .kpi-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .notif-head {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .notif-head-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .btn-prune-retention,
  .btn-refresh {
    width: 100%;
    justify-content: center;
  }
  .filter-row-top {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-select,
  .search-box {
    width: 100%;
  }
  .notif-table {
    min-width: 800px;
  }
  .modal-retention-card {
    width: 100%;
    max-width: 100%;
    margin: 12px;
    max-height: 90vh;
  }
  .modal-foot {
    flex-direction: column;
    align-items: stretch;
  }
  .btn-cancel,
  .btn-confirm-retention {
    width: 100%;
    justify-content: center;
  }
}
</style>
