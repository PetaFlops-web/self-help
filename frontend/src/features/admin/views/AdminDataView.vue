<template>
  <div class="admin-data-page">

    <!-- Topbar / Header -->
    <header class="data-head">
      <div class="data-title-group">
        <h1 class="data-title">
          Manajemen Data &amp; Pipa ETL
        </h1>
      </div>
    </header>

    <!-- Subheader Tabs (Pill Tab Bar Konsisten dengan Daftar Proyek & Laporan) -->
    <nav class="data-tabs-bar" aria-label="Tab manajemen data ETL">
      <div class="tabs-list">
        <button
          v-for="tab in dataTabs"
          :key="tab.value"
          class="tab-item"
          :class="{ 'is-active': activeTab === tab.value }"
          @click="switchTab(tab.value)"
        >
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </nav>

    <!-- 4 KPI Cards (Ringkasan Eksekutif Pipa ETL) -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">SUMBER DATA TERDAFTAR</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="50px" radius="6px" />
          <span v-else class="kpi-val">{{ sources.length }} Sumber</span>
        </div>
        <span class="kpi-sub">Konektor pipa data publik</span>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">TOTAL VOLUME ETL</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="70px" radius="6px" />
          <span v-else class="kpi-val">{{ totalRowsFormatted }} Baris</span>
        </div>
        <span class="kpi-sub">Data terintegrasi SiRUP &amp; SPSE</span>
      </div>

      <div class="kpi-card" :class="{ 'kpi-card--danger': errorsTotal > 0 }">
        <span class="kpi-label">ANOMALI VALIDASI</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="40px" radius="6px" />
          <span v-else class="kpi-val" :class="errorsTotal > 0 ? 'text-danger' : 'text-success'">
            {{ errorsTotal }} Baris
          </span>
        </div>
        <span class="kpi-sub">Membutuhkan kurasi skema</span>
      </div>

      <div class="kpi-card" :class="{ 'kpi-card--warning': unmatchedTotal > 0 }">
        <span class="kpi-label">PENYELARASAN PAKET</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="40px" radius="6px" />
          <span v-else class="kpi-val" :class="unmatchedTotal > 0 ? 'text-warning' : 'text-success'">
            {{ unmatchedTotal }} Paket
          </span>
        </div>
        <span class="kpi-sub">Paket SiRUP belum klop SPSE</span>
      </div>
    </div>

    <!-- Alert Notifikasi Sukses / Galat -->
    <div v-if="error" class="alert-banner alert-banner--danger">
      <div class="alert-left">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="alert-icon">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ error }}</span>
      </div>
      <button class="alert-btn-retry" @click="fetchActiveTabData">Coba Lagi</button>
    </div>

    <div v-if="feedback" class="alert-banner alert-banner--success">
      <div class="alert-left">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="alert-icon">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{{ feedback }}</span>
      </div>
      <button class="alert-close-btn" aria-label="Tutup notifikasi" @click="feedback = ''">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Filter Card Mandiri (2 Baris / Responsive Row) -->
    <div class="data-filter-card">
      <!-- Filter Controls: Tab 1 Sumber Data -->
      <template v-if="activeTab === 'sources'">
        <div class="filter-controls-row">
          <div class="search-box">
            <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="6" cy="6" r="4.5" />
              <path d="M9.5 9.5 13 13" />
            </svg>
            <input
              v-model="searchQuerySources"
              type="text"
              placeholder="Cari nama sumber, URL..."
              class="search-input"
            />
          </div>

          <div class="filter-select-wrap">
            <select v-model="filterAccess" class="filter-select">
              <option value="all">Izin Akses: Semua</option>
              <option value="auto">Otomatis Saja</option>
              <option value="manual">Kurasi Manual Saja</option>
            </select>
          </div>

          <button class="btn-refresh" :disabled="loading" @click="fetchSources">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Segarkan Sumber</span>
          </button>
        </div>
      </template>

      <!-- Filter Controls: Tab 2 Anomali Validasi -->
      <template v-else-if="activeTab === 'errors'">
        <div class="filter-controls-row">
          <div class="filter-select-wrap">
            <select v-model="filterErrorSource" class="filter-select">
              <option value="all">Sumber Data: Semua</option>
              <option v-for="s in sourceOptions" :key="s.id" :value="s.id">
                {{ s.label }}
              </option>
            </select>
          </div>

          <button class="btn-refresh" :disabled="loading" @click="fetchErrors">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Segarkan Anomali</span>
          </button>
        </div>
      </template>

      <!-- Filter Controls: Tab 3 Penyelarasan Paket -->
      <template v-else-if="activeTab === 'unmatched'">
        <div class="filter-controls-row">
          <button
            class="chip-filter"
            :class="{ 'is-active': filterHighSimilarityOnly }"
            @click="filterHighSimilarityOnly = !filterHighSimilarityOnly"
          >
            <span class="chip-dot">●</span>
            <span>Hanya Kemiripan &gt; 50%</span>
          </button>

          <button class="btn-refresh" :disabled="loading" @click="fetchUnmatched">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Segarkan Penyelarasan</span>
          </button>
        </div>
      </template>
    </div>

    <!-- Tab 1: Sumber Data Publik -->
    <div v-if="activeTab === 'sources'" class="data-table-card">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col" class="th-source">SUMBER DATA &amp; ENDPOINT</th>
              <th scope="col" class="th-license">LISENSI &amp; ATRIBUSI</th>
              <th scope="col" class="th-access">IZIN AKSES</th>
              <th scope="col" class="th-date">TERAKHIR DIAMBIL</th>
              <th scope="col" class="th-vol">VOLUME BARIS</th>
              <th scope="col" class="th-action">AKSI</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading && !sources.length">
              <tr v-for="n in 6" :key="`skel-src-${n}`" class="table-row skeleton-row">
                <td class="cell-source">
                  <SkeletonBlock height="12px" width="55px" radius="3px" />
                  <SkeletonBlock height="15px" width="180px" radius="4px" style="margin-top: 5px;" />
                  <SkeletonBlock height="11px" width="140px" radius="3px" style="margin-top: 4px;" />
                </td>
                <td class="cell-lic">
                  <SkeletonBlock height="14px" width="110px" radius="4px" />
                  <SkeletonBlock height="11px" width="90px" radius="3px" style="margin-top: 4px;" />
                </td>
                <td><SkeletonBlock height="22px" width="75px" radius="999px" /></td>
                <td><SkeletonBlock height="14px" width="85px" radius="4px" /></td>
                <td><SkeletonBlock height="14px" width="70px" radius="4px" /></td>
                <td><SkeletonBlock height="28px" width="85px" radius="999px" /></td>
              </tr>
            </template>
            <tr v-else-if="!filteredSources.length" class="table-row">
              <td colspan="6" class="td-empty">
                <p class="empty-title">Tidak ada sumber data yang sesuai</p>
                <p class="empty-desc">Coba sesuaikan kata kunci pencarian atau filter izin akses.</p>
              </td>
            </tr>
            <tr v-for="src in filteredSources" :key="src.source_id" class="table-row">
              <td class="cell-source">
                <strong class="source-name">{{ src.nama }}</strong>
                <span v-if="src.url" class="source-url">{{ src.url }}</span>
              </td>
              <td class="cell-lic">
                <span class="lic-name">{{ src.lisensi || 'Open Data Terbuka' }}</span>
                <span class="lic-attrib">{{ src.atribusi || 'Pemerintah RI' }}</span>
              </td>
              <td>
                <span class="data-chip" :class="src.boleh_otomatis ? 'chip-success' : 'chip-warning'">
                  {{ src.boleh_otomatis ? 'Otomatis' : 'Kurasi Manual' }}
                </span>
              </td>
              <td class="cell-date">
                {{ formatDate(src.last_fetched_at) }}
              </td>
              <td class="cell-vol">
                <strong class="vol-num">{{ src.row_count ? src.row_count.toLocaleString('id-ID') : '—' }}</strong> baris
              </td>
              <td class="cell-action">
                <button
                  class="btn-action-run"
                  :disabled="loading"
                  @click="openRunModal(src)"
                >
                  Jalankan ⟳
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 2: Anomali Validasi Baris -->
    <div v-if="activeTab === 'errors'" class="data-table-card">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col" class="th-err-id">ID ERROR</th>
              <th scope="col" class="th-err-src">SUMBER DATA</th>
              <th scope="col" class="th-err-reason">ALASAN PENOLAKAN</th>
              <th scope="col" class="th-err-raw">PAYLOAD MENTAH</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading && !errors.length">
              <tr v-for="n in 6" :key="`skel-err-${n}`" class="table-row skeleton-row">
                <td><SkeletonBlock height="16px" width="60px" radius="4px" /></td>
                <td><SkeletonBlock height="22px" width="70px" radius="6px" /></td>
                <td><SkeletonBlock height="14px" width="220px" radius="4px" /></td>
                <td><SkeletonBlock height="28px" width="80px" radius="8px" /></td>
              </tr>
            </template>
            <tr v-else-if="!filteredErrors.length" class="table-row">
              <td colspan="4" class="td-empty">
                <div class="empty-icon-box">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#16a34a" stroke-width="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p class="empty-title">Tidak ada baris anomali validasi</p>
                <p class="empty-desc">Seluruh data yang masuk dari pipa ETL berhasil divalidasi dengan baik.</p>
              </td>
            </tr>
            <tr v-for="errItem in filteredErrors" :key="errItem.id" class="table-row">
              <td class="cell-err-id">
                <code>#{{ errItem.id }}</code>
              </td>
              <td>
                <span class="source-chip">{{ getSourceName(errItem.source_id) }}</span>
              </td>
              <td class="cell-err-reason">
                <span class="err-reason-text">{{ errItem.alasan || 'Format baris tidak valid' }}</span>
              </td>
              <td>
                <button class="btn-action-raw" @click="openDrawer(errItem)">
                  <span>Raw JSON</span>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 3: Penyelarasan Paket Tender (SiRUP vs SPSE) -->
    <div v-if="activeTab === 'unmatched'" class="data-table-card">
      <div class="data-card-subhead">
        <div>
          <h3 class="subhead-title">Penyelarasan Paket SiRUP ↔ SPSE</h3>
          <p class="subhead-desc">Pencocokan paket rencana pengadaan (SiRUP) dengan tender lelang terlaksana (SPSE)</p>
        </div>
        <span class="unmatched-badge">{{ unmatchedList.length }} Paket Perlu Ditinjau</span>
      </div>

      <div v-if="loading && !unmatchedList.length" class="data-loading-grid">
        <div v-for="i in 3" :key="`skel-match-${i}`" class="match-card-skeleton">
          <SkeletonBlock height="140px" radius="12px" />
        </div>
      </div>

      <div v-else-if="!filteredUnmatched.length" class="td-empty td-empty--padded">
        <div class="empty-icon-box">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#16a34a" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p class="empty-title">Seluruh paket tender telah berhasil diselaraskan antarsumber</p>
        <p class="empty-desc">Tidak ada antrean paket lelang yang memerlukan intervensi manual.</p>
      </div>

      <div v-else class="data-match-grid">
        <div v-for="item in filteredUnmatched" :key="item.project.id" class="data-match-card">
          <div class="match-card-content">
            <!-- SiRUP side -->
            <div class="match-box is-sirup">
              <span class="match-source-tag">SiRUP (Rencana)</span>
              <strong class="match-proj-name">{{ item.project.nama }}</strong>
              <div class="match-proj-meta">
                <span>{{ item.project.dinas || 'Dinas Terkait' }}</span>
                <span>TA {{ item.project.tahun_anggaran }}</span>
                <strong>Pagu: {{ formatCurrency(item.project.pagu) }}</strong>
              </div>
            </div>

            <!-- Intersect indicator -->
            <div class="match-divider">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="match-arrow-icon">
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
              <span v-if="item.candidates?.[0]?.skor" class="match-similarity-pill">
                {{ Math.round(item.candidates[0].skor) }}% Mirip
              </span>
            </div>

            <!-- SPSE Candidate side -->
            <div class="match-box is-spse">
              <span class="match-source-tag is-spse-tag">Kandidat SPSE Teratas</span>
              <template v-if="item.candidates?.[0]">
                <strong class="match-proj-name">{{ item.candidates[0].nama }}</strong>
                <div class="match-proj-meta">
                  <span>{{ item.candidates[0].dinas || 'Dinas Terkait' }}</span>
                  <strong>HPS: {{ formatCurrency(item.candidates[0].pagu) }}</strong>
                </div>
              </template>
              <template v-else>
                <p class="match-no-candidate">Tidak ada kandidat lelang SPSE yang mirip.</p>
              </template>
            </div>
          </div>

          <!-- Actions -->
          <div class="match-card-actions">
            <button
              class="match-btn-reject"
              :disabled="actionInProgress"
              @click="handleMatchDecision(item.project.id, item.candidates?.[0]?.id, 'not_match')"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>Bukan Pasangan Cocok</span>
            </button>
            <button
              v-if="item.candidates?.[0]"
              class="match-btn-accept"
              :disabled="actionInProgress"
              @click="handleMatchDecision(item.project.id, item.candidates[0].id, 'match')"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Konfirmasi Cocokkan</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals & Drawers -->
    <EtlConfirmModal
      :open="confirmModalOpen"
      :source="selectedSource"
      :admin-name="auth.user?.nama || 'Administrator'"
      @close="confirmModalOpen = false"
      @executed="executePipeline"
    />

    <EtlRawJsonDrawer
      :open="drawerOpen"
      :error-item="selectedError"
      :source-name="getSourceName(selectedError?.source_id)"
      @close="drawerOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { adminEtlApi } from '@/services/api/admin-etl.api'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import EtlConfirmModal from '@/features/admin/components/EtlConfirmModal.vue'
