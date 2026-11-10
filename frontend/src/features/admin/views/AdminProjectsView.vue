<template>
  <div class="admin-projects-page">
    <!-- Topbar / Header -->
    <header class="projects-head">
      <div>
        <h2 class="projects-title">Daftar Proyek Pengawasan</h2>
        <p class="projects-sub">
          {{ formattedToday }} · Total {{ total.toLocaleString('id-ID') }} Proyek Terdaftar
        </p>
      </div>

      <div class="projects-head-actions">
        <!-- Kotak Cari Cepat -->
        <div class="search-box">
          <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" />
            <path d="M9.5 9.5 13 13" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari RUP, SPSE, proyek..."
            class="search-input"
            @input="handleSearchDebounce"
          />
        </div>

        <!-- CTA Tambah Proyek Manual (Khusus Admin) -->
        <button
          v-if="auth.hasRole('admin')"
          class="btn-add-project"
          @click="openAddModal"
        >
          + Tambah Proyek Manual
        </button>
      </div>
    </header>

    <!-- Subheader Tabs (5 Status Tabs) -->
    <nav class="projects-tabs-bar" aria-label="Tab status proyek">
      <div class="tabs-list">
        <button
          class="tab-item"
          :class="{ 'is-active': activeTab === 'semua' }"
          @click="switchTab('semua')"
        >
          Semua Proyek
        </button>
        <button
          class="tab-item is-danger"
          :class="{ 'is-active': activeTab === 'tinggi' }"
          @click="switchTab('tinggi')"
        >
          Risiko Tinggi
        </button>
        <button
          class="tab-item is-warning"
          :class="{ 'is-active': activeTab === 'perhatian' }"
          @click="switchTab('perhatian')"
        >
          Perlu Perhatian
        </button>
        <button
          class="tab-item is-success"
          :class="{ 'is-active': activeTab === 'rendah' }"
          @click="switchTab('rendah')"
        >
          Risiko Rendah
        </button>
        <button
          class="tab-item is-unmatched"
          :class="{ 'is-active': activeTab === 'belum_cocok' }"
          @click="switchTab('belum_cocok')"
        >
          Belum Cocok
        </button>
      </div>
    </nav>

    <!-- 5 KPI Cards (Frame 04: 180×84 r10) -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">TOTAL PROYEK</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="50px" radius="6px" />
          <span v-else class="kpi-val">{{ total }}</span>
        </div>
        <span class="kpi-sub">Pagu {{ formatRupiahRingkas(totalPagu) }}</span>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">RISIKO TINGGI</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="40px" radius="6px" />
          <span v-else class="kpi-val text-danger">{{ kpiCounts.tinggi }}</span>
        </div>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">PERLU PERHATIAN</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="40px" radius="6px" />
          <span v-else class="kpi-val text-warning">{{ kpiCounts.perhatian }}</span>
        </div>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">RISIKO RENDAH</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="40px" radius="6px" />
          <span v-else class="kpi-val text-success">{{ kpiCounts.rendah }}</span>
        </div>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">BELUM COCOK</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="40px" radius="6px" />
          <span v-else class="kpi-val">{{ kpiCounts.unmatched }}</span>
        </div>
      </div>
    </div>

    <!-- Alert Sukses / Galat -->
    <div v-if="feedbackMsg" class="alert-banner alert-banner--success">
      <span>{{ feedbackMsg }}</span>
      <button class="alert-close-btn" aria-label="Tutup notifikasi" @click="feedbackMsg = ''">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
    <div v-if="errorMsg" class="alert-banner alert-banner--danger">
      <span>{{ errorMsg }}</span>
      <button class="alert-close-btn" aria-label="Tutup notifikasi" @click="errorMsg = ''">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Container Utama: Filter Bar + Tabel Proyek -->
    <div class="projects-main-card">
      <!-- Filter Bar Lengkap (h32 r6) -->
      <div class="projects-filter-bar">
        <div class="filter-controls">
          <!-- Wilayah -->
          <div class="filter-item">
            <select v-model="filterWilayah" class="filter-select" @change="handleFilterApply">
              <option value="semua">Wilayah: Semua Kab/Kota</option>
              <option v-for="w in regionOptions" :key="w.kode_bps" :value="w.kode_bps">
                {{ w.nama }}
              </option>
            </select>
          </div>

          <!-- Dinas -->
          <div class="filter-item">
            <select v-model="filterDinas" class="filter-select" @change="handleFilterApply">
              <option value="semua">Dinas: Semua SKPD</option>
              <option v-for="d in dinasOptions" :key="d" :value="d">
                {{ d }}
              </option>
            </select>
          </div>

          <!-- Kategori -->
          <div class="filter-item">
            <select v-model="filterKategori" class="filter-select" @change="handleFilterApply">
              <option value="semua">Kategori: Semua Skor</option>
              <option value="Tinggi">Tinggi</option>
              <option value="Perlu Perhatian">Perlu Perhatian</option>
              <option value="Rendah">Rendah</option>
            </select>
          </div>

          <!-- Integrasi / Asal Data -->
          <div class="filter-item">
            <select v-model="filterAsalData" class="filter-select" @change="handleFilterApply">
              <option value="semua">Integrasi: Semua Status</option>
              <option value="pemerintah">Pemerintah (SiRUP/SPSE)</option>
              <option value="manual_admin">Input Admin (Manual)</option>
              <option value="dummy">Data Simulasi (Dummy)</option>
            </select>
          </div>

          <!-- Tahun Anggaran -->
          <div class="filter-item">
            <select v-model="filterTA" class="filter-select" @change="handleFilterApply">
              <option value="semua">TA: Semua</option>
              <option value="2026">TA: 2026</option>
              <option value="2025">TA: 2025</option>
              <option value="2024">TA: 2024</option>
            </select>
          </div>

          <!-- Chip Filter: Ada Laporan Menunggu -->
          <button
            class="chip-filter"
            :class="{ 'is-active': filterHasWaitingReports }"
            @click="toggleWaitingReports"
          >
            <span class="chip-dot">●</span>
            <span>Ada Laporan Menunggu</span>
          </button>
        </div>

        <!-- Tombol Segarkan -->
        <button class="btn-refresh" :disabled="loading" @click="fetchProjects">
          <span>↻ Segarkan</span>
        </button>
      </div>

      <!-- Tabel Proyek 7 Kolom (Frame 04 FigCraft) -->
      <div class="table-container">
        <table class="projects-table">
          <thead>
            <tr>
              <th scope="col" class="th-code">KODE TENDER / RUP</th>
              <th scope="col" class="th-name">NAMA PAKET &amp; INSTANSI DINAS</th>
              <th scope="col" class="th-budget">PAGU &amp; TA</th>
              <th scope="col" class="th-score">SKOR &amp; RISIKO</th>
              <th scope="col" class="th-integration">INTEGRASI DATA (ETL)</th>
              <th scope="col" class="th-reports">LAPORAN</th>
              <th scope="col" class="th-action">AKSI</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading && !dataLoaded">
              <td colspan="7" class="td-skeleton">
                <SkeletonBlock height="24px" width="100%" radius="4px" />
                <SkeletonBlock height="24px" width="100%" radius="4px" />
                <SkeletonBlock height="24px" width="100%" radius="4px" />
              </td>
            </tr>

            <tr v-else-if="filteredProjects.length === 0">
              <td colspan="7" class="td-empty">
                <p class="empty-title">Tidak ada proyek yang sesuai</p>
                <p class="empty-desc">Coba sesuaikan filter pencarian atau segarkan kembali data.</p>
              </td>
            </tr>

            <tr v-for="p in filteredProjects" :key="p.id" class="project-row">
              <!-- Kolom 1: Kode -->
              <td class="td-code">
                <div class="code-wrap">
                  <span class="rup-code">{{ p.kode_rup || `RUP-${p.id}` }}</span>
                  <span class="spse-code">{{ p.kode_tender || (p.tenders?.[0]?.kode_tender) || 'SPSE-—' }}</span>
                </div>
              </td>

              <!-- Kolom 2: Nama & Dinas -->
              <td class="td-name">
                <div class="name-wrap">
                  <strong class="project-title-text" :title="p.nama || p.title">
                    {{ p.nama || p.title }}
                  </strong>
                  <span class="dinas-text">
                    {{ p.dinas || 'Dinas Teknis Prov. Lampung' }}
                    <span v-if="p.kabupaten"> · {{ p.kabupaten }}</span>
                  </span>
                </div>
              </td>

              <!-- Kolom 3: Pagu & TA -->
              <td class="td-budget">
                <div class="budget-wrap">
                  <span class="budget-val">{{ formatCurrency(p.pagu) }}</span>
                  <span class="budget-sub">
                    TA {{ p.tahun_anggaran || 2026 }}
                    <span v-if="p.hps"> · HPS {{ formatRupiahRingkas(p.hps) }}</span>
                  </span>
                </div>
              </td>

              <!-- Kolom 4: Skor & Risiko -->
              <td class="td-score">
                <div class="score-wrap">
                  <span class="score-number">{{ p.skor_total ?? p.score ?? 50 }}</span>
                  <span
                    class="risk-pill"
                    :class="{
                      'is-high': getRiskCat(p) === 'Tinggi',
                      'is-medium': getRiskCat(p) === 'Perlu Perhatian',
                      'is-low': getRiskCat(p) === 'Rendah',
                    }"
                  >
                    <span v-if="getRiskCat(p) === 'Tinggi'">Tinggi</span>
                    <span v-else-if="getRiskCat(p) === 'Perlu Perhatian'">Perlu Perhatian</span>
                    <span v-else>Rendah</span>
                  </span>
                </div>
              </td>

              <!-- Kolom 5: Integrasi Data / Asal Data -->
              <td class="td-integration">
                <div class="integration-wrap">
                  <!-- Label Asal Data (AC-25) -->
                  <span
                    v-if="p.asal_data === 'manual_admin'"
                    class="badge-provenance is-admin"
                    title="Data diinput secara manual oleh Admin Panel"
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    <span>Input Admin</span>
                  </span>
                  <span
                    v-else
                    class="badge-provenance is-gov"
                    title="Data bersumber resmi dari pipa ETL SiRUP/SPSE"
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon">
                      <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 3l9 7H3l9-7z" />
                    </svg>
                    <span>Pemerintah</span>
                  </span>

                  <!-- Status Integrasi SPSE -->
                  <span v-if="p.is_dummy" class="badge-etl is-dummy">Data Simulasi</span>
                  <span v-else-if="p.is_matched !== false" class="badge-etl is-matched">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" class="prov-icon">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    <span>SiRUP + SPSE</span>
                  </span>
                  <span v-else class="badge-etl is-unmatched">Belum Cocok</span>
                </div>
              </td>

              <!-- Kolom 6: Laporan Warga -->
              <td class="td-reports">
                <span
                  class="report-status-badge"
                  :class="{
                    'has-waiting': (p.laporan_menunggu || 0) > 0,
                    'is-zero': !(p.laporan_menunggu || 0) && !(p.laporan_selesai || 0),
                  }"
                >
                  <span v-if="(p.laporan_menunggu || 0) > 0">
                    {{ p.laporan_menunggu }} Menunggu
                  </span>
                  <span v-else-if="(p.laporan_selesai || 0) > 0">
                    {{ p.laporan_selesai }} Selesai
                  </span>
                  <span v-else class="text-muted">
                    0 Laporan
                  </span>
                </span>
              </td>

              <!-- Kolom 7: Aksi -->
              <td class="td-action">
                <div class="actions-group">
                  <RouterLink :to="`/proyek/${p.id}`" class="btn-action-detail">
                    Detail →
                  </RouterLink>

                  <!-- Menu Khusus Admin -->
                  <div v-if="auth.hasRole('admin')" class="dropdown-actions">
                    <button class="btn-more" aria-label="Menu aksi lainnya" @click.stop="toggleMenu(p.id)">
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                    <div v-if="openMenuId === p.id" class="menu-popover">
                      <button class="menu-item" @click="openEditModal(p)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>Ubah Proyek</span>
                      </button>
                      <button class="menu-item" @click="openTenderModal(p)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon">
                          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span>Kelola Tender</span>
                      </button>
                      <button class="menu-item" @click="openExecutionModal(p)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon">
                          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Data Eksekusi (RAB &amp; Fisik)</span>
                      </button>
                      <button class="menu-item" @click="openHistoryModal(p)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                        <span>Riwayat Nilai</span>
                      </button>
                      <div class="menu-divider" />
                      <button
                        v-if="p.asal_data === 'manual_admin'"
                        class="menu-item text-danger"
                        @click="openDeleteModal(p)"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon">
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Hapus Proyek</span>
                      </button>
                      <span v-else class="menu-item-disabled" title="Data pemerintah tidak dapat dihapus">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                        <span>Hapus Ditolak (Pemerintah)</span>
                      </span>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer / Paginasi (Frame 04) -->
      <footer class="projects-footer">
        <span class="footer-count-text">
          Menampilkan {{ paginationStart }}-{{ paginationEnd }} dari {{ total.toLocaleString('id-ID') }} proyek terdaftar
        </span>

        <div class="pagination-controls">
          <button class="pg-btn" :disabled="currentOffset <= 0 || loading" @click="prevPage">
            Sebelumnya
          </button>
          <span class="pg-info">Hal {{ currentPage }} / {{ totalPages }}</span>
          <button class="pg-btn" :disabled="currentOffset + currentLimit >= total || loading" @click="nextPage">
            Berikutnya
          </button>
        </div>
      </footer>
    </div>

    <!-- Modals -->
    <ProjectFormModal
      v-model="showFormModal"
      :project="selectedProject"
      @saved="onProjectSaved"
    />

    <ProjectDeleteModal
      v-model="showDeleteModal"
      :project="selectedProject"
      @deleted="onProjectDeleted"
    />

    <ProjectValueHistoryModal
      v-model="showHistoryModal"
      :project="selectedProject"
    />

    <TenderFormModal
      v-model="showTenderModal"
      :project="selectedProject"
      @tender-updated="fetchProjects"
    />

    <ProjectExecutionModal
      v-model="showExecutionModal"
      :project="selectedProject"
      @saved="onProjectSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { adminProjectsApi } from '@/services/api/admin-projects.api'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency, formatRupiahRingkas } from '@/utils/formatters'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'

