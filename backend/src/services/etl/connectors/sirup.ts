import type { EtlConnector } from './types.js';
import { parseSiRUPCsv } from '../sirup-parser.js';
import { HttpError } from '../../../helpers/http.js';
import type { EtlParsedRow } from '../../../types/etl.js';

export interface SirupConnectorOptions {
  csvContent?: string;
  apiUrl?: string;
}

const FETCH_TIMEOUT_MS = 30000;
const USER_AGENT = 'ClearsightETL/1.0';

export class SirupConnector implements EtlConnector {
  private readonly csvContent?: string;
  private readonly apiUrl?: string;

  constructor(opts: SirupConnectorOptions = {}) {
    this.csvContent = opts.csvContent;
    this.apiUrl = opts.apiUrl;
  }

  async fetchRows(): Promise<{ rows: EtlParsedRow[]; source_url: string }> {
    if (this.csvContent !== undefined) {
      const rows = parseSiRUPCsv(this.csvContent);
      return { rows, source_url: '' };
    }

    if (this.apiUrl !== undefined) {
      const rows = await this.fetchFromUrl(this.apiUrl);
      return { rows, source_url: this.apiUrl };
    }

    throw new HttpError(400, 'Connector SiRUP memerlukan csvContent atau apiUrl');
  }

  private async fetchFromUrl(apiUrl: string): Promise<EtlParsedRow[]> {
    let response: Response;
    try {
      response = await fetch(apiUrl, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      throw new HttpError(
        502,
        `Gagal mengambil data dari sumber: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (!response.ok) {
      throw new HttpError(502, `Sumber mengembalikan status ${response.status}`);
    }

    const csvContent = await response.text();
    return parseSiRUPCsv(csvContent);
  }
}

export function createSirupConnector(opts: SirupConnectorOptions): EtlConnector {
  return new SirupConnector(opts);
}
