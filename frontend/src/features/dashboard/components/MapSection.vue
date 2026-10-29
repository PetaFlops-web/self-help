<template>
  <section class="section">
    <div class="map-head text-center mb-4">
      <h2 class="section-title">Lokasi proyek dan laporan warga</h2>
      <p class="section-sub">Peta menampilkan ruas proyek dan laporan di sekitarnya</p>
    </div>

    <div v-if="error" class="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2 small mb-3" role="alert">
      <span>{{ error }}</span>
      <button type="button" class="btn btn-outline-dark btn-sm py-1 px-3" @click="() => loadData(true)">Coba lagi</button>
    </div>

    <div class="card soft-card">
      <div class="card-body row g-4 align-items-stretch m-0">
        <div class="col-lg-8 p-0 pe-lg-3" :class="{ 'map-col--mobile': isMobile }">
          <AppMap
            ref="appMapRef"
            :markers="markers"
            :center="[project.lat, project.lng]"
            @marker-click="onMarkerClick"
            @marker-action="onMarkerAction"
          />
        </div>

        <aside class="col-lg-4 p-0">
          <h3 class="fs-6 fw-bold mb-3">Laporan terdekat</h3>
          <ul v-if="panelLoading" class="list-unstyled d-grid gap-2 mb-3 p-0" aria-busy="true">
            <li
              v-for="i in 3"
              :key="i"
              class="d-flex align-items-center gap-3 bg-white border rounded-3 px-3 py-2"
              style="height: 52px"
              aria-hidden="true"
            >
              <SkeletonBlock width="10px" height="10px" :circle="true" />
              <div class="flex-grow-1 min-w-0">
                <SkeletonBlock width="75px" height="14px" radius="4px" class="mb-1" />
                <SkeletonBlock width="110px" height="10px" radius="4px" />
              </div>
              <SkeletonBlock width="78px" height="26px" radius="999px" />
            </li>
          </ul>
          <div v-else-if="panelError" class="alert alert-warning small mb-3" role="alert">
            {{ panelError }}
          </div>
          <p v-else-if="!selected" class="small text-muted mb-3">
            Klik titik pada peta untuk melihat laporan warga.
          </p>
          <p v-else-if="!selected.items || !selected.items.length" class="small text-muted mb-3">
            Belum ada laporan warga untuk proyek ini.
          </p>
          <ul v-else class="list-unstyled d-grid gap-2 mb-3 p-0">
            <li
              v-for="it in selected.items"
              :key="it.code"
              class="report-item d-flex align-items-center gap-3 bg-white border rounded-3 px-3 py-2"
            >
              <span class="dot" :class="`d-${it.level}`" />
              <div class="flex-grow-1 min-w-0">
                <b class="d-block code">{{ it.code }}</b>
                <small class="dist">{{ it.category }} · {{ it.dateLabel }}</small>
              </div>
              <RiskBadge :level="it.level" :label="it.status" />
            </li>
          </ul>
          <button
            v-if="selected?.items?.length"
            type="button"
            class="btn btn-outline-dark w-100 py-2 mb-2"
            @click="modalOpen = true"
          >
            Lihat semua {{ selected.total }} laporan
          </button>
          <button type="button" class="btn btn-dark w-100 py-3" @click="expandMap">
            Buka peta besar
          </button>
        </aside>
      </div>
    </div>

    <ReportsModal
      v-model="modalOpen"
      :data="selected"
      :loading="panelLoading"
      :error="panelError"
    />
  </section>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import AppMap from '@/components/map/AppMap.vue'
import RiskBadge from '@/components/ui/RiskBadge.vue'
import ReportsModal from './ReportsModal.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import { useDevice } from '@/composables/useDevice'
import { LEVEL_COLOR, PROJECT_COLOR } from '@/config/map'
import { projectsApi } from '@/services/api/projects.api'
import { toProjectReportsPanel } from '@/services/api/mappers'
import { pinIcon } from '@/utils/mapIcons'
import { getRiskLabel, getRiskLevel } from '@/utils/riskScoring'
import { useDashboardData } from '../composables/useDashboardData'

const { project, nearbyReports, error, loadData } = useDashboardData()
const { isMobile } = useDevice()
const appMapRef = ref(null)

const selected = ref(null)
const modalOpen = ref(false)
const panelLoading = ref(false)
const panelError = ref('')
let requestSeq = 0