import ProjectFormModal from '@/features/admin/components/ProjectFormModal.vue'
import ProjectDeleteModal from '@/features/admin/components/ProjectDeleteModal.vue'
import ProjectValueHistoryModal from '@/features/admin/components/ProjectValueHistoryModal.vue'
import TenderFormModal from '@/features/admin/components/TenderFormModal.vue'
import ProjectExecutionModal from '@/features/admin/components/ProjectExecutionModal.vue'

const auth = useAuthStore()

// State Data
const projects = ref([])
const total = ref(0)
const loading = ref(false)
const dataLoaded = ref(false)
const errorMsg = ref('')
const feedbackMsg = ref('')

const activeTab = ref('semua')
const searchQuery = ref('')
const filterWilayah = ref('semua')
const filterDinas = ref('semua')
const filterKategori = ref('semua')
const filterAsalData = ref('semua')
const filterTA = ref('semua')
const filterHasWaitingReports = ref(false)

const currentLimit = ref(10)
const currentOffset = ref(0)
const openMenuId = ref(null)

// Modals State
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const showHistoryModal = ref(false)
const showTenderModal = ref(false)
const showExecutionModal = ref(false)
const selectedProject = ref(null)

let searchDebounceTimer = null

// Opsi SKPD
const dinasOptions = [
  'Dinas Bina Marga & Bina Konstruksi Prov. Lampung',
  'Dinas Pengelolaan Sumber Daya Air Prov. Lampung',
  'Dinas Perumahan, Kawasan Permukiman & Cipta Karya Prov. Lampung',
  'Dinas PU Kota Bandar Lampung',
  'Dinas PU Kabupaten Lampung Selatan',
  'Dinas PU Kabupaten Lampung Tengah',
  'Dinas PU Kabupaten Lampung Timur',
  'Dinas Kesehatan Provinsi Lampung',
  'Dinas Pendidikan dan Kebudayaan Provinsi Lampung',
]

