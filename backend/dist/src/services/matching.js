import pool from '../config/database.js';
import { HttpError, isUuid, positiveIntParam, intParam } from '../helpers/http.js';
import { listUnmatchedProjects, findMatchCandidates, findAutoMatchCandidates, lockProjectsForMatching, findPairDecision, insertPairDecision, markProjectsMatched, } from '../repositories/matching.js';
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
function tokenize(text) {
    return new Set(text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((token) => token.length > 0));
}
function jaccardSimilarity(a, b) {
    if (a.size === 0 && b.size === 0)
        return 0;
    let intersection = 0;
    for (const token of a) {
        if (b.has(token))
            intersection += 1;
    }
    const union = a.size + b.size - intersection;
    return union === 0 ? 0 : intersection / union;
}
function paguProximityScore(a, b) {
    if (!a || !b)
        return 0;
    const pa = Number(a);
    const pb = Number(b);
    if (!Number.isFinite(pa) || !Number.isFinite(pb) || pa <= 0 || pb <= 0)
        return 0;
    const larger = Math.max(pa, pb);
    const ratio = Math.abs(pa - pb) / larger;
    if (ratio <= 0.1)
        return 30;
    if (ratio <= 0.25)
        return 15;
    return 0;
}
export function calculateMatchScore(a, b) {
    const nameScore = Math.round(jaccardSimilarity(tokenize(a.nama), tokenize(b.nama)) * 40);
    let dinasScore = 0;
    if (a.dinas && b.dinas && a.dinas.toLowerCase() === b.dinas.toLowerCase()) {
        dinasScore = 30;
    }
    const paguScore = paguProximityScore(a.pagu, b.pagu);
    return Math.min(100, nameScore + dinasScore + paguScore);
}
function scoreCandidate(project, candidate) {
    if (project.kode_rup && candidate.kode_rup && project.kode_rup === candidate.kode_rup) {
        return 100;
    }
    if (project.kode_tender &&
        candidate.kode_tender &&
        project.kode_tender === candidate.kode_tender) {
        return 100;
    }
    return calculateMatchScore(project, candidate);
}
export async function getUnmatchedWithCandidates(query) {
    const limit = positiveIntParam(query.limit);
    if (query.limit !== undefined && limit === undefined) {
        throw new HttpError(400, 'limit harus bilangan bulat positif');
    }
    const offset = intParam(query.offset);
    if (query.offset !== undefined && (offset === undefined || offset < 0)) {
        throw new HttpError(400, 'offset harus bilangan bulat non-negatif');
    }
    const finalLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const finalOffset = offset ?? 0;
    const { rows: unmatched, total } = await listUnmatchedProjects(finalLimit, finalOffset);
    const rows = [];
    for (const project of unmatched) {
        const candidates = await findMatchCandidates(project.id);
        const scored = candidates
            .map((candidate) => ({ ...candidate, skor: scoreCandidate(project, candidate) }))
            .sort((x, y) => y.skor - x.skor)
            .slice(0, 5);
        rows.push({ project, candidates: scored });
    }
    return { rows, total, limit: finalLimit, offset: finalOffset };
}
function isUnmatched(project) {
    return project.match_status === null || project.match_status === 'unmatched';
}
async function persistMatchDecision(decision, automatic) {
    if (!['match', 'not_match'].includes(decision.decision)) {
        throw new HttpError(400, 'decision harus match atau not_match');
    }
    if (!isUuid(decision.unmatched_id) || !isUuid(decision.matched_id)) {
        throw new HttpError(400, 'ID proyek harus UUID valid');
    }
    if (decision.unmatched_id === decision.matched_id) {
        throw new HttpError(400, 'Proyek tidak dapat dicocokkan dengan dirinya sendiri');
    }
    const [proyekId, pasanganId] = [decision.unmatched_id, decision.matched_id].sort();
    const storedDecision = decision.decision === 'match' ? 'matched' : 'not_match';
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const locked = await lockProjectsForMatching(client, [proyekId, pasanganId]);
        if (locked.length !== 2) {
            throw new HttpError(404, 'Satu atau kedua proyek tidak ditemukan');
        }
        const first = locked.find((project) => project.id === decision.unmatched_id);
        const second = locked.find((project) => project.id === decision.matched_id);
        if (!first || !second) {
            throw new HttpError(404, 'Satu atau kedua proyek tidak ditemukan');
        }
        if (!first.source_id || !second.source_id || first.source_id === second.source_id) {
            throw new HttpError(400, 'Pencocokan hanya dapat dilakukan antarsumber berbeda');
        }
        const existing = await findPairDecision(client, proyekId, pasanganId);
        if (existing) {
            if (existing.keputusan === storedDecision) {
                await client.query('COMMIT');
                return;
            }
            throw new HttpError(400, 'Pasangan sudah memiliki keputusan yang berbeda');
        }
        if (!isUnmatched(first) || !isUnmatched(second)) {
            throw new HttpError(400, 'Kedua proyek harus berstatus unmatched');
        }
        if (automatic) {
            const candidates = await findAutoMatchCandidates(first, client);
            if (candidates.length !== 1 || candidates[0].id !== second.id) {
                throw new HttpError(400, 'Kandidat pencocokan otomatis tidak lagi unik');
            }
        }
        await insertPairDecision(client, proyekId, pasanganId, storedDecision);
        if (decision.decision === 'match') {
            await markProjectsMatched(client, [proyekId, pasanganId]);
        }
        await client.query('COMMIT');
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
export async function processMatchDecision(decision) {
    await persistMatchDecision(decision, false);
}
export async function autoMatchProject(project) {
    if (!isUnmatched(project) || !project.kode_tender || !project.source_id)
        return;
    const candidates = await findAutoMatchCandidates(project);
    if (candidates.length !== 1)
        return;
    try {
        await persistMatchDecision({
            unmatched_id: project.id,
            matched_id: candidates[0].id,
            decision: 'match',
        }, true);
    }
    catch (error) {
        if (error instanceof HttpError)
            return;
        throw error;
    }
}
