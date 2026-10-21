import type { RegionRow } from '../types/region.js';
import { toNum } from '../helpers/number.js';
import { listRegions } from '../repositories/region.js';

interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    kode_bps: string;
    nama: string;
    lat: string | null;
    lng: string | null;
  };
  geometry: unknown;
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

function pointGeometry(row: RegionRow): unknown {
  const lng = toNum(row.lng);
  const lat = toNum(row.lat);
  if (lng === null || lat === null) return null;
  return { type: 'Point', coordinates: [lng, lat] };
}

export function toGeoJSON(rows: RegionRow[]): GeoJSONFeatureCollection {
  const features: GeoJSONFeature[] = rows.map((row) => {
    const geometry =
      row.geojson !== null && typeof row.geojson === 'object'
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

export async function getRegionsGeoJSON(): Promise<GeoJSONFeatureCollection> {
  const rows = await listRegions();
  return toGeoJSON(rows);
}