// Opsi Wilayah
const regionOptions = [
  { kode_bps: '1871', nama: 'Kota Bandar Lampung' },
  { kode_bps: '1872', nama: 'Kota Metro' },
  { kode_bps: '1801', nama: 'Kab. Lampung Barat' },
  { kode_bps: '1802', nama: 'Kab. Tanggamus' },
  { kode_bps: '1803', nama: 'Kab. Lampung Selatan' },
  { kode_bps: '1804', nama: 'Kab. Lampung Timur' },
  { kode_bps: '1805', nama: 'Kab. Lampung Tengah' },
  { kode_bps: '1806', nama: 'Kab. Lampung Utara' },
  { kode_bps: '1807', nama: 'Kab. Way Kanan' },
  { kode_bps: '1808', nama: 'Kab. Tulang Bawang' },
  { kode_bps: '1809', nama: 'Kab. Pesawaran' },
  { kode_bps: '1810', nama: 'Kab. Pringsewu' },
  { kode_bps: '1811', nama: 'Kab. Mesuji' },
  { kode_bps: '1812', nama: 'Kab. Tulang Bawang Barat' },
  { kode_bps: '1813', nama: 'Kab. Pesisir Barat' },
]

// Computed
const formattedToday = computed(() => {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / currentLimit.value)))
const currentPage = computed(() => Math.floor(currentOffset.value / currentLimit.value) + 1)
const paginationStart = computed(() => (total.value === 0 ? 0 : currentOffset.value + 1))
const paginationEnd = computed(() => Math.min(currentOffset.value + currentLimit.value, total.value))

