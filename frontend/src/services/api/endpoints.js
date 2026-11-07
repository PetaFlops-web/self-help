// Sesuaikan semua path ini dengan route backend yang sebenarnya.
// Sumber kebenaran: 26 operasi backend terdaftar di ../backend/src/app.ts
export const endpoints = {
  // --- Publik ---
  projects: '/projects',
  project: (id) => `/projects/${encodeURIComponent(id)}`,
  projectIndicators: (id) => `/projects/${encodeURIComponent(id)}/indicators`,
  projectExplain: (id) => `/projects/${encodeURIComponent(id)}/explain`,
  projectDraft: (id) => `/projects/${encodeURIComponent(id)}/draft`,
  projectProgress: (id) => `/projects/${encodeURIComponent(id)}/progress`,
  projectPayments: (id) => `/projects/${encodeURIComponent(id)}/payments`,
  projectRabItems: (id) => `/projects/${encodeURIComponent(id)}/rab-items`,
  projectDocuments: (id) => `/projects/${encodeURIComponent(id)}/documents`,
  projectProcedureChecklist: (id) => `/projects/${encodeURIComponent(id)}/procedure-checklist`,
  projectReports: (id) => `/projects/${encodeURIComponent(id)}/reports`,
  stats: '/stats',
  regions: '/regions',
  sources: '/sources',
  scoringConfig: '/config/scoring',
  reports: '/reports',
  trackReport: (code) => `/reports?tiket=${encodeURIComponent(code)}`,

  // --- Autentikasi (backend Fase 19) ---
  authLogin: '/auth/login',
  authLogout: '/auth/logout',
  authMe: '/auth/me',

  // --- Admin: Laporan (backend Fase 21) ---
  adminReports: '/admin/reports',
  adminReport: (tiket) => `/admin/reports/${encodeURIComponent(tiket)}`,
  adminReportForward: (tiket) => `/admin/reports/${encodeURIComponent(tiket)}/forward`,

  // --- Admin: Audit (backend Fase 20) ---
  adminAudit: '/admin/audit',
}
