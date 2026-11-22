<template>
  <section class="score-card">
    <template v-if="skeleton">
      <SkeletonBlock width="90px" height="12px" radius="4px" tone="light" />
      <SkeletonBlock width="150px" height="52px" radius="12px" class="mt-3" tone="light" />
      <SkeletonBlock width="100%" height="10px" radius="999px" class="mt-4" tone="light" />
      <div v-for="i in 4" :key="i" class="d-flex justify-content-between mt-3">
        <SkeletonBlock width="120px" height="12px" radius="4px" tone="light" />
        <SkeletonBlock width="42px" height="12px" radius="4px" tone="light" />
      </div>
    </template>

    <template v-else>
      <p class="label">Skor risiko</p>

      <div class="score-row">
        <b class="score">{{ scoreLabel }}</b>
        <span class="score-max">/100</span>
        <RiskBadge :level="riskLevel" :label="categoryLabel" class="ms-auto" />
      </div>

      <div class="meter" role="img" :aria-label="`Skor risiko ${scoreLabel} dari 100, kategori ${categoryLabel}`">
        <span class="meter-fill" :class="`fill-${riskLevel}`" :style="{ width: `${scorePercent}%` }" />
      </div>

      <dl class="rows">
        <div v-for="row in rows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </div>
      </dl>

      <p class="note">
        Skor dihitung mesin aturan dari data proyek, bukan oleh AI. Angka ini indikator risiko untuk diperiksa,
        bukan bukti pelanggaran.
      </p>
    </template>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import RiskBadge from '@/components/ui/RiskBadge.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'

const props = defineProps({
  riskScore: { type: [Number, String], default: null },
  riskLevel: { type: String, default: 'low' },
  categoryLabel: { type: String, default: 'Belum tersedia' },
  counts: { type: Object, default: () => ({}) },
  money: { type: Object, default: () => ({}) },
  skeleton: { type: Boolean, default: false },
})

const scoreLabel = computed(() => {
  const value = Number(props.riskScore)
  return Number.isFinite(value) ? String(Math.round(value)) : '—'
})

const scorePercent = computed(() => {
  const value = Number(props.riskScore)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
})

const rows = computed(() => [
  { label: 'Indikator temuan', value: props.counts.indicators ?? 0 },
  { label: 'Dimensi data belum cukup', value: props.counts.insufficient ?? 0 },
  { label: 'Laporan warga terkait', value: props.counts.reportsTotal ?? 0 },
  { label: 'Menunggu verifikasi', value: props.counts.reportsMenunggu ?? 0 },
  { label: 'Dokumen belum publik', value: props.counts.docsBelumPublik ?? 0 },
  { label: 'Prosedur terpenuhi', value: `${props.counts.checklistTerpenuhi ?? 0}/${props.counts.checklistTotal ?? 0}` },
])
</script>

<style scoped>
.score-card {
  background: #111;
  border-radius: var(--radius-lg);
  color: #fff;
  padding: 26px 24px 22px;
}
.score-card :deep(.skeleton-shimmer) {
  background-color: #262626;
}
.score-card :deep(.skeleton-shimmer::after) {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0) 100%);
}
.label {
  color: #a8a8a8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.score-row {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}
.score {
  font-size: 46px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
}
.score-max {
  color: #8f8f8f;
  font-size: 15px;
  font-weight: 700;
}
.meter {
  background: #2a2a2a;
  border-radius: 999px;
  height: 10px;
  margin: 16px 0 20px;
  overflow: hidden;
}
.meter-fill {
  display: block;
  height: 100%;
}
.fill-high {
  background: linear-gradient(90deg, #ff8a3d, var(--red));
}
.fill-attention {
  background: linear-gradient(90deg, #ffc65c, var(--amber));
}
.fill-low {
  background: linear-gradient(90deg, #6fd3a2, var(--green));
}
.rows {
  display: grid;
  gap: 10px;
  margin: 0;
}
.rows div {
  align-items: baseline;
  border-top: 1px solid #232323;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding-top: 10px;
}
.rows dt {
  color: #bdbdbd;
  font-size: 12px;
  font-weight: 500;
}
.rows dd {
  font-size: 13px;
  font-weight: 800;
  margin: 0;
}
.note {
  border-top: 1px solid #232323;
  color: #9d9d9d;
  font-size: 11px;
  line-height: 1.6;
  margin: 18px 0 0;
  padding-top: 14px;
}
</style>
