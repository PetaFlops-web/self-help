<template>
  <section class="card soft-card hero">
    <div class="card-body">
      <template v-if="skeleton">
        <SkeletonBlock width="120px" height="12px" radius="4px" />
        <SkeletonBlock width="65%" height="30px" radius="8px" class="mt-3" />
        <SkeletonBlock width="45%" height="14px" radius="4px" class="mt-2" />
        <div class="row g-3 facts mt-3">
          <div v-for="i in 4" :key="i" class="col-6 col-lg-3">
            <SkeletonBlock width="90px" height="11px" radius="4px" class="mb-2" />
            <SkeletonBlock width="130px" height="18px" radius="4px" />
          </div>
        </div>
      </template>

      <template v-else>
        <div class="d-flex flex-wrap align-items-start justify-content-between gap-3">
          <div class="hero-head">
            <p class="eyebrow mb-1">PROFIL PROYEK</p>
            <h1 class="hero-title">{{ project.name || 'Proyek tanpa nama' }}</h1>
            <p class="muted hero-meta mb-0">
              {{ project.agency || 'Dinas belum tercatat' }}<span class="sep">·</span>{{ project.location || 'Wilayah belum tercatat' }}
            </p>
          </div>

          <div class="d-flex flex-wrap align-items-center gap-2">
            <span class="pill">{{ statusLabel }}</span>
            <span v-if="raw.is_dummy" class="pill pill-warn">DATA SIMULASI</span>
            <RiskBadge :level="riskLevel" :label="categoryLabel" />
          </div>
        </div>

        <ul class="facts row g-3">
          <li v-for="f in facts" :key="f.label" class="col-6 col-lg-3">
            <small class="muted">{{ f.label }}</small>
            <b class="value">{{ f.value }}</b>
            <span v-if="f.note" class="note">{{ f.note }}</span>
          </li>
        </ul>

        <div v-if="money.nilaiKontrak !== null" class="paid">
          <div class="paid-head">
            <b>Pencairan terhadap nilai kontrak</b>
            <span class="muted small">{{ formatPercent(money.persenDibayar) }} dibayarkan</span>
          </div>
          <div class="progress" role="progressbar" :aria-valuenow="paidPercent" aria-valuemin="0" aria-valuemax="100" :aria-label="`Pencairan ${formatPercent(money.persenDibayar)} dari nilai kontrak`">
            <div class="progress-bar bar-paid" :style="{ width: `${paidPercent}%` }" />
          </div>
          <p class="muted small mb-0">
            Sudah dibayarkan {{ formatMoney(money.totalDibayar) }} dari nilai kontrak {{ formatMoney(money.nilaiKontrak) }}.
            Pembayaran bukan ukuran pekerjaan yang selesai.
          </p>
        </div>

        <div class="hero-foot">
          <span class="chip" :class="`chip-${asalData.tone}`">{{ asalData.label }}</span>
          <span class="chip">{{ matchLabel }}</span>
          <span v-if="fetchedLabel" class="muted small">Diambil pada {{ fetchedLabel }}</span>
          <a v-if="sourceUrl" class="link-orange ms-auto" :href="sourceUrl" target="_blank" rel="noopener noreferrer">
            Sumber data ↗
          </a>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import RiskBadge from '@/components/ui/RiskBadge.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import { formatMoney, formatPercent, formatShortDate } from '../services/project-detail.api'

const props = defineProps({
  project: { type: Object, required: true },
  raw: { type: Object, default: () => ({}) },
  money: { type: Object, required: true },
  statusLabel: { type: String, default: 'Status belum tersedia' },
  asalData: { type: Object, default: () => ({ label: 'Sumber belum dilabeli', tone: 'unknown' }) },
  matchLabel: { type: String, default: '' },
  riskLevel: { type: String, default: 'low' },
  categoryLabel: { type: String, default: 'Belum tersedia' },
  skeleton: { type: Boolean, default: false },
})

const facts = computed(() => [
  { label: 'Pagu anggaran', value: formatMoney(props.money.pagu), note: props.money.hps !== null ? `HPS ${formatMoney(props.money.hps)}` : '' },
  { label: 'Nilai kontrak', value: formatMoney(props.money.nilaiKontrak), note: props.raw.tahun_anggaran ? `TA ${props.raw.tahun_anggaran}` : '' },
  { label: 'Metode pemilihan', value: props.raw.metode_pemilihan || '—', note: props.raw.sumber_dana ? `Sumber dana ${props.raw.sumber_dana}` : '' },
  { label: 'Kode paket', value: props.raw.kode_rup || '—', note: props.raw.kode_tender ? `Tender ${props.raw.kode_tender}` : '' },
])

const paidPercent = computed(() => {
  const value = Number(props.money.persenDibayar)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
})

const fetchedLabel = computed(() => {
  if (!props.raw.fetched_at) return ''
  const label = formatShortDate(props.raw.fetched_at)
  return label === '—' ? '' : label
})

const sourceUrl = computed(() => props.raw.source_url || '')
</script>

<style scoped>
.hero {
  --bs-card-bg: #fff;
  --bs-card-border-radius: var(--radius-lg);
}
.hero-head {
  min-width: 0;
  flex: 1 1 320px;
}
.hero-title {
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.hero-meta {
  margin-top: 8px;
}
.hero-meta .sep {
  margin: 0 8px;
  color: var(--line);
}
.pill {
  background: var(--bg-soft);
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 700;
  padding: 7px 14px;
}
.pill-warn {
  background: var(--amber-soft);
  border-color: #f0d9a8;
  color: #8a5b00;
}
.facts {
  border-top: 1px solid var(--line);
  list-style: none;
  margin: 22px 0 0;
  padding: 20px 0 0;
}
.facts .muted {
  display: block;
  font-size: 11px;
  letter-spacing: 0.02em;
}
.facts .value {
  display: block;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.3;
  margin-top: 4px;
  overflow-wrap: anywhere;
}
.facts .note {
  display: block;
  color: var(--muted);
  font-size: 11px;
  margin-top: 2px;
}
.paid {
  border-top: 1px solid var(--line);
  margin-top: 22px;
  padding-top: 18px;
}
.paid-head {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: space-between;
  margin-bottom: 10px;
}
.paid-head b {
  font-size: 13px;
  font-weight: 700;
}
.paid .progress {
  height: 10px;
  margin-bottom: 10px;
}
.hero-foot {
  align-items: center;
  border-top: 1px solid var(--line);
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
}
.chip-official {
  background: var(--green-soft);
  border-color: #cfe9da;
  color: var(--green);
}
.chip-manual,
.chip-unknown {
  background: var(--blue-soft);
  border-color: #d3e0f8;
  color: var(--blue);
}
.chip-dummy {
  background: var(--amber-soft);
  border-color: #f0d9a8;
  color: #8a5b00;
}
</style>
