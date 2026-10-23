<template>
  <article class="card soft-card rounded-md h-100">
    <div class="card-body">
      <small class="muted">{{ label }}</small>
      <strong class="d-block fs-2 fw-bold my-2">{{ value }}</strong>
      <p v-if="hint" class="muted mb-0">{{ hint }}</p>
    </div>
  </article>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  hint: { type: String, default: '' },
})
</script>
