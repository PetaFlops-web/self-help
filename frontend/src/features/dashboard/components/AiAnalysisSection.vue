<template>
  <section class="section card ai">
    <div class="card-body p-3 p-md-4">
      <header class="d-flex flex-wrap align-items-center gap-3">
        <span class="ai-ico" aria-hidden="true">✦</span>
        <div class="flex-grow-1">
          <h2>Analisis anggaran oleh AI</h2>
          <p class="ai-sub">Angka dihitung oleh mesin skor. AI hanya menjelaskan hasilnya dengan bahasa awam.</p>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <SkeletonBlock v-if="showSkeleton" width="80px" height="28px" radius="999px" />
          <span v-else class="badge rounded-pill chip text-secondary">{{ ai.createdAt }}</span>

          <SkeletonBlock v-if="showSkeleton" width="95px" height="28px" radius="999px" />
          <span v-else class="badge rounded-pill chip ok">{{ ai.status }}</span>
        </div>
      </header>

      <h3 class="label">Cara analisis dilakukan</h3>
      <div class="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3">
        <div v-for="s in ai.steps" :key="s.no" class="col">
          <div class="how-card h-100" :class="{ active: s.active }">
            <span class="no">{{ s.no }}</span>
            <span class="check">✓</span>
            <div><b>{{ s.title }}</b><p>{{ s.text }}</p></div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-lg-7">
          <h3 class="label">Bagian biaya yang dicek</h3>
          <div class="table-responsive">
            <table class="table cost-table align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Bahan / pekerjaan</th>
                  <th scope="col">Anggaran proyek</th>
                  <th scope="col">Harga pembanding</th>
                  <th scope="col">Perbedaan</th>
                  <th scope="col" class="text-center">Hasil cek</th>
                </tr>
              </thead>
              <tbody v-if="showSkeleton">
                <tr v-for="i in 4" :key="i">
                  <td class="item"><SkeletonBlock width="130px" height="14px" radius="4px" /></td>
                  <td><SkeletonBlock width="65px" height="14px" radius="4px" /></td>
                  <td><SkeletonBlock width="65px" height="14px" radius="4px" /></td>
                  <td><SkeletonBlock width="50px" height="14px" radius="4px" /></td>
                  <td class="text-center"><SkeletonBlock width="68px" height="24px" radius="999px" class="mx-auto" /></td>
                </tr>
              </tbody>
              <tbody v-else>
                <tr v-for="r in ai.rows" :key="r.item">
                  <td class="item">{{ r.item }}</td>
                  <td>{{ r.budget }}</td>
                  <td>{{ r.benchmark }}</td>
                  <td class="diff" :class="`t-${r.level}`">{{ r.diff }}</td>
                  <td class="text-center"><RiskBadge :level="r.level" :label="r.label" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="foot">{{ ai.formulaNote }}</p>
          <p class="foot mt-1">{{ ai.validationNote }}</p>
        </div>

        <div class="col-lg-5">
          <article class="explain">
            <h3>Penjelasan AI</h3>
            <div v-if="showAiSkeleton" class="d-grid gap-2 mb-3">
              <SkeletonBlock width="100%" height="13px" radius="4px" class="bg-dark-subtle" />
              <SkeletonBlock width="95%" height="13px" radius="4px" class="bg-dark-subtle" />
              <SkeletonBlock width="80%" height="13px" radius="4px" class="bg-dark-subtle mt-2" />
              <SkeletonBlock width="90%" height="13px" radius="4px" class="bg-dark-subtle" />
              <div class="d-flex flex-wrap gap-2 mt-3">
                <SkeletonBlock width="80px" height="24px" radius="999px" class="bg-dark-subtle" />
                <SkeletonBlock width="120px" height="24px" radius="999px" class="bg-dark-subtle" />
              </div>
            </div>
            <template v-else>
              <p v-for="(p, i) in ai.explanation" :key="i">{{ p }}</p>
              <div class="d-flex flex-wrap gap-2 mt-3"><span v-for="c in ai.chips" :key="c" class="badge rounded-pill">{{ c }}</span></div>
            </template>
          </article>
          <div class="d-flex flex-wrap gap-2 mt-3">
            <button type="button" class="btn btn-orange flex-grow-1" @click="createDraft" :disabled="draftLoading">
              {{ draftLoading ? 'Menyiapkan draf...' : 'Buat draf laporan' }}
            </button>
            <button type="button" class="btn btn-outline-dark flex-fill" @click="copyText">{{ copied ? 'Tersalin' : 'Salin' }}</button>
            <RouterLink class="btn btn-outline-dark flex-fill" to="/lapor">Teruskan</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import RiskBadge from '@/components/ui/RiskBadge.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import { useMinLoading } from '@/composables/useMinLoading'
import { useDashboardData } from '../composables/useDashboardData'
import { projectsApi } from '@/services/api'

const { ai, loading, aiLoading, project } = useDashboardData()
const showSkeleton = useMinLoading(loading)
// Skeleton khusus Penjelasan AI: aktif selama data utama ATAU explain masih dimuat,
// sehingga section AI menampilkan skeleton sendiri walau data lain sudah tampil.
const showAiSkeleton = useMinLoading(computed(() => loading.value || aiLoading.value))
const router = useRouter()
const copied = ref(false)
const draftLoading = ref(false)

