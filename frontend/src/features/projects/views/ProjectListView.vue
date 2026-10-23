<template>
  <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
    <p class="muted mb-0">Daftar proyek dipantau. Item demo ditandai sebagai simulasi.</p>
    <button type="button" class="btn btn-outline-dark btn-sm" @click="store.fetchProjects">Muat ulang</button>
  </div>
  <div v-if="store.error" class="alert alert-warning small" role="alert">{{ store.error }}</div>

  <!-- Skeleton saat memuat daftar proyek -->
  <div v-if="showSkeleton" class="row g-3 row-cols-1 row-cols-md-2 row-cols-lg-3" aria-busy="true">
    <span class="visually-hidden" role="status">Memuat daftar proyek…</span>
    <div v-for="i in 3" :key="i" class="col" aria-hidden="true">
      <ProjectCardSkeleton />
    </div>
  </div>

  <div v-else class="row g-3 row-cols-1 row-cols-md-2 row-cols-lg-3">
    <div v-for="p in store.projects" :key="p.id" class="col">
      <ProjectCard :project="p" />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import ProjectCard from '@/components/projects/ProjectCard.vue'
import ProjectCardSkeleton from '@/components/projects/ProjectCardSkeleton.vue'
import { useMinLoading } from '@/composables/useMinLoading'
import { useProjectsStore } from '@/stores/projects'

const store = useProjectsStore()
const showSkeleton = useMinLoading(() => store.loading)
onMounted(() => { if (!store.projects.length) void store.fetchProjects() })
</script>