const totalPagu = computed(() => {
  return projects.value.reduce((acc, cur) => acc + (Number(cur.pagu) || 0), 0)
})

function getRiskCat(p) {
  if (p.kategori) return p.kategori
  const skor = p.skor_total ?? p.score ?? 50
  if (skor >= 70) return 'Tinggi'
  if (skor >= 40) return 'Perlu Perhatian'
  return 'Rendah'
}

const kpiCounts = computed(() => {
  let tinggi = 0
  let perhatian = 0
  let rendah = 0
  let unmatched = 0

  for (const p of projects.value) {
    const cat = getRiskCat(p)
    if (cat === 'Tinggi') tinggi++
    else if (cat === 'Perlu Perhatian') perhatian++
    else rendah++

    if (p.is_matched === false) unmatched++
  }

  return { tinggi, perhatian, rendah, unmatched }
})

// Filtered projects locally when local tab / waiting report filter is toggled
const filteredProjects = computed(() => {
  return projects.value.filter((p) => {
    // Tab filter
    if (activeTab.value === 'tinggi' && getRiskCat(p) !== 'Tinggi') return false
    if (activeTab.value === 'perhatian' && getRiskCat(p) !== 'Perlu Perhatian') return false
    if (activeTab.value === 'rendah' && getRiskCat(p) !== 'Rendah') return false
    if (activeTab.value === 'belum_cocok' && p.is_matched !== false) return false

    // Waiting reports toggle
    if (filterHasWaitingReports.value && (p.laporan_menunggu || 0) <= 0) return false

    return true
  })
})

