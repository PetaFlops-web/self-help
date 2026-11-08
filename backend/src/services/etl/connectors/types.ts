import type { EtlParsedRow } from '../../../types/etl.js';

export interface EtlConnector {
  fetchRows(): Promise<{ rows: EtlParsedRow[]; source_url: string }>;
}
