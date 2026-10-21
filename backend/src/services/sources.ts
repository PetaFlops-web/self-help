import { listSumberData } from '../repositories/sumber-data.js';
import type { SumberData } from '../types/sumber-data.js';

export async function listSources(): Promise<SumberData[]> {
  return listSumberData();
}
