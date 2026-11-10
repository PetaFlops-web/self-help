<template>
  <div class="admin-data-page">
    <!-- Header -->
    <header class="data-head">
      <div>
        <h2 class="data-title">Manajemen Data &amp; Pipa ETL</h2>
        <p class="data-desc">
          Pipa ETL publik: SiRUP, SPSE, INAPROC, APBD, BPS, BPK, Harga Acuan, dan Batas Wilayah (FR-43, FR-53, FR-55).
        </p>
      </div>
      <div class="data-head-badge">
        <span class="data-badge-dot" />
        <span>SINKRONISASI AKTIF</span>
      </div>
    </header>

    <!-- Top KPI Cards -->
    <div class="data-kpi-grid">
      <div class="data-kpi-card">
        <span class="data-kpi-label">SUMBER DATA TERDAFTAR</span>
        <div class="data-kpi-val">{{ sources.length }} Sumber</div>
        <span class="data-kpi-hint">Konektor SRC-01 s/d SRC-08</span>
      </div>

      <div class="data-kpi-card">
        <span class="data-kpi-label">ANOMALI VALIDASI</span>
        <div class="data-kpi-val" :class="errorsTotal > 0 ? 'text-danger' : 'text-success'">
          {{ errorsTotal }} Baris
        </div>
        <span class="data-kpi-hint">Membutuhkan kurasi / perbaikan skema</span>
      </div>

      <div class="data-kpi-card">
        <span class="data-kpi-label">PENYELARASAN PAKET</span>
        <div class="data-kpi-val" :class="unmatchedTotal > 0 ? 'text-warning' : 'text-success'">
          {{ unmatchedTotal }} Paket
        </div>
        <span class="data-kpi-hint">Paket SiRUP belum berpasangan dengan SPSE</span>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="data-alert data-alert--danger">
      <p>{{ error }}</p>
      <button class="data-btn-retry" @click="fetchActiveTabData">Coba Lagi</button>
    </div>

    <!-- Success Feedback Toast -->
    <div v-if="feedback" class="data-alert data-alert--success">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <p>{{ feedback }}</p>
      <button class="data-btn-close-toast" aria-label="Tutup notifikasi" @click="feedback = ''">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <!-- Main Navigation Tabs -->
    <div class="data-tabs">
      <button
        class="data-tab"
        :class="{ 'is-active': activeTab === 'sources' }"
        @click="switchTab('sources')"
      >
        Sumber Data Publik ({{ sources.length }})
      </button>
      <button
        class="data-tab"
        :class="{ 'is-active': activeTab === 'errors' }"
        @click="switchTab('errors')"
      >
        Anomali Validasi
        <span v-if="errorsTotal" class="data-tab-count is-danger">{{ errorsTotal }}</span>
      </button>
      <button
        class="data-tab"
        :class="{ 'is-active': activeTab === 'unmatched' }"
        @click="switchTab('unmatched')"
      >
        Penyelarasan Paket
        <span v-if="unmatchedTotal" class="data-tab-count is-warning">{{ unmatchedTotal }}</span>
      </button>
    </div>

    <!-- Tab 1: Sumber Data Publik -->
    <section v-if="activeTab === 'sources'" class="data-card">
      <div class="data-card-head">
        <div>
          <h3 class="data-card-title">Daftar Pipa Sumber Data (SRC-01 s/d SRC-08)</h3>
          <p class="data-card-desc">Status izin scraping, kepatuhan lisensi open data, dan pemutakhiran berkala</p>
        </div>
        <button class="data-btn-refresh-sm" :disabled="loading" @click="fetchSources">
          <span>{{ loading ? 'Memuat…' : 'Segarkan Sumber' }}</span>
        </button>
      </div>

      <div v-if="loading && !sources.length" class="data-loading-state">
        <SkeletonBlock v-for="i in 5" :key="i" height="48px" radius="6px" class="data-skeleton-row" />
      </div>

      <div v-else class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>SUMBER DATA &amp; ENDPOINT</th>
              <th>LISENSI &amp; ATRIBUSI</th>
              <th>IZIN AKSES</th>
              <th>TERAKHIR DIAMBIL</th>
              <th>VOLUME BARIS</th>
              <th>AKSI</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="src in sources" :key="src.source_id">
              <td class="cell-source">
                <span class="source-id">{{ src.source_id }}</span>
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
                <strong>{{ src.row_count ? src.row_count.toLocaleString('id-ID') : '—' }}</strong> baris
              </td>
              <td>
                <button
                  class="data-btn-run"
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
    </section>

    <!-- Tab 2: Anomali Validasi Baris -->
    <section v-if="activeTab === 'errors'" class="data-card">
      <div class="data-card-head">
        <div>
          <h3 class="data-card-title">Antrean Anomali Validasi Skema ETL</h3>
          <p class="data-card-desc">Baris mentah yang ditolak karena pelanggaran format atau nilai tidak valid</p>
        </div>
      </div>

      <div v-if="loading && !errors.length" class="data-loading-state">
        <SkeletonBlock v-for="i in 6" :key="i" height="44px" radius="6px" class="data-skeleton-row" />
      </div>

      <div v-else-if="!errors.length" class="data-empty-state">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-success">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <p>Tidak ada baris anomali validasi. Semua data ETL berhasil tervalidasi.</p>
      </div>

      <div v-else class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID ERROR</th>
              <th>SUMBER DATA</th>
              <th>ALASAN PENOLAKAN</th>
              <th>PAYLOAD MENTAH</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="errItem in errors" :key="errItem.id">
              <td class="cell-err-id">
                <code>#{{ errItem.id }}</code>
              </td>
              <td>
                <span class="source-chip">{{ errItem.source_id || '—' }}</span>
              </td>
              <td class="cell-err-reason">
                <span class="err-reason-text">{{ errItem.alasan || 'Format baris tidak valid' }}</span>
              </td>
              <td>
                <button class="data-btn-raw" @click="openDrawer(errItem)">
                  Raw JSON ⎘
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Tab 3: Penyelarasan Paket Tender (SiRUP vs SPSE) -->
    <section v-if="activeTab === 'unmatched'" class="data-card">
      <div class="data-card-head">
        <div>
          <h3 class="data-card-title">Penyelarasan Paket SiRUP ↔ SPSE (FR-55)</h3>
          <p class="data-card-desc">Pencocokan paket rencana pengadaan (SiRUP) dengan tender lelang terlaksana (SPSE)</p>
        </div>
        <span class="unmatched-badge">{{ unmatchedList.length }} Paket Perlu Ditinjau</span>
      </div>

      <div v-if="loading && !unmatchedList.length" class="data-loading-state">
        <SkeletonBlock v-for="i in 3" :key="i" height="120px" radius="8px" class="data-skeleton-row" />
      </div>

      <div v-else-if="!unmatchedList.length" class="data-empty-state">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-success">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <p>Seluruh paket tender telah berhasil diselaraskan antarsumber.</p>
      </div>

      <div v-else class="data-match-grid">
        <div v-for="item in unmatchedList" :key="item.project.id" class="data-match-card">
          <!-- Main Comparison -->
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
                <polyline points="16 3 21 3 21 8"></polyline>
                <line x1="4" y1="20" x2="21" y2="3"></line>
                <polyline points="21 16 21 21 16 21"></polyline>
                <line x1="15" y1="15" x2="21" y2="21"></line>
                <line x1="4" y1="4" x2="9" y2="9"></line>
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
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
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
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Konfirmasi Cocokkan</span>
            </button>
          </div>
        </div>
      </div>
    </section>

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
      @close="drawerOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { adminEtlApi } from '@/services/api/admin-etl.api'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import EtlConfirmModal from '@/features/admin/components/EtlConfirmModal.vue'
