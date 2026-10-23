<template>
  <div class="card soft-card rounded-md h-100 d-block project-card-skeleton" aria-busy="true">
    <span class="visually-hidden" role="status">Memuat kartu proyek…</span>
    <div class="card-body" aria-hidden="true">
      <div class="d-flex justify-content-between align-items-center gap-2">
        <small class="kicker">PROYEK PUBLIK</small>
        <SkeletonBlock width="78px" height="26px" radius="999px" />
      </div>

      <SkeletonBlock width="85%" height="20px" radius="4px" class="my-3" />
      <SkeletonBlock width="55%" height="13px" radius="4px" />

      <div class="metrics row g-2 border-top mt-3 pt-3">
        <div class="col-6">
          <small>Indikator risiko</small>
          <SkeletonBlock width="50px" height="16px" radius="4px" />
        </div>
        <div class="col-6">
          <small>Anggaran</small>
          <SkeletonBlock width="80px" height="16px" radius="4px" />
        </div>
      </div>

      <SkeletonBlock width="100%" height="6px" radius="999px" class="mt-3" />
    </div>
  </div>
</template>

<script setup>
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
</script>

<style scoped>
.kicker { font-size: 10px; letter-spacing: 1px; font-weight: 700; color: var(--muted); }
.metrics small { display: block; font-size: 11px; color: var(--muted); margin-bottom: 4px; }
</style>
