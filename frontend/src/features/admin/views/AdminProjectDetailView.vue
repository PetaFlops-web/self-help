<template>
  <div class="admin-project-detail">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div class="crumb">
        <RouterLink class="link-orange" to="/admin">Dashboard Admin</RouterLink>
        <span class="sep" aria-hidden="true">›</span>
        <RouterLink class="link-orange" to="/admin/proyek">Daftar Proyek</RouterLink>
        <span class="sep" aria-hidden="true">›</span>
        <span class="muted">Profil Proyek</span>
      </div>
      <div class="d-flex align-items-center gap-2">
        <RouterLink class="btn btn-outline-secondary btn-sm" to="/admin/proyek">
          ← Kembali ke Daftar Proyek
        </RouterLink>
        <RouterLink class="btn btn-primary btn-sm" to="/admin">
          Dashboard Admin
        </RouterLink>
      </div>
    </div>

    <!-- Loading State (Skeleton) -->
    <div v-if="showSkeleton" class="d-grid gap-4" aria-busy="true">
      <ProjectHeroCard :project="{}" :raw="{}" :money="{}" skeleton />
      <div class="row g-4">
        <div class="col-xl-8 d-grid gap-4">
          <DimensionRadarCard :dimensions="[]" skeleton />
          <IndicatorsCard skeleton />
        </div>
        <div class="col-xl-4">
          <div class="rail"><ScoreSummaryCard skeleton /></div>
        </div>
      </div>
      <AiExplanationCard skeleton />
      <div class="row g-4">
        <div class="col-xl-8 d-grid gap-4">
          <PaymentProgressCard skeleton />
          <ProjectTimelineCard skeleton />
          <RabItemsCard skeleton />
        </div>
        <div class="col-xl-4">
          <div class="rail"><DocumentsChecklistCard skeleton /></div>
        </div>
      </div>
      <RelatedReportsCard skeleton />
    </div>

    <!-- 404 Not Found -->
    <div v-else-if="isNotFound" class="alert alert-warning" role="alert">
      <h2 class="fs-6 fw-bold mb-2">Proyek tidak ditemukan</h2>
      <p class="mb-3">Data proyek dengan ID yang diminta tidak ditemukan di sistem.</p>
      <div class="d-flex gap-2">
        <RouterLink class="btn btn-outline-dark btn-sm" to="/admin/proyek">Kembali ke Daftar Proyek</RouterLink>
        <RouterLink class="btn btn-primary btn-sm" to="/admin">Kembali ke Dashboard</RouterLink>
      </div>
    </div>

    <!-- Network / API Error -->
    <div v-else-if="error" class="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2" role="alert">
      <span>{{ error }}</span>
      <button type="button" class="btn btn-outline-dark btn-sm" @click="loadProject">Coba lagi</button>
    </div>

    <!-- Content State -->
    <div v-else-if="detail" class="d-grid gap-4">
      <ProjectHeroCard
        :project="detail.project"
        :raw="detail.raw"
        :money="detail.money"
        :status-label="detail.statusLabel"
        :asal-data="detail.asalData"
        :match-label="detail.matchLabel"
        :risk-level="detail.riskLevel"
        :category-label="detail.categoryLabel"
      />

      <div class="row g-4">
        <div class="col-xl-8 d-grid gap-4">
          <DimensionRadarCard :dimensions="detail.dimensions" />
          <IndicatorsCard :indicators="detail.indicators" />
        </div>
        <div class="col-xl-4">
          <div class="rail">
            <ScoreSummaryCard
              :risk-score="detail.riskScore"
              :risk-level="detail.riskLevel"
              :category-label="detail.categoryLabel"
              :counts="counts"
              :money="detail.money"
            />
          </div>
        </div>
      </div>

      <AiExplanationCard
        :explanation="explanation"
        :loading="explaining"
        @retry="loadExplanation"
      />

      <div class="row g-4">
        <div class="col-xl-8 d-grid gap-4">
          <PaymentProgressCard
            :money="detail.money"
            :payments="detail.payments"
            :progress="detail.progress"
          />
          <ProjectTimelineCard :timeline="detail.timeline" />
          <RabItemsCard :rab="detail.rab" />
        </div>
        <div class="col-xl-4">
          <div class="rail">
            <DocumentsChecklistCard :documents="detail.documents" :checklist="detail.checklist" />
          </div>
        </div>
      </div>

      <RelatedReportsCard :reports="detail.reports" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AiExplanationCard from '@/features/projects/components/AiExplanationCard.vue'
import DimensionRadarCard from '@/features/projects/components/DimensionRadarCard.vue'
import DocumentsChecklistCard from '@/features/projects/components/DocumentsChecklistCard.vue'
import IndicatorsCard from '@/features/projects/components/IndicatorsCard.vue'
import PaymentProgressCard from '@/features/projects/components/PaymentProgressCard.vue'
import ProjectHeroCard from '@/features/projects/components/ProjectHeroCard.vue'
import ProjectTimelineCard from '@/features/projects/components/ProjectTimelineCard.vue'
import RabItemsCard from '@/features/projects/components/RabItemsCard.vue'
import RelatedReportsCard from '@/features/projects/components/RelatedReportsCard.vue'
import ScoreSummaryCard from '@/features/projects/components/ScoreSummaryCard.vue'
import { useMinLoading } from '@/composables/useMinLoading'
import { loadProjectDetail, loadProjectExplanation } from '@/features/projects/services/project-detail.api'

const route = useRoute()

const loading = ref(true)
const error = ref('')
const showSkeleton = useMinLoading(loading, { error })
const isNotFound = ref(false)
const detail = ref(null)

const explaining = ref(false)
const explanation = ref(null)

const counts = computed(() => ({
  indicators: detail.value?.indicators.length ?? 0,
  insufficient: detail.value?.dimensions.filter((d) => !d.level).length ?? 0,
  reportsTotal: detail.value?.reports.total ?? 0,
  reportsMenunggu: detail.value?.reports.summary?.menunggu ?? 0,
  docsBelumPublik: detail.value?.documents.belumPublik ?? 0,
  checklistTerpenuhi: detail.value?.checklist.terpenuhi ?? 0,
  checklistTotal: detail.value?.checklist.total ?? 0,
}))

async function loadExplanation(id) {
  explaining.value = true
  try {
    explanation.value = await loadProjectExplanation(id)
  } finally {
    explaining.value = false
  }
}

async function loadProject() {
  const id = route.params.id
  if (!id) return

  loading.value = true
  error.value = ''
  isNotFound.value = false
  explanation.value = null

  try {
    detail.value = await loadProjectDetail(id)
  } catch (err) {
    detail.value = null
    if (err?.response?.status === 404) {
      isNotFound.value = true
      error.value = 'Proyek tidak ditemukan'
    } else {
      error.value = err?.userMessage || err?.message || 'Gagal memuat detail proyek.'
    }
  } finally {
    loading.value = false
  }

  // Penjelasan bahasa awam dimuat terpisah agar tidak menahan render halaman (NFR-03, NFR-05).
  if (!isNotFound.value && !error.value) {
    loadExplanation(id)
  }
}

onMounted(loadProject)
watch(() => route.params.id, loadProject)
</script>

<style scoped>
.admin-project-detail {
  padding-bottom: 24px;
}
.crumb {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  font-size: 13px;
  gap: 8px;
}
.crumb .sep {
  color: var(--line, #dee2e6);
  font-weight: 700;
}
.rail {
  display: grid;
  gap: 24px;
}
@media (min-width: 1200px) {
  .rail {
    position: sticky;
    top: 20px;
  }
}
</style>