import EtlRawJsonDrawer from '@/features/admin/components/EtlRawJsonDrawer.vue'
import { formatCurrency, formatDate } from '@/utils/formatters'

const auth = useAuthStore()

const activeTab = ref('sources')
const loading = ref(false)
const error = ref('')
const feedback = ref('')
const actionInProgress = ref(false)

const sources = ref([])
const errors = ref([])
const errorsTotal = ref(0)
const unmatchedList = ref([])
const unmatchedTotal = ref(0)

const confirmModalOpen = ref(false)
const selectedSource = ref(null)

const drawerOpen = ref(false)
const selectedError = ref(null)

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
    sources.value = res
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
    errors.value = res.errors
    errorsTotal.value = res.total
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
    unmatchedList.value = res.unmatched
    unmatchedTotal.value = res.total
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
      feedback.value = `Pipa ${source_id} berhasil dieksekusi: ${res.accepted} baris diterima, ${res.rejected} ditolak.`
    }
    if (onSuccess) onSuccess(res)
    fetchSources()
    fetchErrors()
    fetchUnmatched()
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Gagal menjalankan pipa ETL'
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
    // Refresh list
    fetchUnmatched()
  } catch (err) {
    error.value = err.message || 'Gagal memproses keputusan pencocokan'
  } finally {
    actionInProgress.value = false
  }
}

