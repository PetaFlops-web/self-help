<template>
  <section class="card soft-card">
    <div class="card-body">
      <h2 class="section-title-sm">Linimasa proyek</h2>
      <p class="section-sub">Dari pengumuman rencana pengadaan sampai pencairan dan progres lapangan yang tercatat.</p>

      <div v-if="skeleton" class="d-grid gap-3 mt-3">
        <div v-for="i in 4" :key="i" class="d-flex gap-3">
          <SkeletonBlock width="12px" height="12px" radius="50%" />
          <div class="grow">
            <SkeletonBlock width="60%" height="13px" radius="4px" />
            <SkeletonBlock width="40%" height="11px" radius="4px" class="mt-2" />
          </div>
        </div>
      </div>

      <p v-else-if="timeline.length === 0" class="muted mb-0">
        Belum ada catatan linimasa (RUP, dokumen, pembayaran, atau progres) untuk proyek ini.
      </p>

      <ol v-else class="timeline">
        <li v-for="item in timeline" :key="item.key" :class="{ muteditem: item.muted }">
          <span class="marker" :class="`marker-${item.kind}`" aria-hidden="true" />
          <div class="body">
            <div class="d-flex flex-wrap align-items-baseline gap-2">
              <b class="title">{{ item.title }}</b>
              <span class="kind" :class="`kind-${item.kind}`">{{ KIND_LABEL[item.kind] || 'Catatan' }}</span>
              <span v-if="item.isDummy" class="dummy">simulasi</span>
            </div>
            <p class="detail">{{ item.detail }}</p>
          </div>
          <span class="date">{{ item.dateLabel }}</span>
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup>
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'

const KIND_LABEL = {
  rup: 'Perencanaan',
  dokumen: 'Dokumen',
  pembayaran: 'Pembayaran',
  progres: 'Progres',
}

defineProps({
  timeline: { type: Array, default: () => [] },
  skeleton: { type: Boolean, default: false },
})
</script>

<style scoped>
.section-title-sm {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.grow {
  flex: 1 1 auto;
}
.timeline {
  list-style: none;
  margin: 18px 0 0;
  padding: 0;
  position: relative;
}
.timeline::before {
  background: var(--line);
  content: '';
  left: 5px;
  position: absolute;
  top: 8px;
  bottom: 8px;
  width: 1px;
}
.timeline li {
  align-items: flex-start;
  display: flex;
  gap: 14px;
  padding: 0 0 18px 0;
  position: relative;
}
.timeline li:last-child {
  padding-bottom: 0;
}
.marker {
  background: #fff;
  border: 2px solid var(--ink);
  border-radius: 50%;
  flex: none;
  height: 11px;
  margin-top: 4px;
  position: relative;
  width: 11px;
  z-index: 1;
}
.marker-rup {
  border-color: #6f6f6f;
}
.marker-dokumen {
  border-color: var(--blue);
}
.marker-pembayaran {
  border-color: var(--orange);
}
.marker-progres {
  border-color: var(--green);
}
.body {
  flex: 1 1 220px;
  min-width: 0;
}
.title {
  font-size: 13px;
  font-weight: 700;
}
.kind {
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 9px;
}
.kind-rup {
  background: var(--bg-soft);
  color: var(--muted);
}
.kind-dokumen {
  background: var(--blue-soft);
  color: var(--blue);
}
.kind-pembayaran {
  background: #fff0e7;
  color: #b64a12;
}
.kind-progres {
  background: var(--green-soft);
  color: var(--green);
}
.dummy {
  background: var(--amber-soft);
  border-radius: 999px;
  color: #8a5b00;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 9px;
}
.detail {
  color: var(--muted);
  font-size: 11.5px;
  line-height: 1.5;
  margin-top: 3px;
}
.date {
  color: var(--ink-soft);
  flex: none;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.muteditem .title {
  color: var(--muted);
}
@media (max-width: 575.98px) {
  .timeline li {
    flex-wrap: wrap;
  }
  .date {
    margin-left: 25px;
  }
}
</style>
