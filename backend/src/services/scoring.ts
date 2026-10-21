import type {
  Dimension,
  DimensionResult,
  IndicatorFinding,
  ScoreInput,
  ScoreResult,
  ScoringConfig,
  ScoringRule,
  Level,
} from '../types/scoring.js';
import { isPresent } from '../helpers/number.js';

const DIMENSIONS: Dimension[] = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'];

function levelFor(value: number, rule: ScoringRule): Level {
  if (rule.direction === 'gte') {
    if (value >= rule.tinggi) return 'tinggi';
    if (value >= rule.sedang) return 'sedang';
    return 'rendah';
  }

  if (value <= rule.tinggi) return 'tinggi';
  if (value <= rule.sedang) return 'sedang';
  return 'rendah';
}

function ambangFor(tingkat: Level, rule: ScoringRule): number {
  if (tingkat === 'tinggi') return rule.tinggi;
  return rule.sedang;
}

export function validateConfig(config: ScoringConfig): void {
  if (!config.rules || config.rules.length === 0) {
    throw new Error('scoring.json: rules[] kosong');
  }
  for (const rule of config.rules) {
    if (!DIMENSIONS.includes(rule.dimension)) {
      throw new Error(`aturan ${rule.code}: dimensi tidak dikenal: ${rule.dimension}`);
    }
    if (rule.direction !== 'gte' && rule.direction !== 'lte') {
      throw new Error(`aturan ${rule.code}: direction harus gte atau lte`);
    }
    const ordered =
      rule.direction === 'gte' ? rule.tinggi >= rule.sedang : rule.tinggi <= rule.sedang;
    if (!ordered) {
      throw new Error(
        `aturan ${rule.code}: urutan ambang salah (${rule.direction}, sedang=${rule.sedang}, tinggi=${rule.tinggi})`,
      );
    }
  }
}

export function categorize(total: number, thresholds: ScoringConfig['category_thresholds']): string {
  if (total <= thresholds.rendah_max) return 'Rendah';
  if (total <= thresholds.perlu_perhatian_max) return 'Perlu Perhatian';
  return 'Tinggi';
}

/**
 *
 * @param input 
 *               
 * @param config 
 */
export function scoreProject(input: ScoreInput, config: ScoringConfig): ScoreResult {
  validateConfig(config);

  const byDimension = new Map<Dimension, ScoringRule[]>();
  for (const rule of config.rules) {
    const list = byDimension.get(rule.dimension) ?? [];
    list.push(rule);
    byDimension.set(rule.dimension, list);
  }

  const findings: IndicatorFinding[] = [];
  const dimensionScores: Record<Dimension, number | null> = {
    D1: null, D2: null, D3: null, D4: null, D5: null, D6: null,
  };
  const insufficientDataDimensions: Dimension[] = [];
  const dimensionResults: DimensionResult[] = [];

  for (const dim of DIMENSIONS) {
    const rules = byDimension.get(dim) ?? [];
    const applicable = rules.filter((r) =>
      r.required_fields.every((f) => isPresent(input[f])),
    );

    if (applicable.length === 0) {
      dimensionScores[dim] = null;
      insufficientDataDimensions.push(dim);
      dimensionResults.push({ dimensi: dim, skor: null, status: 'data_belum_cukup' });
      continue;
    }

    let maxPoints = 0;
    for (const rule of applicable) {
      const value = input[rule.input] as number;
      const tingkat = levelFor(value, rule);
      const points = config.level_points[tingkat];
      if (points > maxPoints) maxPoints = points;
      findings.push({
        dimensi: rule.dimension,
        kode_aturan: rule.code,
        nilai_terukur: value,
        ambang: ambangFor(tingkat, rule),
        tingkat,
        sumber: rule.sumber ?? '',
        uraian_aturan: rule.uraian_aturan ?? rule.code,
      });
    }

    dimensionScores[dim] = maxPoints;
    dimensionResults.push({ dimensi: dim, skor: maxPoints, status: 'dihitung' });
  }

  const computedDims = dimensionResults
    .filter((d) => d.status === 'dihitung')
    .map((d) => d.dimensi);
  const weightsUsed: Partial<Record<Dimension, number>> = {};

  let totalScore: number | null = null;
  if (computedDims.length > 0) {
    const rawWeightSum = computedDims.reduce(
      (acc, d) => acc + (config.dimension_weights[d] ?? 0),
      0,
    );
    if (rawWeightSum > 0) {
      let total = 0;
      for (const d of computedDims) {
        const w = (config.dimension_weights[d] ?? 0) / rawWeightSum;
        weightsUsed[d] = w;
        total += w * (dimensionScores[d] as number);
      }
      totalScore = Math.round(total * 100) / 100;
    }
  }

  const category =
    totalScore === null ? null : categorize(totalScore, config.category_thresholds);

  return {
    skor_total: totalScore,
    kategori: category,
    dimensi: dimensionScores,
    indikator_temuan: findings,
    dimensi_data_belum_cukup: insufficientDataDimensions,
    weights_used: weightsUsed,
  };
}
