import { getRegionsGeoJSON } from '../services/regions.js';
import { ok } from '../middlewares/response.js';
export async function getRegions(_req, res) {
    const regions = await getRegionsGeoJSON();
    ok(res, 'regions', regions);
}
