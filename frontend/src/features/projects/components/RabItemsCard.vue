<template>
  <section class="card soft-card">
    <div class="card-body">
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <h2 class="section-title-sm">Rincian rencana anggaran biaya (RAB)</h2>
          <p class="section-sub mb-0">Harga satuan tiap item dibandingkan harga acuan yang dipakai sebagai pembanding.</p>
        </div>
        <span v-if="!skeleton && rab.items.length" class="chip chip-count">{{ rab.items.length }} item</span>
      </div>

      <template v-if="skeleton">
        <SkeletonBlock width="100%" height="200px" radius="16px" class="mt-3" />
      </template>

      <p v-else-if="rab.items.length === 0" class="muted mt-3 mb-0">
        Belum ada rincian item RAB untuk proyek ini.
      </p>

      <template v-else>
        <div class="table-wrap mt-3">
          <table class="tbl">
            <caption class="visually-hidden">Item RAB beserta harga acuan dan deviasinya</caption>
            <thead>
              <tr>
                <th scope="col">Item pekerjaan</th>
                <th scope="col">Volume</th>
                <th scope="col">Harga satuan</th>
                <th scope="col">Total anggaran</th>
                <th scope="col">Harga pembanding</th>
                <th scope="col">Beda</th>
                <th scope="col" class="text-center">Hasil cek</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in rab.items" :key="item.id">
                <td>
                  <span class="item">{{ item.uraian }}</span>
                  <span v-if="item.kodeAcuan !== '—'" class="code">Acuan {{ item.kodeAcuan }}</span>
                </td>
                <td>{{ formatVolume(item) }}</td>
                <td>{{ item.hargaSatuanLabel }}</td>
                <td class="strong">{{ item.totalRencanaLabel }}</td>
                <td>{{ item.totalAcuanLabel }}</td>
                <td class="diff" :class="`t-${item.level}`">{{ item.deviasiLabel }}</td>
                <td class="text-center"><RiskBadge :level="item.level" :label="item.levelLabel" /></td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colspan="3">Total</th>
                <td class="strong">{{ formatMoney(rab.totalRencana) }}</td>
                <td>{{ formatMoney(rab.totalAcuan) }}</td>
                <td colspan="2" />
              </tr>
            </tfoot>
          </table>
        </div>

        <p class="muted note">
          Beda dihitung dari harga satuan terhadap harga acuan pembanding. Angka di atas 15% ditandai Tinggi,
          5–15% ditandai Sedang. Selisih bukan bukti markup — perlu dokumen pendukung untuk memastikannya.
        </p>
      </template>
    </div>
  </section>
</template>

<script setup>
import RiskBadge from '@/components/ui/RiskBadge.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import { formatMoney } from '../services/project-detail.api'

defineProps({
  rab: { type: Object, default: () => ({ items: [], totalRencana: null, totalAcuan: null }) },
  skeleton: { type: Boolean, default: false },
})

const formatVolume = (item) => {
  if (item.volume === null || item.volume === undefined) return '—'
  const value = Number(item.volume).toLocaleString('id-ID', { maximumFractionDigits: 2 })
  return `${value} ${item.satuan}`.trim()
}
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
.table-wrap {
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  overflow-x: auto;
}
.tbl {
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12px;
  margin: 0;
  min-width: 760px;
  width: 100%;
}
.tbl thead th {
  background: #111;
  color: #fff;
  font-size: 10.5px;
  font-weight: 700;
  padding: 11px 12px;
  text-align: left;
  white-space: nowrap;
}
.tbl tbody td {
  border-bottom: 1px solid var(--line);
  padding: 12px;
  vertical-align: top;
}
.tbl tfoot th,
.tbl tfoot td {
  background: var(--bg-soft);
  font-size: 12px;
  font-weight: 700;
  padding: 12px;
  text-align: left;
}
.item {
  display: block;
  font-weight: 700;
  line-height: 1.4;
}
.code {
  color: var(--muted);
  display: block;
  font-size: 10.5px;
  margin-top: 3px;
}
.strong {
  font-weight: 700;
}
.diff {
  font-weight: 700;
  white-space: nowrap;
}
.t-high {
  color: var(--red);
}
.t-attention {
  color: #a9711a;
}
.t-low {
  color: var(--green);
}
.note {
  border-top: 1px solid var(--line);
  font-size: 11px;
  margin: 18px 0 0;
  padding-top: 14px;
}
</style>