import EtlRawJsonDrawer from '@/features/admin/components/EtlRawJsonDrawer.vue'
import { formatCurrency, formatDate } from '@/utils/formatters'

const auth = useAuthStore()
const toast = useToast()

const activeTab = ref('sources')
const loading = ref(false)
const dataLoaded = ref(false)
const error = ref('')
const feedback = ref('')
const actionInProgress = ref(false)

const sources = ref([])
const errors = ref([])
const errorsTotal = ref(0)
const unmatchedList = ref([])
const unmatchedTotal = ref(0)

// Filters State
const searchQuerySources = ref('')
const filterAccess = ref('all')
const filterErrorSource = ref('all')
const filterHighSimilarityOnly = ref(false)

const confirmModalOpen = ref(false)
const selectedSource = ref(null)

const drawerOpen = ref(false)
const selectedError = ref(null)

// Total rows
const totalRows = computed(() => {
  return sources.value.reduce((acc, s) => acc + (Number(s.row_count) || 0), 0)
})

const totalRowsFormatted = computed(() => totalRows.value.toLocaleString('id-ID'))

// Tabs Navigation
const dataTabs = computed(() => [
  { value: 'sources', label: 'Sumber Data Publik', count: sources.value.length },
  {
    value: 'errors',
    label: 'Anomali Validasi',
    count: errorsTotal.value,
    badgeClass: errorsTotal.value > 0 ? 'is-danger' : '',
  },
  {
    value: 'unmatched',
    label: 'Penyelarasan Paket',
    count: unmatchedTotal.value,
    badgeClass: unmatchedTotal.value > 0 ? 'is-warning' : '',
  },
])

