<template>
  <section class="card soft-card radar-card">
    <div class="card-body">
      <div class="d-flex flex-wrap align-items-start justify-content-between gap-2">
        <div>
          <h2 class="section-title-sm">Profil risiko enam dimensi</h2>
          <p class="section-sub mb-0">Makin jauh dari titik pusat, makin tinggi tingkat temuan pada dimensi itu.</p>
        </div>
        <span class="chip chip-count">{{ detectedCount }} dari 6 dimensi ada temuan</span>
      </div>

      <template v-if="skeleton">
        <SkeletonBlock width="100%" height="300px" radius="18px" class="mt-3" />
        <div class="d-flex flex-wrap gap-2 mt-3">
          <SkeletonBlock v-for="i in 6" :key="i" width="140px" height="26px" radius="999px" />
        </div>
      </template>

      <template v-else>
        <div class="radar-wrap">
          <svg class="radar" viewBox="0 0 400 340" role="img" aria-label="Diagram radar enam dimensi indikator risiko">
            <polygon v-for="r in rings" :key="`r${r}`" :points="ringPoints(r)" fill="none" stroke="var(--line)" />
            <line
              v-for="(d, i) in dimensions"
              :key="`a${d.key}`"
              :x1="cx"
              :y1="cy"
              :x2="pt(i, R).x"
              :y2="pt(i, R).y"
              stroke="var(--line)"
              :stroke-dasharray="d.level ? '0' : '3 4'"
            />
            <polygon :points="dataPoints" fill="rgba(255, 106, 43, 0.28)" stroke="var(--orange)" stroke-width="2" stroke-linejoin="round" />
            <circle
              v-for="(d, i) in dimensions"
              :key="`p${d.key}`"
              :cx="pt(i, scale(d.points)).x"
              :cy="pt(i, scale(d.points)).y"
              r="4.5"
              fill="#fff"
              :stroke="dotColor(d.level)"
              stroke-width="2.5"
            />
            <g v-for="l in labels" :key="`l${l.key}`" :text-anchor="l.anchor">
              <text :x="l.x" :y="l.y" fill="var(--ink)" font-size="11" font-weight="700">{{ l.code }}</text>
              <text :x="l.x" :y="l.y + 14" :fill="l.color" font-size="10.5" font-weight="700">{{ l.value }}</text>
            </g>
          </svg>
        </div>

        <ul class="legend">
          <li v-for="d in dimensions" :key="d.key">
            <span class="dot" :class="dotTone(d.level)" aria-hidden="true" />
            <span class="legend-name">{{ d.key }} — {{ d.label }}</span>
            <span class="legend-value" :class="dotTone(d.level)">{{ d.levelLabel }}</span>
            <span class="legend-meta">{{ d.count }} temuan</span>
          </li>
        </ul>

        <p class="muted note">
          Dimensi bertanda abu "Data belum cukup" berarti belum ada indikator yang terpicu dari data yang tersedia —
          bukan berarti aman. Nilai pada diagram adalah tingkat temuan tertinggi per dimensi, bukan skor dimensi.
        </p>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'

const props = defineProps({
  dimensions: { type: Array, required: true },
  skeleton: { type: Boolean, default: false },
})

const cx = 200
const cy = 168
const R = 112
const rings = [0.25, 0.5, 0.75, 1]

const angle = (i) => ((-90 + i * 60) * Math.PI) / 180
const scale = (v) => (Math.max(0, Math.min(100, v || 0)) / 100) * R
const pt = (i, r) => ({ x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) })
const ringPoints = (k) => props.dimensions.map((_, i) => `${pt(i, R * k).x},${pt(i, R * k).y}`).join(' ')

const dataPoints = computed(() =>
  props.dimensions.map((d, i) => `${pt(i, scale(d.points)).x},${pt(i, scale(d.points)).y}`).join(' '),
)

const dotColor = (level) => (level === 'high' ? 'var(--red)' : level === 'attention' ? 'var(--amber)' : level === 'low' ? 'var(--green)' : '#b8b3ab')
const dotTone = (level) => (level ? `tone-${level}` : 'tone-empty')

const detectedCount = computed(() => props.dimensions.filter((d) => d.level).length)

const labels = computed(() =>
  props.dimensions.map((d, i) => {
    const p = pt(i, R + 34)
    const c = Math.cos(angle(i))
    const s = Math.sin(angle(i))
    return {
      key: d.key,
      code: d.key,
      value: d.level ? d.levelLabel : 'Data belum cukup',
      color: d.level === 'high' ? 'var(--red)' : d.level === 'attention' ? '#a9711a' : d.level === 'low' ? 'var(--green)' : '#8f8a82',
      x: p.x,
      y: p.y + (s < -0.5 ? -26 : s > 0.5 ? 2 : -8),
      anchor: c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle',
    }
  }),
)
</script>

<style scoped>
.radar-card {
  --bs-card-bg: #fff;
  --bs-card-border-radius: var(--radius-lg);
}
.section-title-sm {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.chip-count {
  font-size: 11px;
  padding: 7px 14px;
}
.radar-wrap {
  display: grid;
  place-items: center;
}
.radar {
  display: block;
  height: auto;
  margin: 6px 0 0;
  max-width: 460px;
  overflow: visible;
  width: 100%;
}
.legend {
  display: grid;
  gap: 8px 18px;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}
.legend li {
  align-items: center;
  border-bottom: 1px solid var(--line);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 8px;
}
.legend .dot {
  border-radius: 50%;
  flex: none;
  height: 9px;
  width: 9px;
}
.tone-high {
  color: var(--red);
}
.tone-attention {
  color: #a9711a;
}
.tone-low {
  color: var(--green);
}
.tone-empty {
  color: #8f8a82;
}
.legend .dot.tone-high {
  background: var(--red);
}
.legend .dot.tone-attention {
  background: var(--amber);
}
.legend .dot.tone-low {
  background: var(--green);
}
.legend .dot.tone-empty {
  background: #c9c4bc;
}
.legend-name {
  font-size: 12px;
  font-weight: 700;
}
.legend-value {
  font-size: 11px;
  font-weight: 700;
}
.legend-meta {
  color: var(--muted);
  font-size: 11px;
  margin-left: auto;
}
.note {
  border-top: 1px solid var(--line);
  font-size: 11px;
  margin: 18px 0 0;
  padding-top: 14px;
}
</style>
