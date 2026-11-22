<template>
  <section class="explain-card">
    <header class="head">
      <span class="ico" aria-hidden="true">✦</span>
      <div class="head-text">
        <h2>Penjelasan bahasa awam</h2>
        <p class="sub">Angka dihitung mesin skor. AI hanya menjelaskan hasilnya, tidak menghitung atau mengubah skor.</p>
      </div>
      <div class="head-chips">
        <template v-if="skeleton || loading">
          <SkeletonBlock width="110px" height="26px" radius="999px" tone="light" />
          <SkeletonBlock width="90px" height="26px" radius="999px" tone="light" />
        </template>
        <template v-else-if="explanation">
          <span class="chip">{{ explanation.sourceLabel }}</span>
          <span v-if="explanation.createdAtLabel" class="chip">{{ explanation.createdAtLabel }}</span>
        </template>
      </div>
    </header>

    <div v-if="skeleton || loading" class="d-grid gap-2">
      <SkeletonBlock width="100%" height="13px" radius="4px" tone="light" />
      <SkeletonBlock width="94%" height="13px" radius="4px" tone="light" />
      <SkeletonBlock width="88%" height="13px" radius="4px" tone="light" />
      <SkeletonBlock width="60%" height="13px" radius="4px" class="mt-2" tone="light" />
      <div class="d-flex flex-wrap gap-2 mt-2">
        <SkeletonBlock width="120px" height="26px" radius="999px" tone="light" />
        <SkeletonBlock width="150px" height="26px" radius="999px" tone="light" />
      </div>
    </div>

    <div v-else-if="!explanation" class="empty">
      <p class="mb-2">
        Penjelasan bahasa awam belum bisa dimuat saat ini (layanan penjelasan tidak merespons). Skor, indikator, dan
        data lain di halaman ini tetap sahih karena dihitung mesin aturan, bukan AI.
      </p>
      <button type="button" class="btn btn-orange btn-sm" :disabled="loading" @click="$emit('retry')">Coba lagi</button>
    </div>

    <template v-else>
      <p v-for="(p, i) in explanation.paragraphs" :key="`p${i}`" class="paragraph">{{ p }}</p>

      <div v-if="explanation.temuan.length" class="temuan">
        <h3>Temuan yang dijelaskan</h3>
        <ul>
          <li v-for="t in explanation.temuan" :key="t.kode + t.penjelasan">
            <span class="kode">{{ t.kode }}</span>
            <div>
              <p class="t-text">{{ t.penjelasan }}</p>
              <p v-if="t.arti" class="t-arti">Arti bagi warga: {{ t.arti }}</p>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="explanation.saran.length" class="saran">
        <h3>Langkah yang bisa ditanyakan</h3>
        <ul>
          <li v-for="(s, i) in explanation.saran" :key="`s${i}`">
            <span>{{ s.langkah }}</span>
            <b>{{ s.lembaga }}</b>
          </li>
        </ul>
      </div>

      <div v-if="explanation.keterbatasan.length" class="limits">
        <h3>Keterbatasan data</h3>
        <ul>
          <li v-for="(k, i) in explanation.keterbatasan" :key="`k${i}`">{{ k }}</li>
        </ul>
      </div>

      <div class="foot">
        <p v-if="explanation.penafian" class="penafian">{{ explanation.penafian }}</p>
        <button type="button" class="btn copy" @click="copy">
          {{ copied ? 'Tersalin' : 'Salin penjelasan' }}
        </button>
      </div>
    </template>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'

const props = defineProps({
  explanation: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  skeleton: { type: Boolean, default: false },
})

defineEmits(['retry'])

const copied = ref(false)

function copy() {
  const parts = [
    ...(props.explanation?.paragraphs || []),
    ...(props.explanation?.temuan || []).map((t) => `${t.kode}: ${t.penjelasan}`),
    props.explanation?.penafian,
  ].filter(Boolean)

  const promise = navigator.clipboard?.writeText(parts.join('\n\n'))
  if (!promise) return
  promise
    .then(() => {
      copied.value = true
      setTimeout(() => (copied.value = false), 1800)
    })
    .catch(() => {})
}
</script>

<style scoped>
.explain-card {
  background: #111;
  border-left: 5px solid var(--orange);
  border-radius: var(--radius-lg);
  color: #fff;
  padding: 26px 26px 22px;
}
.explain-card :deep(.skeleton-shimmer) {
  background-color: #262626;
}
.explain-card :deep(.skeleton-shimmer::after) {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0) 100%);
}
.head {
  align-items: flex-start;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 18px;
}
.ico {
  background: linear-gradient(135deg, var(--orange-light), var(--red));
  border-radius: 50%;
  display: grid;
  flex: none;
  font-size: 18px;
  height: 42px;
  place-items: center;
  width: 42px;
}
.head-text {
  flex: 1 1 260px;
  min-width: 0;
}
.head-text h2 {
  font-size: 20px;
  font-weight: 700;
}
.sub {
  color: #b3b3b3;
  font-size: 11.5px;
  line-height: 1.5;
  margin-top: 4px;
}
.head-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  background: #262626;
  border-radius: 999px;
  color: #e2e2e2;
  font-size: 10.5px;
  font-weight: 700;
  padding: 7px 13px;
}
.paragraph {
  color: #eaeaea;
  font-size: 13px;
  line-height: 1.75;
}
.paragraph + .paragraph {
  margin-top: 12px;
}
.temuan,
.saran,
.limits {
  border-top: 1px solid #262626;
  margin-top: 20px;
  padding-top: 16px;
}
.temuan h3,
.saran h3,
.limits h3 {
  color: var(--amber);
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 12px;
}
.temuan ul,
.saran ul,
.limits ul {
  display: grid;
  gap: 12px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.temuan li {
  display: flex;
  gap: 12px;
}
.kode {
  background: #262626;
  border-radius: 6px;
  color: #ffb02e;
  flex: none;
  font-size: 10.5px;
  font-weight: 800;
  height: fit-content;
  padding: 4px 8px;
}
.t-text {
  color: #e0e0e0;
  font-size: 12.5px;
  line-height: 1.65;
}
.t-arti {
  color: #a8a8a8;
  font-size: 11.5px;
  line-height: 1.6;
  margin-top: 5px;
}
.saran li {
  align-items: flex-start;
  color: #e0e0e0;
  display: flex;
  flex-wrap: wrap;
  font-size: 12.5px;
  gap: 10px;
  justify-content: space-between;
}
.saran b {
  background: #262626;
  border-radius: 999px;
  color: #ffe0b2;
  font-size: 10.5px;
  font-weight: 700;
  padding: 4px 11px;
  white-space: nowrap;
}
.limits li {
  color: #b9b9b9;
  font-size: 12px;
  line-height: 1.6;
  padding-left: 14px;
  position: relative;
}
.limits li::before {
  color: #6f6f6f;
  content: '—';
  left: 0;
  position: absolute;
}
.foot {
  align-items: center;
  border-top: 1px solid #262626;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  margin-top: 20px;
  padding-top: 16px;
}
.penafian {
  color: #9d9d9d;
  font-size: 11.5px;
}
.copy {
  --bs-btn-bg: #fff;
  --bs-btn-border-color: #fff;
  --bs-btn-color: #111;
  --bs-btn-hover-bg: #e6e6e6;
  --bs-btn-hover-border-color: #e6e6e6;
  --bs-btn-hover-color: #111;
}
.empty {
  border-top: 1px solid #262626;
  color: #d2d2d2;
  font-size: 12.5px;
  line-height: 1.7;
  padding-top: 16px;
}
</style>
