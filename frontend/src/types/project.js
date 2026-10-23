// Dulunya project.ts (hanya tipe). Di JavaScript tipe tidak dijalankan,
// jadi didokumentasikan lewat JSDoc agar editor (VS Code) tetap memberi autocomplete.

/** @typedef {'rab' | 'procurement' | 'fieldOversight' | 'fundFlow' | 'procedure' | 'transparency'} RiskDimensionKey */
/** @typedef {{ key: RiskDimensionKey, label: string, score: number, weight: number, explanation: string }} RiskDimension */
/** @typedef {{ id: string | number, title: string, source: string, publishedAt?: string, url?: string }} SourceDocument */

export {}
