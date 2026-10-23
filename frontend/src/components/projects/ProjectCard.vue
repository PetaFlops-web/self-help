<template>
  <RouterLink class="card soft-card rounded-md project-card h-100 d-block" :to="`/proyek/${project.id}`">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center gap-2">
        <small class="kicker">PROYEK PUBLIK</small>
        <RiskBadge :level="project.riskLevel" />
      </div>
      <h3>{{ project.name }}</h3>
      <p class="muted">{{ project.location }}</p>

      <div class="metrics row g-2 border-top mt-3 pt-3">
        <div class="col-6"><small>Indikator risiko</small><b>{{ project.riskScore }}/100</b></div>
        <div class="col-6"><small>Anggaran</small><b>{{ formatCurrency(project.budget) }}</b></div>
      </div>

      <div v-if="project.progress !== undefined" class="progress mt-3" style="height: 6px"
           role="progressbar" :aria-valuenow="project.progress" aria-valuemin="0" aria-valuemax="100" :aria-label="`Progres ${project.progress}%`">
        <div class="progress-bar bar-paid" :style="{ width: `${project.progress}%` }" />
      </div>
      <p v-if="project.is_dummy" class="demo mt-3 mb-0">DATA SIMULASI</p>
    </div>
  </RouterLink>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import RiskBadge from '@/components/ui/RiskBadge.vue'
import { formatCurrency } from '@/utils/formatters'

defineProps({
  project: { type: Object, required: true },
})
</script>

<style scoped>
.project-card { transition: border-color .15s, transform .15s; }
@media (hover: hover) {
  .project-card:hover { border-color: var(--orange); transform: translateY(-2px); }
}
.project-card:active { border-color: var(--orange); }
@media (prefers-reduced-motion: reduce) {
  .project-card { transition: none; }
  .project-card:hover { transform: none; }
}
.project-card .kicker { font-size: 10px; letter-spacing: 1px; font-weight: 700; color: var(--muted); }
.project-card h3 { font-size: 16px; font-weight: 700; line-height: 1.4; margin: 16px 0 4px; }
.metrics small { display: block; font-size: 11px; color: var(--muted); margin-bottom: 4px; }
.metrics b { font-size: 13px; }
.demo { font-size: 10px; font-weight: 800; letter-spacing: 1px; color: var(--amber); }
</style>
