<template>
  <section class="card soft-card">
    <div class="card-body">
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <h2 class="section-title-sm">Laporan warga terkait</h2>
          <p class="section-sub mb-0">Laporan yang masuk untuk proyek ini beserta status verifikasinya.</p>
        </div>
        <RouterLink v-if="!skeleton" class="btn btn-outline-dark btn-sm" to="/lapor">Lapor sekarang</RouterLink>
      </div>

      <template v-if="skeleton">
        <div v-for="i in 2" :key="i" class="report mt-3">
          <SkeletonBlock width="90px" height="14px" radius="4px" />
          <SkeletonBlock width="70%" height="12px" radius="4px" class="mt-2" />
          <SkeletonBlock width="40%" height="11px" radius="4px" class="mt-2" />
        </div>
      </template>

      <template v-else>
        <div class="summary mt-3">
          <span class="chip chip-count">{{ reports.total }} laporan</span>
          <span v-if="reports.summary?.menunggu" class="chip chip-warn">{{ reports.summary.menunggu }} menunggu verifikasi</span>
          <span v-if="reports.summary?.selesai" class="chip chip-ok">{{ reports.summary.selesai }} selesai ditindaklanjuti</span>
        </div>

        <p v-if="reports.items.length === 0" class="muted mt-3 mb-0">
          Belum ada laporan warga untuk proyek ini. Warga dapat mengirim laporan lewat menu Lapor sekarang.
        </p>

        <ul v-else class="reports">
          <li v-for="item in reports.items" :key="item.code">
            <div class="report-head">
              <b class="tiket">{{ item.code }}</b>
              <RiskBadge :level="item.level" :label="item.status" />
              <span class="kategori">{{ item.category }}</span>
              <span class="date">{{ item.dateLabel }}</span>
            </div>
            <p v-if="item.description" class="desc">{{ item.description }}</p>
            <div v-if="item.anonim" class="anonim">Dikirim anonim</div>
            <MediaGallery v-if="item.media.length" :items="item.media" size="sm" class="mt-2" />
            <RouterLink class="link-orange lacak" :to="`/lacak-laporan?tiket=${encodeURIComponent(item.code)}`">
              Lacak laporan ini ↗
            </RouterLink>
          </li>
        </ul>
      </template>
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import MediaGallery from '@/components/ui/MediaGallery.vue'
import RiskBadge from '@/components/ui/RiskBadge.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'

defineProps({
  reports: {
    type: Object,
    default: () => ({ total: 0, items: [], summary: { menunggu: 0, selesai: 0 } }),
  },
  skeleton: { type: Boolean, default: false },
})
</script>

<style scoped>
.section-title-sm {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip-count {
  font-size: 11px;
  padding: 7px 14px;
}
.chip-warn {
  background: var(--amber-soft);
  border-color: #f0d9a8;
  color: #8a5b00;
}
.chip-ok {
  background: var(--green-soft);
  border-color: #cfe9da;
  color: var(--green);
}
.reports {
  display: grid;
  gap: 14px;
  list-style: none;
  margin: 18px 0 0;
  padding: 0;
}
.reports li {
  background: var(--bg-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 16px;
}
.report-head {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.tiket {
  font-size: 13px;
  font-weight: 800;
}
.kategori {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--ink-soft);
  font-size: 10.5px;
  font-weight: 600;
  padding: 4px 10px;
}
.date {
  color: var(--muted);
  font-size: 11px;
  margin-left: auto;
}
.desc {
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 1.6;
  margin-top: 10px;
}
.anonim {
  color: var(--muted);
  font-size: 11px;
  margin-top: 8px;
}
.lacak {
  display: inline-block;
  margin-top: 10px;
}
</style>
