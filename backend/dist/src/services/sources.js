import { listDataSources } from '../repositories/data-source.js';
export async function listSources() {
    return listDataSources();
}
