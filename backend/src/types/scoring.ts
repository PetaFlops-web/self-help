export type Level = 'rendah' | 'sedang' | 'tinggi';
export type Dimension = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6';

export type ScoreInput = Record<string, number | null | undefined>;

export interface ScoringRule {
  code: string;
  dimension: Dimension;
  nama?: string;
  input: string;
  direction: 'gte' | 'lte';
  sedang: number;
  tinggi: number;
  required_fields: string[];
  sumber?: string;
  uraian_aturan?: string;
}

export interface ScoringConfig {
  version?: string;
  category_thresholds: {
    rendah_max: number;
    perlu_perhatian_max: number;
  };
  level_points: {
    rendah: number;
    sedang: number;
    tinggi: number;
  };
  dimension_weights: Record<Dimension, number>;
  missing_data_policy?: string;
  rules: ScoringRule[];
}

export interface IndicatorFinding {
  dimensi: Dimension;
  kode_aturan: string;
  nilai_terukur: number;
  ambang: number;
  tingkat: Level;
  sumber: string;
  uraian_aturan: string;
  bukti_ref?: Record<string, unknown>;
}

export interface DimensionResult {
  dimensi: Dimension;
  skor: number | null;
  status: 'dihitung' | 'data_belum_cukup';
}

export interface ScoreResult {
  skor_total: number | null;
  kategori: string | null;
  dimensi: Record<Dimension, number | null>;
  indikator_temuan: IndicatorFinding[];
  dimensi_data_belum_cukup: Dimension[];
  weights_used: Partial<Record<Dimension, number>>;
}
