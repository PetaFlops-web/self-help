<template>
  <section class="card soft-card">
    <div class="card-body">
      <h2 class="section-title-sm">Pembayaran termin &amp; progres fisik</h2>
      <p class="section-sub">Pencairan dibandingkan kemajuan pekerjaan yang sudah dicatat. Pembayaran bukan ukuran pekerjaan selesai.</p>

      <template v-if="skeleton">
        <div class="steps mt-3">
          <SkeletonBlock v-for="i in 3" :key="i" width="100%" height="72px" radius="16px" />
        </div>
        <SkeletonBlock width="100%" height="180px" radius="16px" class="mt-3" />
      </template>

      <template v-else>
        <div class="steps">
          <div v-for="(step, i) in steps" :key="step.label" class="step-wrap">
            <div class="step" :class="{ accent: step.accent }">
              <small>{{ step.label }}</small>
              <b>{{ step.value }}</b>
            </div>
            <span v-if="i < steps.length - 1" class="arrow" aria-hidden="true">→</span>
          </div>
        </div>

        <div v-if="payments.length" class="table-wrap mt-3">
          <table class="tbl">
            <caption class="visually-hidden">Rincian pembayaran per termin dan progres fisik terdekat</caption>
            <thead>
              <tr>
                <th scope="col">Termin</th>
                <th scope="col">Tanggal</th>
                <th scope="col">Jumlah dibayar</th>
                <th scope="col">% kontrak</th>
                <th scope="col">Progres fisik saat itu</th>
                <th scope="col" class="text-center">Selisih</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in payments" :key="p.id">
                <td class="strong">Termin {{ p.termin ?? '—' }}</td>
                <td>{{ p.dateLabel }}</td>
                <td class="strong">{{ p.jumlahLabel }}</td>
                <td>{{ p.persenLabel }}</td>
                <td>{{ p.persenFisikLabel }}</td>
                <td class="text-center">
                  <span class="gap" :class="`gap-${gapLevel(p)}`">{{ gapLabel(p) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-else class="muted empty">Belum ada data pembayaran termin untuk proyek ini.</p>

        <div v-if="progress.length" class="progress-list">
          <h3 class="sub-title">Catatan progres fisik</h3>
          <ul>
            <li v-for="pr in progress.slice(0, 5)" :key="pr.id">
              <b>{{ formatPercent(pr.persenFisik) }}</b>
              <span class="muted small">{{ pr.dateLabel }} · {{ pr.sumber }}</span>
            </li>
          </ul>
          <p v-if="progress.length > 5" class="muted small mb-0">+{{ progress.length - 5 }} catatan progres lainnya tersimpan di basis data.</p>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import { formatMoney, formatPercent } from '../services/project-detail.api'

const props = defineProps({
  money: { type: Object, default: () => ({}) },
  payments: { type: Array, default: () => [] },
  progress: { type: Array, default: () => [] },
  skeleton: { type: Boolean, default: false },
})

const steps = computed(() => [
  { label: 'Pagu anggaran daerah', value: formatMoney(props.money.pagu) },
  { label: 'Nilai kontrak', value: formatMoney(props.money.nilaiKontrak) },
  { label: 'Sudah dibayarkan', value: `${formatMoney(props.money.totalDibayar)} (${formatPercent(props.money.persenDibayar)})`, accent: true },
])

const gapLevel = (p) => {
  if (p.persenFisik === null || p.persenKontrak === null) return 'empty'
  const gap = Number(p.persenKontrak) - Number(p.persenFisik)
  if (gap > 30) return 'high'
  if (gap > 15) return 'attention'
  return 'low'
}

const gapLabel = (p) => {
  if (p.persenFisik === null || p.persenKontrak === null) return '—'
  const gap = Number(p.persenKontrak) - Number(p.persenFisik)
  const tanda = gap > 0 ? '+' : ''
  return `${tanda}${gap.toLocaleString('id-ID', { maximumFractionDigits: 1 })} poin`
}
</script>

<style scoped>
.section-title-sm {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.steps {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;
  margin-top: 18px;
}
@media (min-width: 768px) {
  .steps {
    grid-template-columns: repeat(3, 1fr);
  }
}
.step-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}
.step {
  background: var(--bg-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  flex: 1 1 auto;
  min-width: 0;
  padding: 14px 16px;
}
.step small {
  color: var(--muted);
  display: block;
  font-size: 11px;
  font-weight: 600;
}
.step b {
  display: block;
  font-size: 15px;
  font-weight: 800;
  margin-top: 4px;
  overflow-wrap: anywhere;
}
.step.accent {
  background: #111;
  border-color: #111;
  color: #fff;
}
.step.accent small {
  color: #b9b9b9;
}
.arrow {
  color: var(--line);
  flex: none;
  font-size: 18px;
  font-weight: 800;
}
@media (max-width: 767.98px) {
  .arrow {
    display: none;
  }
}
.table-wrap {
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  overflow-x: auto;
}
.tbl {
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12px;
  margin: 0;
  min-width: 620px;
  width: 100%;
}
.tbl thead th {
  background: #111;
  color: #fff;
  font-size: 10.5px;
  font-weight: 700;
  padding: 11px 12px;
  text-align: left;
  white-space: nowrap;
}
.tbl tbody td {
  border-bottom: 1px solid var(--line);
  padding: 12px;
  vertical-align: top;
}
.tbl tbody tr:last-child td {
  border-bottom: 0;
}
.strong {
  font-weight: 700;
}
.gap {
  border-radius: 999px;
  display: inline-block;
  font-size: 10.5px;
  font-weight: 700;
  padding: 5px 10px;
  white-space: nowrap;
}
.gap-high {
  background: var(--red-soft);
  color: var(--red);
}
.gap-attention {
  background: var(--amber-soft);
  color: #a9711a;
}
.gap-low {
  background: var(--green-soft);
  color: var(--green);
}
.gap-empty {
  background: var(--bg-soft);
  color: var(--muted);
}
.empty {
  margin: 18px 0 0;
}
.progress-list {
  border-top: 1px solid var(--line);
  margin-top: 20px;
  padding-top: 16px;
}
.sub-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 10px;
}
.progress-list ul {
  display: grid;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.progress-list li {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.progress-list b {
  font-size: 13px;
  font-weight: 800;
}
</style>
