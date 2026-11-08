export interface UnmatchedProject {
  id: string;
  kode_rup: string | null;
  kode_tender: string | null;
  nama: string;
  dinas: string | null;
  pagu: string | null;
  tahun_anggaran: number;
}

export interface MatchCandidate {
  id: string;
  kode_rup: string | null;
  kode_tender: string | null;
  nama: string;
  dinas: string | null;
  pagu: string | null;
  skor: number;
}

export interface UnmatchedWithCandidates {
  project: UnmatchedProject;
  candidates: MatchCandidate[];
}

export interface MatchDecision {
  unmatched_id: string;
  matched_id: string;
  decision: 'match' | 'not_match';
}