onMounted(() => {
  fetchSources()
  // Prefetch counts
  adminEtlApi.listErrors({ limit: 1 }).then(r => { errorsTotal.value = r.total }).catch(() => {})
  adminEtlApi.listUnmatched({ limit: 1 }).then(r => { unmatchedTotal.value = r.total }).catch(() => {})
})
</script>

<style scoped>
.admin-data-page {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  max-width: 1400px;
}

/* Header */
.data-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-3);
  padding-bottom: var(--sp-3);
  border-bottom: var(--bw) solid var(--c-border);
}
.data-title {
  font-size: var(--fs-2xl);
  font-weight: 800;
  color: var(--c-ink);
  margin: 0 0 4px 0;
}
.data-desc {
  font-size: var(--fs-sm);
  color: var(--c-muted);
  margin: 0;
}
.data-head-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: var(--fs-micro);
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--r-pill);
  border: 1px solid rgba(255, 107, 43, 0.2);
}
.data-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-primary);
}

/* KPI Grid */
.data-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--sp-4);
}
.data-kpi-card {
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-lg);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.data-kpi-label {
  font-size: var(--fs-micro);
  font-weight: 700;
  color: var(--c-muted);
  letter-spacing: 0.5px;
}
.data-kpi-val {
  font-size: 24px;
  font-weight: 800;
  color: var(--c-ink);
}
.data-kpi-val.text-danger { color: var(--c-danger); }
.data-kpi-val.text-warning { color: var(--c-warning); }
.data-kpi-val.text-success { color: var(--c-success); }
.data-kpi-hint {
  font-size: var(--fs-xs);
  color: var(--c-subtle);
}

/* Alerts */
.data-alert {
  padding: 12px 16px;
  border-radius: var(--r-md);
  font-size: var(--fs-sm);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.data-alert--danger {
  background: var(--c-danger-soft);
  color: var(--c-danger);
  border: 1px solid rgba(214, 58, 31, 0.2);
}
.data-alert--success {
  background: var(--c-success-soft);
  color: var(--c-success);
  border: 1px solid rgba(46, 139, 87, 0.2);
}
.data-btn-retry,
.data-btn-close-toast {
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 700;
}

/* Tabs */
.data-tabs {
  display: flex;
  gap: 8px;
  border-bottom: var(--bw) solid var(--c-border);
  overflow-x: auto;
}
.data-tab {
  height: 40px;
  padding: 0 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.data-tab:hover {
  color: var(--c-ink);
}
.data-tab.is-active {
  color: var(--c-primary);
  border-bottom-color: var(--c-primary);
}
.data-tab-count {
  font-size: var(--fs-micro);
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--r-pill);
}
.data-tab-count.is-danger { background: var(--c-danger-soft); color: var(--c-danger); }
.data-tab-count.is-warning { background: var(--c-warning-soft); color: var(--c-warning); }

/* Card Content */
.data-card {
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-lg);
  overflow: hidden;
}
.data-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: 20px;
  border-bottom: var(--bw) solid var(--c-border);
  background: var(--c-bg-alt);
}
.data-card-title {
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-ink);
  margin: 0;
}
.data-card-desc {
  font-size: var(--fs-xs);
  color: var(--c-muted);
  margin: 2px 0 0 0;
}
.data-btn-refresh-sm {
  height: 32px;
  padding: 0 12px;
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-sm);
  font-size: var(--fs-xs);
  font-weight: 600;
  cursor: pointer;
}

/* Table */
.data-table-scroll {
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-xs);
}
.data-table th {
  background: var(--c-bg-alt);
  color: var(--c-muted);
  font-size: var(--fs-micro);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 10px 16px;
  text-align: left;
  border-bottom: var(--bw) solid var(--c-border);
}
.data-table td {
  padding: 14px 16px;
  border-bottom: var(--bw) solid var(--c-border);
  color: var(--c-ink);
  vertical-align: middle;
}
.data-table tr:last-child td {
  border-bottom: none;
}

