<template>
  <section class="section row g-4 align-items-start">
    <div class="col-lg-5 col-xl-4">
      <article class="radar-card">
        <h2>Profil risiko</h2>
        <p class="sub">Enam dimensi, makin jauh dari pusat makin berisiko</p>

        <template v-if="showSkeleton">
          <SkeletonBlock width="100%" height="260px" radius="18px" class="my-2" />
          <div class="foot d-flex flex-wrap align-items-center gap-2">
            <SkeletonBlock width="14px" height="14px" radius="50%" />
            <SkeletonBlock width="160px" height="15px" radius="3px" />
          </div>
        </template>
        <template v-else>
          <svg class="radar" viewBox="0 0 400 360" role="img" aria-label="Diagram radar enam dimensi risiko">
            <polygon v-for="r in rings" :key="r" :points="ringPoints(r)" fill="none" stroke="#ffffff" stroke-opacity=".14" />
            <line v-for="(_, i) in dimensions" :key="`a${i}`" :x1="cx" :y1="cy" :x2="pt(i, R).x" :y2="pt(i, R).y" stroke="#fff" stroke-opacity=".1" />
            <polygon :points="dataPoints" fill="#ff6a2b" fill-opacity=".55" stroke="#ffb02e" stroke-width="2" stroke-linejoin="round" />
            <circle v-for="(d, i) in dimensions" :key="`p${i}`" :cx="pt(i, scale(d.value)).x" :cy="pt(i, scale(d.value)).y" r="5" fill="#111" :stroke="dotColor(d.value)" stroke-width="2.5" />
            <g v-for="l in labels" :key="l.label" :text-anchor="l.anchor" font-weight="700">
              <text :x="l.x" :y="l.y" fill="#fff" font-size="12">{{ l.label }}</text>
              <text :x="l.x" :y="l.y + 17" fill="#ffb02e" font-size="14" font-weight="800">{{ l.value }}</text>
            </g>
          </svg>
          <div class="foot d-flex flex-wrap align-items-center gap-2">
            <span class="dot" />
            <b class="flex-grow-1 d-inline-flex align-items-center gap-1">
              <span>Tinggi:</span>
              <span>{{ highCount }}</span>
              <span>dimensi di atas 66</span>
            </b>
          </div>
        </template>
      </article>
    </div>

    <div class="col-lg-7 col-xl-8">
      <h2 class="section-title">Indikator yang terdeteksi</h2>
      <p class="section-sub">Diurutkan dari tingkat risiko tertinggi</p>
      <ul class="list-group list-group-flush plain indicators mt-3">
        <template v-if="showSkeleton">
          <li v-for="i in 5" :key="i" class="list-group-item d-flex flex-wrap align-items-center gap-3 px-3 py-3 skeleton-row">
            <SkeletonBlock width="38px" height="38px" radius="50%" />
            <div class="txt">
              <SkeletonBlock width="60%" height="15px" radius="4px" />
              <SkeletonBlock width="90%" height="12px" radius="4px" class="mt-2" />
            </div>
            <SkeletonBlock width="70px" height="14px" radius="4px" />
            <SkeletonBlock width="78px" height="26px" radius="999px" />
          </li>
        </template>
        <template v-else>
          <li v-for="(it, i) in indicators" :key="it.key" class="list-group-item d-flex flex-wrap align-items-center gap-3 px-3 py-3" :class="{ first: i === 0 }">
            <span class="ico" :class="`ico-${it.level}`">{{ it.icon }}</span>
            <div class="txt"><b>{{ it.title }}</b><p>{{ it.description }}</p></div>
            <span class="meta text-nowrap">{{ it.meta }}</span>
            <RiskBadge :level="it.level" :label="it.label" />
          </li>
        </template>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import RiskBadge from '@/components/ui/RiskBadge.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import { useMinLoading } from '@/composables/useMinLoading'
import { useDashboardData } from '../composables/useDashboardData'

const { dimensions, indicators, loading } = useDashboardData()
const showSkeleton = useMinLoading(loading)

const cx = 200, cy = 180, R = 116
const rings = [0.25, 0.5, 0.75, 1]
const angle = (i) => ((-90 + i * 60) * Math.PI) / 180
const scale = (v) => (v / 100) * R
const pt = (i, r) => ({ x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) })
const ringPoints = (k) => dimensions.map((_, i) => `${pt(i, R * k).x},${pt(i, R * k).y}`).join(' ')
const dataPoints = computed(() => dimensions.map((d, i) => `${pt(i, scale(d.value)).x},${pt(i, scale(d.value)).y}`).join(' '))
const dotColor = (v) => (v >= 66 ? '#ff4a2e' : v >= 35 ? '#ffb02e' : '#3bb27a')
const highCount = computed(() => dimensions.filter(d => d.value >= 66).length)

const labels = computed(() =>
  dimensions.map((d, i) => {
    const p = pt(i, R + 26)
    const c = Math.cos(angle(i)), s = Math.sin(angle(i))
    return {
      label: d.label, value: d.value,
      x: p.x, y: p.y + (s < -0.5 ? -20 : s > 0.5 ? 2 : -6),
      anchor: c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle',
    }
  }),
)
</script>

<style scoped>
.radar-card { background: #111; color: #fff; border-radius: var(--radius-lg); padding: 26px 24px 22px; }
.radar-card :deep(.skeleton-shimmer) { background-color: #262626; }
.radar-card :deep(.skeleton-shimmer::after) {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0) 100%);
}
.radar-card h2 { font-size: 20px; font-weight: 700; }
.sub { font-size: 12px; color: #a8a8a8; margin-top: 6px; }
.radar { display: block; width: 100%; height: auto; margin: 14px 0 6px; overflow: visible; }
.foot { background: #232323; border-radius: var(--radius-sm); padding: 14px 16px; font-size: 12px; }
.foot b { font-weight: 700; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: #ff4a2e; flex: none; }

.indicators .list-group-item.first { background: var(--bg-soft); border-radius: var(--radius-sm); border-bottom-color: transparent; }
.skeleton-row { align-items: center; }
.skeleton-row .txt { flex: 1 1 260px; min-width: 0; }
.ico { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; font-size: 13px; font-weight: 800; flex: none; }
.ico-high { background: var(--red-soft); color: var(--red); }
.ico-attention { background: var(--amber-soft); color: var(--amber); }
.ico-low { background: var(--green-soft); color: var(--green); }
.txt { flex: 1 1 260px; min-width: 0; }
.txt b { font-size: 15px; font-weight: 700; }
.txt p { font-size: 12px; color: var(--muted); line-height: 1.5; margin-top: 2px; }
.meta { color: var(--ink-soft); font-size: 12px; }
.indicators .risk { min-width: 84px; }
</style>