// Filtered Sources
const filteredSources = computed(() => {
  return sources.value.filter((s) => {
    if (filterAccess.value === 'auto' && !s.boleh_otomatis) return false
    if (filterAccess.value === 'manual' && s.boleh_otomatis) return false
    if (searchQuerySources.value.trim()) {
      const q = searchQuerySources.value.trim().toLowerCase()
      const matchId = s.source_id?.toLowerCase().includes(q)
      const matchName = s.nama?.toLowerCase().includes(q)
      const matchUrl = s.url?.toLowerCase().includes(q)
      return matchId || matchName || matchUrl
    }
    return true
  })
})

// Filtered Errors
const filteredErrors = computed(() => {
  return errors.value.filter((err) => {
    if (filterErrorSource.value !== 'all' && err.source_id !== filterErrorSource.value) return false
    return true
  })
})

// Filtered Unmatched
const filteredUnmatched = computed(() => {
  return unmatchedList.value.filter((u) => {
    if (filterHighSimilarityOnly.value && (!u.candidates?.[0]?.skor || u.candidates[0].skor < 50)) {
      return false
    }
    return true
  })
})

function getSourceName(id) {
  if (!id) return '—'
  const found = sources.value.find((s) => s.source_id === id)
  return found?.nama || id
}

const sourceOptions = computed(() => {
  const ids = [...new Set(sources.value.map((s) => s.source_id).filter(Boolean))]
  return ids.map((id) => ({
    id,
    label: getSourceName(id),
  }))
})

