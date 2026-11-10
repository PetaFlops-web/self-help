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
  font-size: var(--fs-xs);
  line-height: 1.4;
}

.diff-empty {
  color: var(--c-subtle);
}

.diff-status-change {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}
.diff-badge {
  font-size: var(--fs-micro);
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--r-pill);
}
.diff-badge.is-prev {
  background: var(--c-bg);
  color: var(--c-muted);
}
.diff-badge.is-next {
  background: var(--c-success-soft);
  color: var(--c-success);
}
.diff-arrow {
  font-weight: 700;
  color: var(--c-muted);
}

.diff-detail-line {
  margin: 2px 0 0 0;
  font-size: var(--fs-micro);
  color: var(--c-muted);
}
.diff-detail-line.text-danger { color: var(--c-danger); }
.diff-detail-line.text-info { color: var(--c-info); }

.diff-etl-stats,
.diff-match-info {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.diff-chip {
  font-size: var(--fs-micro);
  font-weight: 600;
  background: var(--c-bg);
  padding: 2px 6px;
  border-radius: var(--r-xs);
  color: var(--c-ink);
}
.diff-chip.text-success { color: var(--c-success); background: var(--c-success-soft); }
.diff-chip.text-danger { color: var(--c-danger); background: var(--c-danger-soft); }
.diff-chip.text-muted { color: var(--c-muted); }

.diff-code {
  font-family: monospace;
  font-size: var(--fs-micro);
  background: var(--c-bg);
  padding: 1px 4px;
  border-radius: var(--r-xs);
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
  font-size: var(--fs-micro);
  display: flex;
  gap: 4px;
}
.diff-key {
  font-weight: 600;
  color: var(--c-muted);
}
.diff-val {
  color: var(--c-ink);
  word-break: break-all;
}
</style>
