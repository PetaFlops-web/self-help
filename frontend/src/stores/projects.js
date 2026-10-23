import { defineStore } from 'pinia'
import { ref } from 'vue'
import { projectsApi } from '@/services/api/projects.api'
import { demoProjects } from '@/mocks/projects'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref([])
  const loading = ref(false)
  const error = ref('')
  const usingDemoData = ref(false)

  async function fetchProjects(params) {
    loading.value = true
    error.value = ''
    usingDemoData.value = false

    const enableFallback = import.meta.env.VITE_ENABLE_DEMO_FALLBACK !== 'false'

    try {
      const result = await projectsApi.list(params)
      // Respons sukses dengan array kosong BUKAN error: projects = [] dan usingDemoData = false.
      projects.value = Array.isArray(result) ? result : []
      usingDemoData.value = false
    } catch (err) {
      if (enableFallback) {
        // Fallback demoProjects hanya pada error jaringan/timeout/5xx, dengan pesan error yang sama seperti sekarang
        projects.value = demoProjects
        usingDemoData.value = true
        error.value = 'Backend belum dapat diakses; data simulasi ditampilkan.'
      } else {
        // Bila "false", tanpa fallback: projects = [] dan error diisi pesan dari error.userMessage
        projects.value = []
        usingDemoData.value = false
        error.value = err?.userMessage || err?.message || 'Gagal memuat daftar proyek.'
      }
    } finally {
      loading.value = false
    }
  }

  return { projects, loading, error, usingDemoData, fetchProjects }
})