function switchTab(tab) {
  activeTab.value = tab
  error.value = ''
  fetchActiveTabData()
}

async function fetchSources() {
  loading.value = true
  error.value = ''
  try {
    const res = await adminEtlApi.listSources()
    sources.value = res || []
    dataLoaded.value = true
  } catch (err) {
    error.value = err.message || 'Gagal memuat sumber data ETL'
  } finally {
    loading.value = false
  }
}

async function fetchErrors() {
  loading.value = true
  error.value = ''
  try {
    const res = await adminEtlApi.listErrors({ limit: 50 })
    errors.value = res.errors || []
    errorsTotal.value = res.total || 0
  } catch (err) {
    error.value = err.message || 'Gagal memuat antrean anomali'
  } finally {
    loading.value = false
  }
}

async function fetchUnmatched() {
  loading.value = true
  error.value = ''
  try {
    const res = await adminEtlApi.listUnmatched({ limit: 20 })
    unmatchedList.value = res.unmatched || []
    unmatchedTotal.value = res.total || 0
  } catch (err) {
    error.value = err.message || 'Gagal memuat paket belum cocok'
  } finally {
    loading.value = false
  }
}

function fetchActiveTabData() {
  if (activeTab.value === 'sources') fetchSources()
  else if (activeTab.value === 'errors') fetchErrors()
  else if (activeTab.value === 'unmatched') fetchUnmatched()
}

