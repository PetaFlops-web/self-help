import { listSumberData } from '../repositories/sumber-data.js';
export async function listSources() {
    return listSumberData();
}
