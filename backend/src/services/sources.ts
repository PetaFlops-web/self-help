import { listDataSources } from '../repositories/data-source.js';
import type { DataSource } from '../types/data-source.js';

export async function listSources(): Promise<DataSource[]> {
  return listDataSources();
}
