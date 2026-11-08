import { parseSiRUPCsv } from '../sirup-parser.js';
import { HttpError } from '../../../helpers/http.js';
const FETCH_TIMEOUT_MS = 30000;
const USER_AGENT = 'ClearsightETL/1.0';
export class SirupConnector {
    csvContent;
    apiUrl;
    constructor(opts = {}) {
        this.csvContent = opts.csvContent;
        this.apiUrl = opts.apiUrl;
    }
    async fetchRows() {
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
    async fetchFromUrl(apiUrl) {
        let response;
        try {
            response = await fetch(apiUrl, {
                headers: { 'User-Agent': USER_AGENT },
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            });
        }
        catch (err) {
            throw new HttpError(502, `Gagal mengambil data dari sumber: ${err instanceof Error ? err.message : String(err)}`);
        }
        if (!response.ok) {
            throw new HttpError(502, `Sumber mengembalikan status ${response.status}`);
        }
        const csvContent = await response.text();
        return parseSiRUPCsv(csvContent);
    }
}
export function createSirupConnector(opts) {
    return new SirupConnector(opts);
}
