<template>
  <span class="badge rounded-pill risk" :class="`risk-${level}`">{{ label || getRiskLabel(level) }}</span>
</template>

<script setup>
import { getRiskLabel } from '@/utils/riskScoring'

defineProps({
  level: { type: String, required: true, validator: (v) => ['low', 'attention', 'high'].includes(v) },
  label: { type: String, default: '' },
})
</script>

<style scoped>
.risk { min-width: 78px; padding: 6px 14px; font-size: 11px; font-weight: 700; color: #fff; }
.risk-high { background: var(--red); }
.risk-attention { background: var(--amber); }
.risk-low { background: var(--green); }
</style>
