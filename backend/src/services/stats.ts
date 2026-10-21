import { getStats } from '../repositories/project.js';
import type { StatsResponse } from '../types/stats.js';

export async function getStatsSummary(): Promise<StatsResponse> {
  const s = await getStats();
  return {
    total_proyek: s.total_proyek,
    kategori: {
      Rendah: s.rendah,
      'Perlu Perhatian': s.perlu_perhatian,
      Tinggi: s.tinggi,
    },
    rata_rata_skor: s.rata_rata_skor,
  };
}