function openRunModal(src) {
  selectedSource.value = src
  confirmModalOpen.value = true
}

async function executePipeline(payload) {
  const { source_id, mode, file, csv_content, onSuccess, onError } = payload
  error.value = ''
  try {
    let res
    if (mode === 'upload' && file) {
      res = await adminEtlApi.importFile(file, source_id)
      feedback.value = `Berkas "${file.name}" berhasil diimpor: ${res.accepted} baris diterima, ${res.rejected} ditolak.`
    } else if (mode === 'sample' && csv_content) {
      res = await adminEtlApi.runEtl({ source_id, csv_content })
      feedback.value = `Uji coba sampel data SiRUP berhasil: ${res.accepted} baris diterima, ${res.rejected} ditolak.`
    } else {
      res = await adminEtlApi.runEtl({ source_id })
      feedback.value = `Pipa data "${getSourceName(source_id)}" berhasil dieksekusi: ${res.accepted} baris diterima, ${res.rejected} ditolak.`
    }
    toast.success(feedback.value, 'ETL Selesai')
    if (onSuccess) onSuccess(res)
    fetchSources()
    fetchErrors()
    fetchUnmatched()
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Gagal menjalankan pipa ETL'
    toast.error(error.value, 'Gagal Menjalankan ETL')
    if (onError) onError(err)
  }
}