// Fetch Projects
async function fetchProjects() {
  loading.value = true
  errorMsg.value = ''
  openMenuId.value = null

  try {
    const res = await adminProjectsApi.list({
      search: searchQuery.value,
      dinas: filterDinas.value,
      kode_bps: filterWilayah.value,
      kategori: filterKategori.value,
      asal_data: filterAsalData.value,
      tahun_anggaran: filterTA.value,
      limit: currentLimit.value,
      offset: currentOffset.value,
    })

    projects.value = res.projects
    total.value = res.total
    dataLoaded.value = true
  } catch (err) {
    errorMsg.value = err.message || 'Gagal memuat daftar proyek'
  } finally {
    loading.value = false
  }
}

function handleSearchDebounce() {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    currentOffset.value = 0
    fetchProjects()
  }, 300)
}

function handleFilterApply() {
  currentOffset.value = 0
  fetchProjects()
}

function switchTab(tab) {
  activeTab.value = tab
}

function toggleWaitingReports() {
  filterHasWaitingReports.value = !filterHasWaitingReports.value
}

function prevPage() {
  if (currentOffset.value > 0) {
    currentOffset.value = Math.max(0, currentOffset.value - currentLimit.value)
    fetchProjects()
  }
}

function nextPage() {
  if (currentOffset.value + currentLimit.value < total.value) {
    currentOffset.value += currentLimit.value
    fetchProjects()
  }
}

function toggleMenu(id) {
  openMenuId.value = openMenuId.value === id ? null : id
}

// Modal Handlers
function openAddModal() {
  selectedProject.value = null
  showFormModal.value = true
}

function openEditModal(project) {
  selectedProject.value = project
  openMenuId.value = null
  showFormModal.value = true
}

function openDeleteModal(project) {
  selectedProject.value = project
  openMenuId.value = null
  showDeleteModal.value = true
}

function openHistoryModal(project) {
  selectedProject.value = project
  openMenuId.value = null
  showHistoryModal.value = true
}

function openTenderModal(project) {
  selectedProject.value = project
  openMenuId.value = null
  showTenderModal.value = true
}

function openExecutionModal(project) {
  selectedProject.value = project
  openMenuId.value = null
  showExecutionModal.value = true
}