/* Source Cell */
.cell-source {
  min-width: 220px;
}
.source-id {
  display: block;
  font-family: monospace;
  font-size: var(--fs-micro);
  font-weight: 700;
  color: var(--c-primary-text);
}
.source-name {
  display: block;
  font-size: var(--fs-sm);
  color: var(--c-ink);
}
.source-url {
  display: block;
  font-size: var(--fs-micro);
  color: var(--c-subtle);
  word-break: break-all;
}

.cell-lic {
  min-width: 160px;
}
.lic-name {
  display: block;
  font-weight: 600;
}
.lic-attrib {
  display: block;
  font-size: var(--fs-micro);
  color: var(--c-muted);
}

.data-chip {
  display: inline-block;
  font-size: var(--fs-micro);
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--r-pill);
}
.data-chip.chip-success { background: var(--c-success-soft); color: var(--c-success); }
.data-chip.chip-warning { background: var(--c-warning-soft); color: var(--c-warning); }

.cell-date, .cell-vol {
  white-space: nowrap;
}

.data-btn-run {
  height: 30px;
  padding: 0 12px;
  background: var(--c-primary-soft);
  color: var(--c-primary-text);
  border: 1px solid rgba(255, 107, 43, 0.3);
  border-radius: var(--r-sm);
  font-size: var(--fs-xs);
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.data-btn-run:hover:not(:disabled) {
  background: var(--c-primary);
  color: var(--c-ink);
}

/* Error cell */
.cell-err-id code {
  font-family: monospace;
  font-weight: 700;
  color: var(--c-danger);
}
.source-chip {
  font-size: var(--fs-micro);
  font-weight: 600;
  background: var(--c-bg);
  padding: 2px 6px;
  border-radius: var(--r-xs);
}
.cell-err-reason {
  color: var(--c-muted);
}
.data-btn-raw {
  height: 28px;
  padding: 0 10px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--r-sm);
  font-size: var(--fs-micro);
  font-weight: 700;
  color: var(--c-ink);
  cursor: pointer;
}
.data-btn-raw:hover {
  background: var(--c-border);
}

/* Matching Grid */
.data-match-grid {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}
.data-match-card {
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-surface);
  overflow: hidden;
}
.match-card-content {
  display: grid;
  grid-template-columns: 1fr 100px 1fr;
  align-items: center;
  padding: 16px 20px;
  gap: 16px;
}
.match-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border-radius: var(--r-sm);
  background: var(--c-bg-alt);
}
.match-box.is-sirup {
  border-left: 3px solid var(--c-primary);
}
.match-box.is-spse {
  border-left: 3px solid var(--c-info);
}
.match-source-tag {
  font-size: var(--fs-micro);
  font-weight: 800;
  color: var(--c-primary);
}
.match-source-tag.is-spse-tag {
  color: var(--c-info);
}
.match-proj-name {
  font-size: var(--fs-sm);
  color: var(--c-ink);
  line-height: 1.35;
}
.match-proj-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: var(--fs-micro);
  color: var(--c-muted);
}
.match-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.match-arrow-icon {
  font-size: 20px;
  color: var(--c-subtle);
}
.match-similarity-pill {
  font-size: var(--fs-micro);
  font-weight: 800;
  color: var(--c-success);
  background: var(--c-success-soft);
  padding: 2px 8px;
  border-radius: var(--r-pill);
  white-space: nowrap;
}
.match-card-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px;
  background: var(--c-bg);
  border-top: var(--bw) solid var(--c-border);
}
.match-btn-reject {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-sm);
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-muted);
  cursor: pointer;
}
.match-btn-accept {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  background: var(--c-success);
  border: none;
  border-radius: var(--r-sm);
  font-size: var(--fs-xs);
  font-weight: 700;
  color: #FFF;
  cursor: pointer;
}
.match-btn-accept:hover:not(:disabled) {
  background: #247547;
}

.unmatched-badge {
  font-size: var(--fs-xs);
  font-weight: 700;
  background: var(--c-warning-soft);
  color: var(--c-warning);
  padding: 4px 10px;
  border-radius: var(--r-pill);
}

.data-loading-state,
.data-empty-state {
  padding: 32px 20px;
}
.data-empty-state {
  text-align: center;
  color: var(--c-muted);
  font-size: var(--fs-sm);
}
.data-skeleton-row {
  margin-bottom: 8px;
}

@media (max-width: 900px) {
  .match-card-content {
    grid-template-columns: 1fr;
  }
}
</style>