async function createDraft() {
  if (!project.value?.id) return
  draftLoading.value = true
  try {
    const data = await projectsApi.draft(project.value.id)
    const description = formatDraftText(data)
    navigateToReport(description)
  } catch (err) {
    // Jika backend gagal, gunakan penjelasan AI yang sudah tersedia
    navigateToReport(ai.explanation?.join('\n\n') || '')
  } finally {
    draftLoading.value = false
  }
}

function formatDraftText(d) {
  const lines = [
    `Kepada: ${d.kepada || ''}`,
    `Perihal: ${d.perihal || ''}`,
    '',
    d.pembuka || '',
    '',
    'Uraian indikator:',
    ...(d.uraian_indikator || []).map((u) => `- ${u.kode_aturan}: ${u.penjelasan}\n  Arti bagi warga: ${u.arti_bagi_warga}`),
    '',
    `Permohonan: ${d.permohonan || ''}`,
    '',
    d.penutup || '',
  ]
  if (d.lampiran_disarankan?.length) {
    lines.push('', 'Lampiran yang disarankan:', ...d.lampiran_disarankan.map((l) => `- ${l}`))
  }
  lines.push('', d.penafian || '')
  return lines.join('\n')
}

function navigateToReport(description) {
  const title = `Draf laporan tindak lanjut - ${project.value.name || ''}`.trim()
  router.push({
    path: '/lapor',
    query: {
      projectId: project.value.id,
      projectName: project.value.name || '',
      title,
      category: 'fund_flow',
      description,
    },
  })
}

async function copyText() {
  try {
    await navigator.clipboard.writeText(ai.explanation.join('\n\n'))
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch { /* clipboard tidak tersedia */ }
}
</script>

<style scoped>
.ai { --bs-card-bg: #fff; --bs-card-border-radius: var(--radius-lg); --bs-card-border-color: var(--line); }
h2 { font-size: 24px; font-weight: 700; letter-spacing: -0.01em; }
.ai-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.ai-ico {
  display: grid; place-items: center; flex: none; width: 46px; height: 46px; border-radius: 50%; color: #fff; font-size: 20px;
  background: linear-gradient(135deg, var(--orange-light), var(--red));
}
.chip { font-size: 11px; padding: 7px 16px; }
.chip.ok { background: var(--green-soft); border-color: #cfe9da; color: var(--green); }
.label { font-size: 17px; font-weight: 700; margin: 28px 0 14px; }

.how-card {
  position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px;
  background: var(--bg-soft); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 18px 16px; min-height: 84px;
}
.how-card .no { position: absolute; right: 12px; top: 6px; font-size: 20px; font-weight: 800; color: #ece7e1; line-height: 1; }
.how-card.active { background: #111; border-color: #111; color: #fff; }
.how-card.active .no { color: #2a2a2a; }
.check { flex: none; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--orange); color: #fff; font-size: 12px; font-weight: 800; }
.how-card div { position: relative; min-width: 0; padding-right: 30px; }
.how-card b { font-size: 13px; font-weight: 700; }
.how-card p { font-size: 11px; color: var(--muted); line-height: 1.4; margin-top: 2px; }
.how-card.active p { color: #bdbdbd; }

.cost-table { --bs-table-bg: transparent; border-collapse: separate; border-spacing: 0 8px; margin-top: -8px; min-width: 480px; font-size: 12px; }
.cost-table thead th {
  background: #111; color: #fff; font-size: 10.5px; font-weight: 700; padding: 11px 10px; white-space: nowrap; border: 0;
}
.cost-table thead th:first-child, .cost-table tbody td:first-child { border-radius: var(--radius-sm) 0 0 var(--radius-sm); }
.cost-table thead th:last-child, .cost-table tbody td:last-child { border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
.cost-table tbody td { background: var(--bg-soft); padding: 14px 10px; border: 0; }
.item { font-weight: 700; font-size: 13px; line-height: 1.35; }
.diff { font-weight: 700; }
.t-high { color: var(--red); }
.t-attention { color: var(--amber); }
.t-low { color: var(--green); }
.cost-table .risk { min-width: 72px; padding: 5px 10px; }
.foot { font-size: 11px; color: var(--muted); margin-top: 14px; }

.explain { background: #111; color: #fff; border-radius: var(--radius-md); padding: 22px 22px 18px; border-left: 5px solid var(--orange); }
.explain :deep(.skeleton-shimmer) { background-color: #262626; }
.explain :deep(.skeleton-shimmer::after) {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0) 100%);
}
@media (min-width: 992px) { .explain { margin-top: 62px; } }
.explain h3 { color: var(--amber); font-size: 15px; font-weight: 700; margin-bottom: 14px; }
.explain p { font-size: 12px; line-height: 1.65; color: #e6e6e6; }
.explain p + p { margin-top: 14px; }
.explain .badge { background: #2a2a2a; font-size: 10px; font-weight: 700; color: #ddd; padding: 7px 12px; }
</style>