function openDrawer(errItem) {
  selectedError.value = errItem
  drawerOpen.value = true
}

async function handleMatchDecision(unmatchedId, matchedId, decision) {
  actionInProgress.value = true
  error.value = ''
  try {
    await adminEtlApi.matchDecision({
      unmatched_id: unmatchedId,
      matched_id: matchedId || unmatchedId,
      decision,
    })
    feedback.value = decision === 'match'
      ? 'Keputusan pencocokan paket berhasil disimpan.'
      : 'Penolakan pasangan paket tender berhasil dicatat.'
    toast.success(feedback.value, 'Pencocokan Tersimpan')
    fetchUnmatched()
  } catch (err) {
    error.value = err.message || 'Gagal memproses keputusan pencocokan'
    toast.error(error.value, 'Gagal Memproses Pencocokan')
  } finally {
    actionInProgress.value = false
  }
}

onMounted(() => {
  fetchSources()
  adminEtlApi.listErrors({ limit: 1 }).then((r) => { errorsTotal.value = r.total }).catch(() => {})
  adminEtlApi.listUnmatched({ limit: 1 }).then((r) => { unmatchedTotal.value = r.total }).catch(() => {})
})
</script>

<style scoped>
.admin-data-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Breadcrumb Tag */
.data-breadcrumb-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-ink, #111111);
  margin-bottom: 2px;
}

.dot-orange {
  color: #ff5c00;
  font-size: 10px;
}

/* Head */
.data-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.data-title-group {
  flex: 1 1 auto;
  min-width: 280px;
}

.data-title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: var(--c-ink, #111111);
  line-height: 1.25;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
}

.data-count {
  font-size: 12px;
  font-weight: 500;
  color: var(--c-muted, #6B6760);
}

.sync-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #ECFDF5;
  color: #065F46;
  border: 1px solid #A7F3D0;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

/* Tabs Bar */
.data-tabs-bar {
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-lg, 12px);
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
  border-radius: var(--r-md, 8px);
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
  padding: 1px 6px;
  font-size: 10px;
  border-radius: 999px;
  background: #e5e3dc;
  color: #4b5563;
}

.tab-count.is-danger {
  background: #FEE2E2;
  color: #991B1B;
}

.tab-count.is-warning {
  background: #FEF3C7;
  color: #92400E;
}

/* KPI Grid */
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
}

.kpi-card--danger {
  border-left: 3.5px solid #dc2626;
}

.kpi-card--warning {
  border-left: 3.5px solid #d97706;
}

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
}

