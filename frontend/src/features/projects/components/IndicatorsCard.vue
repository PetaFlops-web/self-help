<template>
  <section class="card soft-card">
    <div class="card-body">
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h2 class="section-title-sm">Indikator yang terdeteksi</h2>
          <p class="section-sub mb-0">Diurutkan dari tingkat risiko tertinggi. Tiap baris menyertakan nilai, ambang, dan sumber data.</p>
        </div>
        <span v-if="!skeleton" class="chip chip-count">{{ indicators.length }} indikator</span>
      </div>

      <div v-if="skeleton" class="d-grid gap-3">
        <div v-for="i in 4" :key="i" class="row-item">
          <SkeletonBlock width="38px" height="38px" radius="50%" />
          <div class="grow">
            <SkeletonBlock width="55%" height="14px" radius="4px" />
            <SkeletonBlock width="85%" height="11px" radius="4px" class="mt-2" />
          </div>
          <SkeletonBlock width="76px" height="26px" radius="999px" />
        </div>
      </div>

      <p v-else-if="indicators.length === 0" class="muted mb-0">
        Belum ada indikator temuan yang terdeteksi untuk proyek ini.
      </p>

      <ul v-else class="list-group list-group-flush plain mb-0">
        <li
          v-for="(item, i) in indicators"
          :key="item.key"
          class="list-group-item row-item"
          :class="{ first: i === 0 }"
        >
          <span class="ico" :class="`ico-${item.level}`">{{ item.icon }}</span>
          <div class="grow">
            <b class="title">{{ item.kode }} · {{ item.title }}</b>
            <p class="desc">{{ item.uraian || 'Uraian aturan belum tersedia' }}</p>
            <div class="tags">
              <span class="tag">Dimensi {{ item.dimensi }}</span>
              <span v-if="item.meta" class="tag">{{ item.meta }}</span>
              <span v-if="item.sumber && item.sumber !== '—'" class="tag tag-muted">Sumber {{ item.sumber }}</span>
              <span v-if="item.dihitungPada" class="tag tag-muted">Dihitung {{ formatShortDate(item.dihitungPada) }}</span>
            </div>
          </div>
          <RiskBadge :level="item.level" :label="item.label" />
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import RiskBadge from '@/components/ui/RiskBadge.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import { formatShortDate } from '../services/project-detail.api'

defineProps({
  indicators: { type: Array, default: () => [] },
  skeleton: { type: Boolean, default: false },
})
</script>

<style scoped>
.section-title-sm {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.chip-count {
  font-size: 11px;
  padding: 7px 14px;
}
.row-item {
  align-items: flex-start;
  display: flex;
  gap: 14px;
  padding: 16px 0;
}
.list-group-item.first {
  background: var(--bg-soft);
  border-radius: var(--radius-sm);
  border-bottom-color: transparent;
  padding-left: 14px;
  padding-right: 14px;
}
.ico {
  border-radius: 50%;
  display: grid;
  flex: none;
  font-size: 12px;
  font-weight: 800;
  height: 38px;
  place-items: center;
  width: 38px;
}
.ico-high {
  background: var(--red-soft);
  color: var(--red);
}
.ico-attention {
  background: var(--amber-soft);
  color: #a9711a;
}
.ico-low {
  background: var(--green-soft);
  color: var(--green);
}
.grow {
  flex: 1 1 260px;
  min-width: 0;
}
.title {
  font-size: 14px;
  font-weight: 700;
}
.desc {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.55;
  margin-top: 3px;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.tag {
  background: var(--bg-soft);
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 600;
  padding: 4px 10px;
}
.tag-muted {
  color: var(--muted);
}
</style>