function onProjectSaved(res) {
  feedbackMsg.value = `Data proyek berhasil disimpan. Skor risiko terhitung: ${res?.skor_sesudah ?? '—'}.`
  fetchProjects()
}

function onProjectDeleted() {
  feedbackMsg.value = 'Proyek manual berhasil dihapus permanen.'
  fetchProjects()
}

// Tutup popover menu saat klik di luar
function handleWindowClick() {
  openMenuId.value = null
}

onMounted(() => {
  window.addEventListener('click', handleWindowClick)
  fetchProjects()
})
</script>

<style scoped>
.admin-projects-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Head */
.projects-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.projects-title {
  margin: 0 0 4px;
  font-size: 24px;
  font-weight: 800;
  color: var(--c-ink, #111111);
  line-height: 1.25;
}

.projects-sub {
  margin: 0;
  font-size: 11px;
  color: var(--c-muted, #6B6760);
}

.projects-head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box {
  position: relative;
  width: 226px;
  height: 36px;
}

.search-box svg {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--c-muted, #6B6760);
}

.search-input {
  width: 100%;
  height: 100%;
  padding: 0 10px 0 32px;
  font-family: inherit;
  font-size: 11px;
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-md, 8px);
  color: var(--c-ink, #111111);
  outline: none;
}

.btn-add-project {
  height: 36px;
  padding: 0 14px;
  font-size: 11px;
  font-weight: 700;
  /* Aksesibilitas WCAG AA 6.65:1 (teks ink di latar oranye) */
  color: var(--c-ink, #111111);
  background: var(--c-primary, #FF6B2B);
  border: none;
  border-radius: var(--r-md, 8px);
  cursor: pointer;
}

.btn-add-project:hover {
  opacity: 0.92;
}

/* Tabs Bar */
.projects-tabs-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  background: var(--c-surface, #FFFFFF);
  padding: 0 16px;
  border-radius: var(--r-md, 8px);
  overflow-x: auto;
}

.tabs-list {
  display: flex;
  gap: 8px;
}

.tab-item {
  background: none;
  border: none;
  padding: 14px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-muted, #6B6760);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.tab-item:hover {
  color: var(--c-ink, #111111);
}

.tab-item.is-active {
  color: var(--c-ink, #111111);
  font-weight: 700;
  border-bottom-color: var(--c-primary, #FF6B2B);
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.kpi-card {
  padding: 14px 16px;
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
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

.text-danger { color: var(--c-danger, #D63A1F) !important; }
.text-warning { color: var(--c-warning, #D97706) !important; }
.text-success { color: var(--c-success, #2E8B57) !important; }

/* Alerts */
.alert-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-radius: var(--r-sm, 6px);
  font-size: 11px;
}

.alert-banner--success {
  background: var(--c-success-soft, #E3F2EA);
  border: 1px solid #C3E6CB;
  color: #155724;
}

.alert-banner--danger {
  background: var(--c-danger-soft, #FCE4DF);
  border: 1px solid #F5C6CB;
  color: var(--c-danger, #D63A1F);
}

.alert-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  color: inherit;
}

/* Main Table Card */
.projects-main-card {
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-lg, 12px);
  overflow: hidden;
}

/* Filter Bar */
.projects-filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--c-surface, #FFFFFF);
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  flex-wrap: wrap;
  gap: 10px;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-select {
  height: 32px;
  padding: 0 8px;
  font-family: inherit;
  font-size: 11px;
  color: var(--c-ink, #111111);
  background: var(--c-bg, #F4F2EE);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-sm, 6px);
}

.chip-filter {
  height: 32px;
  padding: 0 10px;
  font-size: 10.5px;
  font-weight: 600;
  background: var(--c-bg, #F4F2EE);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-sm, 6px);
  color: var(--c-muted, #6B6760);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.chip-filter .chip-dot {
  color: var(--c-warning, #D97706);
}

.chip-filter.is-active {
  background: var(--c-warning-soft, #FDF0D8);
  border-color: #FCD34D;
  color: #B45309;
}

.btn-refresh {
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

.btn-refresh:hover:not(:disabled) {
  background: var(--c-bg-alt, #F8F7F4);
}

/* Table */
.table-container {
  overflow-x: auto;
}

.projects-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 11px;
}

.projects-table th {
  background: var(--c-bg-alt, #F8F7F4);
  color: var(--c-ink, #111111);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 12px 14px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  white-space: nowrap;
}

.projects-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  vertical-align: middle;
}

.project-row:hover {
  background: #FCFBF9;
}

/* Col 1 */
.code-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rup-code {
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--c-ink, #111111);
}

.spse-code {
  font-family: monospace;
  font-size: 10px;
  color: var(--c-muted, #6B6760);
}

/* Col 2 */
.name-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 320px;
}

.project-title-text {
  font-size: 12.5px;
  color: var(--c-ink, #111111);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dinas-text {
  font-size: 10.5px;
  color: var(--c-muted, #6B6760);
}

/* Col 3 */
.budget-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
  white-space: nowrap;
}

.budget-val {
  font-weight: 700;
  color: var(--c-ink, #111111);
}

.budget-sub {
  font-size: 10px;
  color: var(--c-muted, #6B6760);
}

/* Col 4 */
.score-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.score-number {
  font-size: 16px;
  font-weight: 800;
  color: var(--c-ink, #111111);
}

.risk-pill {
  display: inline-block;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 700;
  border-radius: var(--r-pill, 999px);
}

.risk-pill.is-high {
  background: var(--c-danger-soft, #FCE4DF);
  color: var(--c-danger, #D63A1F);
}

.risk-pill.is-medium {
  background: var(--c-warning-soft, #FDF0D8);
  color: #B45309;
}

.risk-pill.is-low {
  background: var(--c-success-soft, #E3F2EA);
  color: #137333;
}

/* Col 5 */
.integration-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
  white-space: nowrap;
}

.badge-provenance {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  font-size: 9.5px;
  font-weight: 700;
  border-radius: 4px;
}

.prov-icon {
  flex: none;
}

.badge-provenance.is-gov {
  background: var(--c-success-soft, #E3F2EA);
  color: #155724;
}

.badge-provenance.is-admin {
  background: var(--c-warning-soft, #FDF0D8);
  color: #856404;
}

.badge-etl {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--c-muted, #6B6760);
}

/* Col 6 */
.report-status-badge {
  font-weight: 600;
}

.report-status-badge.has-waiting {
  color: var(--c-warning, #D97706);
}

/* Col 7 Actions */
.actions-group {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.btn-action-detail {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-ink, #111111);
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-md, 8px);
  text-decoration: none;
}

.btn-action-detail:hover {
  background: var(--c-bg-alt, #F8F7F4);
}

.dropdown-actions {
  position: relative;
}

.btn-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-md, 8px);
  cursor: pointer;
  color: var(--c-muted);
}
.btn-more:hover {
  background: var(--c-bg);
  color: var(--c-ink);
}

.menu-popover {
  position: absolute;
  right: 0;
  top: 32px;
  min-width: 200px;
  width: auto;
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border-strong, #DCD8D0);
  border-radius: var(--r-md, 8px);
  padding: 6px 0;
  z-index: 100;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 500;
  background: none;
  border: none;
  color: var(--c-ink, #111111);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease;
}

.menu-icon {
  flex: none;
  color: var(--c-muted);
  transition: color 0.15s ease;
}

.menu-item:hover {
  background: var(--c-bg-alt, #F8F7F4);
}
.menu-item:hover .menu-icon {
  color: var(--c-ink);
}

.menu-item.text-danger {
  color: var(--c-danger, #D63A1F);
}
.menu-item.text-danger .menu-icon {
  color: var(--c-danger);
}
.menu-item.text-danger:hover {
  background: var(--c-danger-soft);
}

.menu-item-disabled {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 11px;
  color: var(--c-muted, #6B6760);
  background: var(--c-bg, #F4F2EE);
  cursor: not-allowed;
  white-space: nowrap;
}

.menu-divider {
  height: 1px;
  background: var(--c-border, #E7E3DC);
  margin: 4px 0;
}

.td-skeleton {
  padding: 24px;
}

.td-empty {
  padding: 48px;
  text-align: center;
}

.empty-title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 700;
}

.empty-desc {
  margin: 0;
  font-size: 11px;
  color: var(--c-muted, #6B6760);
}

/* Footer / Pagination */
.projects-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--c-border, #E7E3DC);
  flex-wrap: wrap;
  gap: 12px;
}

.footer-count-text {
  font-size: 11px;
  color: var(--c-muted, #6B6760);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pg-btn {
  height: 30px;
  padding: 0 10px;
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

.pg-info {
  font-size: 11px;
  color: var(--c-muted, #6B6760);
}

@media (max-width: 1024px) {
  .kpi-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 640px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .projects-head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
