import { HttpError, strParam, positiveIntParam, intParam } from '../helpers/http.js';
import {
  listUnmatchedProjects,
  findMatchCandidates,
  updateMatchStatus,
} from '../repositories/matching.js';
import type {
  MatchCandidate,
  MatchDecision,
  UnmatchedProject,
  UnmatchedWithCandidates,
} from '../types/matching.js';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 0),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function paguProximityScore(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  const pa = Number(a);
  const pb = Number(b);
  if (!Number.isFinite(pa) || !Number.isFinite(pb) || pa <= 0 || pb <= 0) return 0;
  const larger = Math.max(pa, pb);
  const ratio = Math.abs(pa - pb) / larger;
  if (ratio <= 0.1) return 30;
  if (ratio <= 0.25) return 15;
  return 0;
}

export function calculateMatchScore(
  a: { nama: string; dinas: string | null; pagu: string | null },
  b: { nama: string; dinas: string | null; pagu: string | null },
): number {
  const nameScore = Math.round(jaccardSimilarity(tokenize(a.nama), tokenize(b.nama)) * 40);

  let dinasScore = 0;
  if (a.dinas && b.dinas && a.dinas.toLowerCase() === b.dinas.toLowerCase()) {
    dinasScore = 30;
  }

  const paguScore = paguProximityScore(a.pagu, b.pagu);

  return Math.min(100, nameScore + dinasScore + paguScore);
}

function scoreCandidate(project: UnmatchedProject, candidate: MatchCandidate): number {
  if (project.kode_rup && candidate.kode_rup && project.kode_rup === candidate.kode_rup) {
    return 100;
  }
  if (
    project.kode_tender &&
    candidate.kode_tender &&
    project.kode_tender === candidate.kode_tender
  ) {
    return 100;
  }
  return calculateMatchScore(project, candidate);
}

export async function getUnmatchedWithCandidates(
  query: Record<string, unknown>,
): Promise<{
  rows: UnmatchedWithCandidates[];
  total: number;
  limit: number;
  offset: number;
}> {
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

  const rows: UnmatchedWithCandidates[] = [];
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

export async function processMatchDecision(decision: MatchDecision): Promise<void> {
  if (decision.decision === 'match') {
    await updateMatchStatus(decision.unmatched_id, 'matched', decision.matched_id);
    return;
  }
  await updateMatchStatus(decision.unmatched_id, 'unmatched');
}
