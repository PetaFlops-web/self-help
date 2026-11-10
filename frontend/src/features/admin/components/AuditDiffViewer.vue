<template>
  <div class="audit-diff">
    <template v-if="!diff || Object.keys(diff).length === 0">
      <span class="diff-empty">—</span>
    </template>

    <!-- Transisi status laporan (Moderasi) -->
    <template v-else-if="diff.before?.status || diff.after?.status">
      <div class="diff-status-change">
        <span class="diff-badge is-prev">{{ diff.before?.status || 'Awal' }}</span>
        <span class="diff-arrow">→</span>
        <span class="diff-badge is-next">{{ diff.after?.status || 'Tujuan' }}</span>
      </div>
      <p v-if="diff.after?.catatan_verifikator" class="diff-detail-line">
        <strong>Catatan:</strong> {{ diff.after.catatan_verifikator }}
      </p>
      <p v-if="diff.after?.alasan_tolak" class="diff-detail-line text-danger">
        <strong>Alasan tolak:</strong> {{ diff.after.alasan_tolak }}
      </p>
      <p v-if="diff.after?.lembaga_tujuan" class="diff-detail-line text-info">
        <strong>Tujuan:</strong> {{ diff.after.lembaga_tujuan }}
      </p>
    </template>

    <!-- Hasil Eksekusi ETL -->
    <template v-else-if="'total_rows' in diff">
      <div class="diff-etl-stats">
        <span class="diff-chip">Total: {{ diff.total_rows }}</span>
        <span class="diff-chip text-success">Diterima: {{ diff.accepted }}</span>
        <span v-if="diff.rejected" class="diff-chip text-danger">Ditolak: {{ diff.rejected }}</span>
      </div>
    </template>

    <!-- Keputusan Pencocokan Paket -->
    <template v-else-if="'decision' in diff">
      <div class="diff-match-info">
        <span class="diff-chip" :class="diff.decision === 'match' ? 'text-success' : 'text-muted'">
          {{ diff.decision === 'match' ? '✓ Dicocokkan' : '✗ Ditolak Cocok' }}
        </span>
        <code v-if="diff.matched_id" class="diff-code">{{ diff.matched_id }}</code>
      </div>
    </template>

    <!-- Generic Object Viewer -->
    <template v-else>
      <div class="diff-generic">
        <div class="diff-kv-list">
          <div v-for="(val, key) in diff" :key="key" class="diff-kv-item">
            <span class="diff-key">{{ key }}:</span>
            <span class="diff-val">{{ formatValue(val) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  diff: {
    type: Object,
    default: null,
  },
})

function formatValue(val) {
  if (val === null || val === undefined) return 'null'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}
</script>

<style scoped>
.audit-diff {
  font-size: 11.5px;
  line-height: 1.45;
}

.diff-empty {
  color: #9CA3AF;
}

.diff-status-change {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
  flex-wrap: wrap;
}

.diff-badge {
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  letter-spacing: 0.02em;
}

.diff-badge.is-prev {
  background: #F4F2EE;
  color: #6B6760;
  border: 1px solid #E7E3DC;
}

.diff-badge.is-next {
  background: #ECFDF5;
  color: #059669;
  border: 1px solid #A7F3D0;
}

.diff-arrow {
  font-weight: 700;
  color: #9CA3AF;
  font-size: 11px;
}

.diff-detail-line {
  margin: 3px 0 0 0;
  font-size: 11px;
  color: #6B6760;
}

.diff-detail-line.text-danger { color: #DC2626; }
.diff-detail-line.text-info { color: #0284C7; }

.diff-etl-stats,
.diff-match-info {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.diff-chip {
  font-size: 11px;
  font-weight: 600;
  background: #F4F2EE;
  padding: 2px 7px;
  border-radius: 6px;
  color: #111111;
  border: 1px solid #E7E3DC;
}

.diff-chip.text-success {
  color: #059669;
  background: #ECFDF5;
  border-color: #A7F3D0;
}

.diff-chip.text-danger {
  color: #DC2626;
  background: #FEE2E2;
  border-color: #FECACA;
}

.diff-chip.text-muted {
  color: #6B6760;
}

.diff-code {
  font-family: monospace;
  font-size: 10.5px;
  background: #F4F2EE;
  padding: 2px 6px;
  border-radius: 6px;
  border: 1px solid #E7E3DC;
  color: #111111;
}

.diff-generic {
  max-width: 320px;
}

.diff-kv-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.diff-kv-item {
  font-size: 11px;
  display: flex;
  gap: 6px;
}

.diff-key {
  font-weight: 600;
  color: #6B6760;
}

.diff-val {
  color: #111111;
  word-break: break-all;
}
</style>
