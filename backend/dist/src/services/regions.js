import { toNum } from '../helpers/number.js';
import { listRegions } from '../repositories/region.js';
function pointGeometry(row) {
    const lng = toNum(row.lng);
    const lat = toNum(row.lat);
    if (lng === null || lat === null)
        return null;
    return { type: 'Point', coordinates: [lng, lat] };
}
export function toGeoJSON(rows) {
    const features = rows.map((row) => {
        const geometry = row.geojson !== null && typeof row.geojson === 'object'
            ? row.geojson
            : pointGeometry(row);
        return {
            type: 'Feature',
            properties: {
                kode_bps: row.kode_bps,
                nama: row.nama,
                lat: row.lat,
                lng: row.lng,
            },
            geometry,
        };
    });
    return { type: 'FeatureCollection', features };
}
export async function getRegionsGeoJSON() {
    const rows = await listRegions();
    return toGeoJSON(rows);
}
