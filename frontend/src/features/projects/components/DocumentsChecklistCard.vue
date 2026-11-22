<template>
  <section class="card soft-card">
    <div class="card-body">
      <h2 class="section-title-sm">Dokumen publik &amp; checklist prosedur</h2>
      <p class="section-sub">Dokumen yang wajib dibuka dan tahapan prosedur yang sudah terpenuhi.</p>

      <template v-if="skeleton">
        <SkeletonBlock width="100%" height="90px" radius="16px" class="mt-3" />
        <SkeletonBlock width="100%" height="140px" radius="16px" class="mt-3" />
      </template>

      <template v-else>
        <div class="block">
          <div class="block-head">
            <b>Dokumen</b>
            <span class="muted small">{{ documents.terpublikasi }} dari {{ documents.total }} dipublikasikan</span>
          </div>
          <div class="progress" role="progressbar" :aria-valuenow="docsPercent" aria-valuemin="0" aria-valuemax="100" aria-label="Persentase dokumen terpublikasi">
            <div class="progress-bar bar-done" :style="{ width: `${docsPercent}%` }" />
          </div>
          <ul v-if="documents.items.length" class="list">
            <li v-for="doc in documents.items" :key="doc.id">
              <span class="mark" :class="doc.dipublikasikan ? 'mark-ok' : 'mark-miss'" aria-hidden="true">
                {{ doc.dipublikasikan ? '✓' : '!' }}
              </span>
              <span class="name">{{ doc.jenis }}</span>
              <span class="meta">{{ doc.dateLabel }}</span>
              <span class="pill" :class="doc.dipublikasikan ? 'pill-ok' : 'pill-miss'">
                {{ doc.dipublikasikan ? 'Terbuka' : 'Belum terbuka' }}
              </span>
            </li>
          </ul>
          <p v-else class="muted small mb-0">Belum ada catatan dokumen untuk proyek ini.</p>
          <p v-if="documents.belumPublik > 0" class="muted small hint">
            {{ documents.belumPublik }} dokumen wajib belum dipublikasikan — patut ditanyakan ke dinas terkait.
          </p>
        </div>

        <div class="block">
          <div class="block-head">
            <b>Checklist prosedur</b>
            <span class="muted small">{{ checklist.terpenuhi }} dari {{ checklist.total }} terpenuhi</span>
          </div>
          <div class="progress" role="progressbar" :aria-valuenow="checkPercent" aria-valuemin="0" aria-valuemax="100" aria-label="Persentase tahapan prosedur terpenuhi">
            <div class="progress-bar bar-done" :style="{ width: `${checkPercent}%` }" />
          </div>
          <ul v-if="checklist.items.length" class="list">
            <li v-for="step in checklist.items" :key="step.id">
              <span class="mark" :class="step.terpenuhi ? 'mark-ok' : 'mark-miss'" aria-hidden="true">
                {{ step.terpenuhi ? '✓' : '!' }}
              </span>
              <span class="name">{{ step.tahapan }}</span>
              <span class="pill" :class="step.terpenuhi ? 'pill-ok' : 'pill-miss'">
                {{ step.terpenuhi ? 'Terpenuhi' : 'Belum' }}
              </span>
            </li>
          </ul>
          <p v-else class="muted small mb-0">Belum ada checklist prosedur untuk proyek ini.</p>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'

const props = defineProps({
  documents: { type: Object, default: () => ({ items: [], total: 0, terpublikasi: 0, belumPublik: 0 }) },
  checklist: { type: Object, default: () => ({ items: [], total: 0, terpenuhi: 0 }) },
  skeleton: { type: Boolean, default: false },
})

const docsPercent = computed(() => (props.documents.total ? (props.documents.terpublikasi / props.documents.total) * 100 : 0))
const checkPercent = computed(() => (props.checklist.total ? (props.checklist.terpenuhi / props.checklist.total) * 100 : 0))
</script>

<style scoped>
.section-title-sm {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.block {
  border-top: 1px solid var(--line);
  margin-top: 18px;
  padding-top: 16px;
}
.block-head {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: space-between;
  margin-bottom: 10px;
}
.block-head b {
  font-size: 13px;
  font-weight: 700;
}
.block .progress {
  height: 8px;
  margin-bottom: 14px;
}
.list {
  display: grid;
  gap: 10px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.list li {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.mark {
  border-radius: 50%;
  display: grid;
  flex: none;
  font-size: 11px;
  font-weight: 800;
  height: 22px;
  place-items: center;
  width: 22px;
}
.mark-ok {
  background: var(--green-soft);
  color: var(--green);
}
.mark-miss {
  background: var(--red-soft);
  color: var(--red);
}
.name {
  flex: 1 1 160px;
  font-size: 12.5px;
  font-weight: 600;
  min-width: 0;
}
.meta {
  color: var(--muted);
  font-size: 11px;
}
.pill {
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 10px;
}
.pill-ok {
  background: var(--green-soft);
  color: var(--green);
}
.pill-miss {
  background: var(--red-soft);
  color: var(--red);
}
.hint {
  background: var(--amber-soft);
  border-radius: var(--radius-sm);
  color: #8a5b00;
  font-size: 11px;
  margin: 12px 0 0;
  padding: 10px 12px;
}
</style>
