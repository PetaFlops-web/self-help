<template>
  <div class="admin-forbidden">
    <h2>Akses Ditolak</h2>
    <p>Peran Anda tidak mencukupi untuk membuka halaman ini.</p>
    <RouterLink to="/admin" class="admin-forbidden-link">← Kembali ke Ringkasan</RouterLink>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>
