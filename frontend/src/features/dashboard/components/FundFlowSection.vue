<template>
  <section class="section row g-4">
    <div class="col-lg-6">
      <article class="card soft-card h-100">
        <div class="card-body">
          <h2>Aliran dana proyek</h2>
          <p class="sub">Uang proyek dari anggaran sampai dibayarkan</p>

          <div class="steps d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 mt-4">
            <template v-for="(s, i) in fund.steps" :key="s.label">
              <div class="step" :class="{ accent: s.accent }">
                <small>{{ s.label }}</small>
                <SkeletonBlock v-if="showSkeleton" width="85%" height="18px" radius="4px" class="mx-auto" />
                <b v-else>{{ s.value }}</b>
              </div>
              <span v-if="i < fund.steps.length - 1" class="arrow text-center" aria-hidden="true">→</span>
            </template>
          </div>

          <h3>Bagian anggaran yang sudah dibayarkan</h3>
          <div class="progress" style="height: 16px" role="progressbar" :aria-valuenow="showSkeleton ? 0 : fund.paidPercent" aria-valuemin="0" aria-valuemax="100" aria-label="Persentase anggaran sudah dibayarkan">
            <SkeletonBlock v-if="showSkeleton" width="100%" height="100%" radius="999px" />
            <div v-else class="progress-bar bar-red" :style="{ width: `${fund.paidPercent}%` }" />
          </div>
          <div class="d-flex justify-content-between gap-3 mt-3 fw-semibold bar-label">
            <SkeletonBlock v-if="showSkeleton" width="160px" height="14px" radius="4px" />
            <span v-else>{{ fund.paidLabel }}</span>

            <SkeletonBlock v-if="showSkeleton" width="140px" height="14px" radius="4px" />
            <span v-else>{{ fund.unpaidLabel }}</span>
          </div>
          <p class="note">{{ fund.note }}</p>
        </div>
      </article>
    </div>

    <div class="col-lg-6">
      <article class="card soft-card h-100">
        <div class="card-body">
          <h2>Uang dibayarkan dan pekerjaan selesai</h2>
          <p class="sub">Perbandingan tiap tahap pembayaran</p>

          <div v-for="s in stages" :key="s.label" class="stage">
            <div class="d-flex justify-content-between mb-2">
              <b class="small">{{ s.label }}</b>
              <SkeletonBlock v-if="showSkeleton" width="70px" height="14px" radius="4px" />
              <span v-else class="pct" :class="{ gap: s.paid - s.done >= 30 }">{{ s.paid }}% vs {{ s.done }}%</span>
            </div>
            <div class="progress" style="height: 9px" role="progressbar" :aria-valuenow="showSkeleton ? 0 : s.paid" aria-valuemin="0" aria-valuemax="100" :aria-label="`${s.label}: uang dibayarkan ${s.paid}%`">
              <SkeletonBlock v-if="showSkeleton" width="100%" height="100%" radius="999px" />
              <div v-else class="progress-bar bar-paid" :style="{ width: `${s.paid}%` }" />
            </div>
            <div class="progress mt-1" style="height: 9px" role="progressbar" :aria-valuenow="showSkeleton ? 0 : s.done" aria-valuemin="0" aria-valuemax="100" :aria-label="`${s.label}: pekerjaan selesai ${s.done}%`">
              <SkeletonBlock v-if="showSkeleton" width="100%" height="100%" radius="999px" />
              <div v-else class="progress-bar bar-done" :style="{ width: `${s.done}%` }" />
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2 gap-lg-4 mt-4 legend">
            <span><i class="lg lg-paid" />Uang dibayarkan</span>
            <span><i class="lg lg-done" />Pekerjaan selesai*</span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import { useMinLoading } from '@/composables/useMinLoading'
import { useDashboardData } from '../composables/useDashboardData'

const { fund, stages, loading } = useDashboardData()
const showSkeleton = useMinLoading(loading)
</script>

<style scoped>
h2 { font-size: 19px; font-weight: 700; }
h3 { font-size: 13px; font-weight: 700; margin: 24px 0 10px; }
.sub { font-size: 12px; color: var(--muted); margin-top: 4px; }

.step { flex: 1; min-width: 0; background: #fff; border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 14px 10px; text-align: center; }
.step small { display: block; font-size: 11px; color: var(--muted); margin-bottom: 6px; }
.step b { display: block; font-size: 15px; font-weight: 700; line-height: 1.3; white-space: nowrap; }
.step.accent { flex: 1.5; }
.step.accent b { color: var(--red); }
.arrow { color: #9a9a9a; font-size: 18px; flex: none; }
@media (max-width: 767.98px) { .arrow { transform: rotate(90deg); } }

.bar-label { font-size: 11px; }
.note { font-size: 11px; color: var(--muted); margin-top: 22px; }

.stage { margin-top: 18px; }
.pct { font-size: 13px; font-weight: 700; color: var(--amber); }
.pct.gap { color: var(--red); }
.legend { font-size: 11px; font-weight: 600; }
.legend span { display: inline-flex; align-items: center; gap: 7px; }
.lg-paid { background: var(--orange); }
.lg-done { background: var(--green); }
.lg { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
</style>
