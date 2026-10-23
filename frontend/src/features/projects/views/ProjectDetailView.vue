<template>
  <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
    <p class="muted mb-0">ID proyek: {{ route.params.id }}</p>
    <RouterLink class="btn btn-outline-dark btn-sm" to="/proyek">← Kembali ke daftar</RouterLink>
  </div>

  <!-- Loading State (Skeleton) -->
  <div v-if="showSkeleton" class="d-grid gap-4" aria-busy="true">
    <section class="card soft-card rounded-md">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
          <SkeletonBlock width="120px" height="18px" radius="4px" />
          <SkeletonBlock width="80px" height="26px" radius="999px" />
        </div>
        <SkeletonBlock width="60%" height="28px" radius="6px" class="mb-2" />
        <SkeletonBlock width="40%" height="16px" radius="4px" class="mb-4" />
        <div class="row g-3">
          <div v-for="i in 6" :key="i" class="col-6 col-md-4">
            <SkeletonBlock width="80px" height="12px" radius="4px" class="mb-1" />
            <SkeletonBlock width="120px" height="18px" radius="4px" />
          </div>
        </div>
      </div>
    </section>

    <section class="card soft-card rounded-md">
      <div class="card-body">
        <SkeletonBlock width="160px" height="20px" radius="4px" class="mb-3" />
        <div v-for="i in 3" :key="i" class="py-2 border-bottom">
          <SkeletonBlock width="90px" height="14px" radius="4px" class="mb-1" />
          <SkeletonBlock width="80%" height="12px" radius="4px" />
        </div>
      </div>
    </section>
  </div>

  <!-- 404 Not Found -->
  <div v-else-if="isNotFound" class="alert alert-warning" role="alert">
    <h2 class="fs-6 fw-bold mb-2">Proyek tidak ditemukan</h2>
    <p class="mb-3">Data proyek dengan ID yang diminta tidak ditemukan di sistem.</p>
    <RouterLink class="btn btn-outline-dark btn-sm" to="/proyek">Kembali ke daftar proyek</RouterLink>
  </div>

  <!-- Network / API Error -->
  <div v-else-if="error" class="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2" role="alert">
    <span>{{ error }}</span>
    <button type="button" class="btn btn-outline-dark btn-sm" @click="loadProject">Coba lagi</button>
  </div>

  <!-- Content State -->
  <div v-else-if="project" class="d-grid gap-4">
    <!-- Profil & Metrik Proyek -->
    <section class="card soft-card rounded-md">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
          <small class="muted fw-bold">PROYEK PUBLIK</small>
          <div class="d-flex align-items-center gap-2">
            <span class="small fw-bold">Skor: {{ project.riskScore }}/100</span>
            <RiskBadge :level="project.riskLevel" />
          </div>
        </div>

        <h1 class="fs-4 fw-bold mb-1">{{ project.name }}</h1>
        <p class="muted mb-3">{{ project.location }} • {{ project.agency || '-' }}</p>

        <p v-if="project.is_dummy" class="small fw-bold text-warning mb-3">DATA SIMULASI</p>

        <div class="row g-3 border-top pt-3">
          <div class="col-6 col-md-4">
            <small class="muted d-block mb-1">Pagu Anggaran</small>
            <b>{{ formatCurrency(project.budget) }}</b>
          </div>
          <div class="col-6 col-md-4">
            <small class="muted d-block mb-1">HPS</small>
            <b>{{ formatCurrency(project.raw?.hps) }}</b>
          </div>
          <div class="col-6 col-md-4">
            <small class="muted d-block mb-1">Nilai Kontrak</small>
            <b>{{ formatCurrency(project.raw?.nilai_kontrak) }}</b>
          </div>
          <div class="col-6 col-md-4">
            <small class="muted d-block mb-1">Tahun Anggaran</small>
            <b>{{ project.raw?.tahun_anggaran || '-' }}</b>
          </div>
          <div class="col-6 col-md-4">
            <small class="muted d-block mb-1">Metode Pemilihan</small>
            <b>{{ project.raw?.metode_pemilihan || '-' }}</b>
          </div>
          <div class="col-6 col-md-4">
            <small class="muted d-block mb-1">Sumber Dana</small>
            <b>{{ project.raw?.sumber_dana || '-' }}</b>
          </div>
        </div>

        <div class="border-top pt-3 mt-3 d-flex flex-wrap justify-content-between align-items-center gap-2 small muted">
          <div>
            <span v-if="project.raw?.match_status" class="me-3">Status pencocokan: {{ project.raw.match_status }}</span>
            <span v-if="project.updatedAt || project.raw?.fetched_at">Diambil pada: {{ formatDate(project.updatedAt || project.raw?.fetched_at) }}</span>
          </div>
          <a
            v-if="project.raw?.source_url"
            :href="project.raw.source_url"
            target="_blank"
            rel="noopener noreferrer"
            class="link-orange"
          >
            Sumber data ↗
          </a>
        </div>

        <p class="muted small border-top pt-3 mt-3 mb-0">
          Indikator risiko bukan bukti pelanggaran.
        </p>
      </div>
    </section>

    <!-- Daftar Indikator Temuan -->
    <section class="card soft-card rounded-md">
      <div class="card-body">
        <h2 class="fs-5 fw-bold mb-3">Daftar Indikator Temuan</h2>
        <div v-if="indicators.length === 0" class="muted small">
          Belum ada indikator temuan yang terdeteksi untuk proyek ini.
        </div>
        <ul v-else class="list-group list-group-flush plain mb-0">
          <li
            v-for="item in indicators"
            :key="item.id || item.kode_aturan"
            class="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-3 px-0 py-3"
          >
            <div class="flex-grow-1 min-w-0">
              <b class="d-block">{{ item.kode_aturan }} — {{ item.dimensi }}</b>
              <p class="muted small mb-0">{{ item.uraian_aturan || '-' }}</p>
              <small v-if="item.nilai_terukur || item.ambang" class="text-secondary">
                Nilai: {{ item.nilai_terukur ?? '-' }} | Ambang: {{ item.ambang ?? '-' }}
              </small>
            </div>
            <RiskBadge :level="tingkatToLevel(item.tingkat)" :label="item.tingkat ? item.tingkat.toUpperCase() : ''" />
          </li>
        </ul>
      </div>
    </section>

    <!-- Enam dimensi indikator risiko (dipertahankan) -->
    <section class="card soft-card rounded-md">
      <div class="card-body">
        <h2 class="fs-5 fw-bold">Enam dimensi indikator risiko</h2>
        <p class="muted">Kerangka penilaian risiko AliranTerang untuk memantau integritas pengadaan infrastruktur.</p>
        <ul class="list-group list-group-flush plain mb-0">
          <li v-for="d in dimensions" :key="d.name" class="list-group-item d-flex justify-content-between gap-3 px-0 py-3 small">
            <b>{{ d.name }}</b><span>{{ d.weight }}% bobot</span>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { projectsApi } from '@/services/api/projects.api'
import { tingkatToLevel } from '@/services/api/mappers'
import RiskBadge from '@/components/ui/RiskBadge.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import { useMinLoading } from '@/composables/useMinLoading'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { RISK_DIMENSIONS as dimensions } from '@/config/riskDimensions'

const route = useRoute()

const loading = ref(true)
const showSkeleton = useMinLoading(loading)
const error = ref('')
const isNotFound = ref(false)
const project = ref(null)
const indicators = ref([])

async function loadProject() {
  const id = route.params.id
  if (!id) return

  loading.value = true
  error.value = ''
  isNotFound.value = false

  try {
    const [projectData, indicatorsData] = await Promise.all([
      projectsApi.get(id),
      projectsApi.indicators(id).catch(() => []),
    ])
    project.value = projectData
    indicators.value = Array.isArray(indicatorsData) ? indicatorsData : []
  } catch (err) {
    if (err?.response?.status === 404) {
      isNotFound.value = true
      error.value = 'Proyek tidak ditemukan'
    } else {
      error.value = err?.userMessage || err?.message || 'Gagal memuat detail proyek.'
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadProject)
watch(() => route.params.id, loadProject)
</script>

