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

export interface MatchProjectIdentity {
  id: string;
  kode_tender: string | null;
  source_id: string | null;
  match_status: string | null;
}

export interface ProjectMatch {
  id: string;
  proyek_id: string;
  pasangan_id: string;
  keputusan: 'matched' | 'not_match';
}