async function showReports(id) {
  if (!id) return
  const currentSeq = ++requestSeq
  panelLoading.value = true
  panelError.value = ''

  try {
    const p = await projectsApi.get(id)
    if (currentSeq !== requestSeq) return
    selected.value = toProjectReportsPanel(p?.raw ?? p)
  } catch (e) {
    if (currentSeq !== requestSeq) return
    panelError.value = e?.userMessage || e?.message || 'Gagal memuat laporan warga.'
    selected.value = null
  } finally {
    if (currentSeq === requestSeq) {
      panelLoading.value = false
    }
  }
}

watch(
  () => project.id,
  (id) => {
    if (id) showReports(id)
  },
  { immediate: true },
)

// Tingkat risiko proyek utama (untuk warna pin dan tooltip)
const projectLevel = computed(
  () => project.riskLevel || (project.riskScore != null ? getRiskLevel(project.riskScore) : 'attention'),
)

const markers = computed(() => [
  {
    id: project?.id,
    key: 'project',
    lat: project.lat,
    lng: project.lng,
    z: 1000,
    title: project.title,
    keywords: project.title,
    icon: pinIcon(LEVEL_COLOR[projectLevel.value] || PROJECT_COLOR, {
      main: true,
      label: `Proyek ini, ${project.riskLabel}`,
    }),
    tip: {
      title: project.title,
      subtitle: 'Proyek yang dipantau',
      level: projectLevel.value,
      label: project.riskLabel || getRiskLabel(projectLevel.value),
      score: project.riskScore,
      reportCount: selected.value && selected.value.id === project.id ? selected.value.total : null,
    },
  },
  ...nearbyReports.map((r) => {
    const level = r.level || 'attention'
    const title = r.title || `${r.code} - ${r.distance}`
    return {
      id: r.id, // ID proyek untuk memuat laporan warga saat pin diklik
      key: r.id || r.code,
      lat: r.lat,
      lng: r.lng,
      z: 0,
      title,
      keywords: r.title || `${r.code} ${r.status}`,
      icon: pinIcon(LEVEL_COLOR[level] || LEVEL_COLOR.attention),
      tip: {
        title,
        subtitle: r.location || r.status || '',
        level,
        label: getRiskLabel(level),
        score: r.riskScore ?? null,
      },
    }
  }),
])

function expandMap() {
  appMapRef.value?.expand()
}

// Klik marker (fallback, mis. tap mobile): buka popup ditangani Leaflet; jika id ada,
// perlakukan seperti aksi default "detail laporan" untuk pin proyek utama.
function onMarkerClick(marker) {
  if (!marker?.id) return
  if (marker.id === project.id) {
    showReports(marker.id)
    modalOpen.value = true
  }
}

// Aksi dari popup pin: 'project' (lihat/pindah proyek) atau 'reports' (detail laporan warga).
function onMarkerAction({ action, marker }) {
  if (!marker?.id) return
  if (action === 'reports') {
    showReports(marker.id)
    modalOpen.value = true
    return
  }
  // action === 'project'
  if (marker.id === project.id) {
    // Sudah di proyek ini; cukup sorot koordinatnya.
    appMapRef.value?.focusOn?.(project.lat, project.lng, 14)
    return
  }
  // Pin proyek lain: pindah analisis dashboard ke proyek tersebut.
  loadData(marker.id).then(async () => {
    await nextTick()
    appMapRef.value?.focusOn?.(project.lat, project.lng, 14)
  })
}
</script>


<style scoped>
.map-col--mobile :deep(.map-slot) { min-height: 340px; }
.report-item { cursor: pointer; }
.min-w-0 { min-width: 0; }
.code { font-size: 13px; }
.dist { font-size: 11px; color: var(--muted); }
.dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.d-low { background: var(--green); box-shadow: 0 0 0 4px #2a8a5a22; }
.d-attention { background: var(--amber); box-shadow: 0 0 0 4px #f0a31a2b; }
.d-high { background: var(--red); box-shadow: 0 0 0 4px #d6341e2b; }
.d-info { background: var(--blue); box-shadow: 0 0 0 4px #2b5bb82b; }
.d-progress { background: var(--orange); box-shadow: 0 0 0 4px #ff6a2b2b; }
</style>
