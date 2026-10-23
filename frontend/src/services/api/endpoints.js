// Sesuaikan semua path ini dengan route backend yang sebenarnya.
export const endpoints = {
  dashboard: '/dashboard',
  projects: '/projects',
  project: (id) => `/projects/${encodeURIComponent(id)}`,
  projectIndicators: (id) => `/projects/${encodeURIComponent(id)}/indicators`,
  projectExplain: (id) => `/projects/${encodeURIComponent(id)}/explain`,
  projectDraft: (id) => `/projects/${encodeURIComponent(id)}/draft`,
  stats: '/stats',
  regions: '/regions',
  sources: '/sources',
  scoringConfig: '/config/scoring',
  fundFlow: '/fund-flow',
  reports: '/reports',
  trackReport: (code) => `/reports?tiket=${encodeURIComponent(code)}`,
}


