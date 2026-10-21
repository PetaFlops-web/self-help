import * as sourcesService from '../services/sources.js';
import { ok } from '../middlewares/response.js';
export async function listSources(_req, res) {
    const sources = await sourcesService.listSources();
    ok(res, 'sources', sources);
}