.kpi-val {
  font-size: 20px;
  font-weight: 800;
  color: var(--c-ink, #111111);
}

.kpi-sub {
  font-size: 10.5px;
  color: var(--c-muted, #6B6760);
}

.text-danger { color: #dc2626 !important; }
.text-warning { color: #d97706 !important; }
.text-success { color: #16a34a !important; }

/* Alerts */
.alert-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 11.5px;
  gap: 12px;
}

.alert-banner--success {
  background: #ECFDF5;
  border: 1px solid #A7F3D0;
  color: #065F46;
}

.alert-banner--danger {
  background: #FEF2F2;
  border: 1px solid #FECACA;
  color: #991B1B;
}

.alert-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.alert-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  padding: 2px;
}

.alert-btn-retry {
  background: #FFFFFF;
  border: 1px solid #FECACA;
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 700;
  color: #991B1B;
  cursor: pointer;
}

/* Filter Card */
.data-filter-card {
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 16px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-controls-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  width: 250px;
  height: 36px;
}

.search-box svg {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--c-muted, #6B6760);
}

.search-input {
  width: 100%;
  height: 100%;
  padding: 0 12px 0 32px;
  font-family: inherit;
  font-size: 11.5px;
  background: var(--c-bg-alt, #F8F7F4);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 8px;
  color: var(--c-ink, #111111);
  outline: none;
  transition: border-color 0.15s ease;
}

.search-input:focus {
  border-color: #ff5c00;
}

.filter-select-wrap {
  width: 200px;
}

.filter-select {
  width: 100%;
  height: 36px;
  padding: 0 28px 0 12px;
  font-family: inherit;
  font-size: 11.5px;
  color: var(--c-ink, #111111);
  background-color: var(--c-bg-alt, #F8F7F4);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6760' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 12px;
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s ease;
  white-space: nowrap;
}

.filter-select:focus {
  border-color: #ff5c00;
}

.chip-filter {
  height: 34px;
  padding: 0 14px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 8px;
  color: #92400E;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.chip-filter .chip-dot {
  color: #ff5c00;
  font-size: 10px;
}

.chip-filter.is-active {
  background: #FEF3C7;
  border-color: #F59E0B;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}

.btn-refresh {
  height: 36px;
  padding: 0 14px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--c-ink, #111111);
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.btn-refresh:hover:not(:disabled) {
  background: var(--c-bg-alt, #F8F7F4);
  border-color: var(--c-border-strong, #DCD8D0);
}

/* Table Card */
.data-table-card {
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 16px;
  overflow: hidden;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 11.5px;
}

.data-table th {
  background: var(--c-bg-alt, #F8F7F4);
  color: var(--c-ink, #111111);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 12px 16px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  white-space: nowrap;
}

.data-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  color: var(--c-ink, #111111);
  vertical-align: middle;
}

.data-table tr:last-child td {
  border-bottom: none;
}

/* Specific Cells */
.cell-source {
  min-width: 240px;
}

.source-id {
  display: inline-block;
  font-family: monospace;
  font-size: 10.5px;
  font-weight: 700;
  color: #ff5c00;
  background: #FFF7ED;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid #FFEDD5;
  margin-bottom: 3px;
}

.source-name {
  display: block;
  font-size: 12.5px;
  font-weight: 700;
  color: #111827;
  line-height: 1.35;
}

.source-url {
  display: block;
  font-size: 11px;
  color: #6B7280;
  margin-top: 2px;
  word-break: break-all;
}

.cell-lic {
  min-width: 170px;
}

.lic-name {
  display: block;
  font-weight: 600;
  font-size: 12px;
  color: #1F2937;
}

.lic-attrib {
  display: block;
  font-size: 11px;
  color: #6B7280;
  margin-top: 2px;
}

.data-chip {
  display: inline-block;
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
}

.data-chip.chip-success {
  background: #ECFDF5;
  color: #065F46;
  border: 1px solid #A7F3D0;
}

.data-chip.chip-warning {
  background: #FFFBEB;
  color: #92400E;
  border: 1px solid #FDE68A;
}

.cell-date {
  white-space: nowrap;
  font-size: 11.5px;
  color: #4B5563;
}

.cell-vol {
  white-space: nowrap;
  font-size: 11.5px;
  color: #4B5563;
}

.vol-num {
  font-weight: 800;
  color: #111827;
}

.btn-action-run {
  height: 30px;
  padding: 0 14px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
  background: #ff5c00;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(255, 92, 0, 0.2);
  transition: background 0.15s ease;
}

.btn-action-run:hover:not(:disabled) {
  background: #e65300;
}

.btn-action-run:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* Error cell */
.cell-err-id code {
  font-family: monospace;
  font-weight: 700;
  color: #DC2626;
  background: #FEF2F2;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #FEE2E2;
}

.source-chip {
  font-size: 11px;
  font-weight: 600;
  background: #F3F4F6;
  color: #374151;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
}

.cell-err-reason {
  color: #4B5563;
  line-height: 1.4;
}

.btn-action-raw {
  height: 28px;
  padding: 0 12px;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: #1F2937;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}

.btn-action-raw:hover {
  background: #F9FAFB;
  border-color: #D1D5DB;
}

/* Empty States */
.td-empty {
  padding: 48px 24px;
  text-align: center;
}

.td-empty--padded {
  padding: 56px 24px;
}

.empty-icon-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #ECFDF5;
  margin-bottom: 10px;
}

.empty-title {
  margin: 0 0 4px;
  font-size: 13.5px;
  font-weight: 700;
  color: #111827;
}

.empty-desc {
  margin: 0;
  font-size: 11.5px;
  color: #6B7280;
}

/* Tab 3 Matching */
.data-card-subhead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #F8F7F4;
  border-bottom: 1px solid #E7E3DC;
  flex-wrap: wrap;
  gap: 12px;
}

.subhead-title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: #111827;
}

.subhead-desc {
  margin: 2px 0 0;
  font-size: 11px;
  color: #6B7280;
}

.unmatched-badge {
  font-size: 11px;
  font-weight: 700;
  background: #FEF3C7;
  color: #92400E;
  border: 1px solid #FDE68A;
  padding: 4px 12px;
  border-radius: 999px;
}

.data-match-grid {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.data-match-card {
  border: 1px solid #E7E3DC;
  border-radius: 14px;
  background: #FFFFFF;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.match-card-content {
  display: grid;
  grid-template-columns: 1fr 100px 1fr;
  align-items: center;
  padding: 18px 20px;
  gap: 16px;
}

.match-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 10px;
  background: #F9FAFB;
}

.match-box.is-sirup {
  border-left: 3.5px solid #ff5c00;
}

.match-box.is-spse {
  border-left: 3.5px solid #0284C7;
}

.match-source-tag {
  font-size: 10.5px;
  font-weight: 800;
  color: #ff5c00;
  letter-spacing: 0.02em;
}

.match-source-tag.is-spse-tag {
  color: #0284C7;
}

.match-proj-name {
  font-size: 12.5px;
  color: #111827;
  line-height: 1.4;
  font-weight: 700;
}

.match-proj-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 11px;
  color: #6B7280;
}

.match-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.match-arrow-icon {
  color: #9CA3AF;
}

.match-similarity-pill {
  font-size: 10.5px;
  font-weight: 800;
  color: #065F46;
  background: #ECFDF5;
  border: 1px solid #A7F3D0;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.match-card-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px;
  background: #F9FAFB;
  border-top: 1px solid #E5E7EB;
}

.match-btn-reject {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 16px;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s ease;
}

.match-btn-reject:hover:not(:disabled) {
  background: #F3F4F6;
  border-color: #D1D5DB;
}

.match-btn-accept {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 18px;
  background: #16A34A;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  color: #FFFFFF;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(22, 163, 74, 0.2);
  transition: background 0.15s ease;
}

.match-btn-accept:hover:not(:disabled) {
  background: #15803D;
}

.data-loading-grid {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 1024px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .data-head {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .kpi-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .match-card-content {
    grid-template-columns: 1fr;
  }
  .match-divider {
    transform: rotate(90deg);
    padding: 8px 0;
  }
  .data-table {
    min-width: 750px;
  }
}

@media (max-width: 640px) {
  .filter-controls-row {
    flex-direction: column;
    align-items: stretch;
  }
  .search-box,
  .filter-select-wrap,
  .filter-select,
  .btn-refresh,
  .chip-filter {
    width: 100%;
    justify-content: center;
  }
  .match-card-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .match-btn-reject,
  .match-btn-accept {
    width: 100%;
    justify-content: center;
  }
}
</style>
