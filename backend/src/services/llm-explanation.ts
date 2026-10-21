import { getProjectById } from '../repositories/project.js';
import { listVerifiedReportsByProjectId } from '../repositories/citizen-report.js';
import { collectScoreInput } from './project-scoring.js';
import { scoreProject } from './scoring.js';
import { loadScoringConfig } from '../config/scoring.js';
import { callLlmService, LlmServiceUnavailableError } from './llm-client.js';
import { HttpError } from '../helpers/http.js';
import { toNum } from '../helpers/number.js';
import pool from '../config/database.js';
import type { Project } from '../types/project.js';
import type { VerifiedReport } from '../types/citizen-report.js';
import type { ScoreResult, IndicatorFinding } from '../types/scoring.js';
import type {
  LlmTargetInstitution,
  LlmDraftOutput,
  LlmExplainOutput,
  LlmGeneratePayload,
  LlmOutput,
  LlmTask,
} from '../types/llm.js';

const STANDARD_DISCLAIMER =
  'Ini indicators risiko untuk diperiksa, bukan bukti pelanggaran atau kesimpulan hukum.';

const VERSI_PROMPT = 'explain-v1';

const INSTITUTION_LABELS: Record<LlmTargetInstitution, string> = {
  inspektorat: 'Inspektorat',
  BPK: 'BPK',
  KPK: 'KPK',
  Ombudsman: 'Ombudsman',
  dinas_terkait: 'Dinas Terkait',
};

export type ExplainResult = LlmExplainOutput & { generated_by: 'llm' | 'fallback' };
export type DraftResult = LlmDraftOutput & { generated_by: 'llm' | 'fallback' };

function isUuidLike(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function dataDate(project: Project): string | undefined {
  const d = project.fetched_at instanceof Date ? project.fetched_at : new Date(project.fetched_at ?? '');
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

async function loadProjectAndScore(projectId: string): Promise<{ project: Project; result: ScoreResult }> {
  if (!isUuidLike(projectId)) {
    throw new HttpError(400, 'id project harus UUID yang valid');
  }
  const project = await getProjectById(projectId);
  if (!project) {
    throw new HttpError(404, 'Project tidak ditemukan');
  }

  const input = await collectScoreInput(pool, projectId);
  const result = scoreProject(input, loadScoringConfig());

  return { project, result };
}

function buildPayload(
  project: Project,
  result: ScoreResult,
  task: LlmTask,
  readerPurpose: string,
  reports: VerifiedReport[],
): LlmGeneratePayload {
  const indicators = result.indikator_temuan.map((f) => ({
    kode_aturan: f.kode_aturan,
    dimensi: f.dimensi,
    tingkat: f.tingkat,
    nilai: f.nilai_terukur,
    ambang: f.ambang,
    uraian_aturan: f.uraian_aturan,
    sumber: f.sumber,
    tanggal_data: dataDate(project),
  }));

  return {
    versi_prompt: VERSI_PROMPT,
    tugas: task,
    proyek: {
      id: project.id,
      nama: project.nama,
      dinas: project.dinas,
      kabupaten: project.kabupaten,
      tahun_anggaran: project.tahun_anggaran,
      pagu: toNum(project.pagu),
      nilai_kontrak: toNum(project.nilai_kontrak),
      is_dummy: project.is_dummy,
    },
    skor: {
      total: toNum(project.skor_total) ?? result.skor_total,
      kategori: project.kategori ?? result.kategori,
      dimensi: result.dimensi,
    },
    indikator: indicators,
    dimensi_data_belum_cukup: result.dimensi_data_belum_cukup,
    laporan_terverifikasi: reports as unknown as Array<Record<string, unknown>>,
    tujuan_pembaca: readerPurpose,
  };
}


function fallbackFindings(result: ScoreResult): LlmExplainOutput['temuan'] {
  return result.indikator_temuan.slice(0, 6).map((f: IndicatorFinding) => ({
    kode_aturan: f.kode_aturan,
    penjelasan: `Indikator ${f.kode_aturan}: ${f.uraian_aturan} — nilai ${f.nilai_terukur}, ambang tinggi ${f.ambang}. Sumber: ${f.sumber}.`,
    arti_bagi_warga: 'Hal ini patut ditanyakan kepada instansi terkait untuk diperiksa kewajarannya.',
  }));
}

export function buildFallbackExplain(project: Project, result: ScoreResult): LlmExplainOutput {
  const total = toNum(project.skor_total) ?? result.skor_total;
  const category = project.kategori ?? result.kategori;

  const keterbatasan = result.dimensi_data_belum_cukup.map(
    (d) => `Dimensi ${d} belum dinilai karena data belum cukup.`,
  );
  if (project.is_dummy) {
    keterbatasan.push('Data ini merupakan data simulasi (dummy), bukan data proyek sebenarnya.');
  }

  return {
    ringkasan: `Proyek ini mendapat skor risiko ${total ?? '-'}${category ? ` (${category})` : ''} berdasarkan data yang tersedia. Skor ini adalah indikator untuk diperiksa, bukan bukti pelanggaran.`,
    temuan: fallbackFindings(result),
    keterbatasan,
    saran_tindak_lanjut: [
      { langkah: 'Minta klarifikasi dokumen pendukung kepada instansi terkait.', lembaga: 'dinas_terkait' },
    ],
    penafian: STANDARD_DISCLAIMER,
  };
}

export function buildFallbackDraft(
  project: Project,
  result: ScoreResult,
  targetInstitution: LlmTargetInstitution,
  reports: VerifiedReport[],
): LlmDraftOutput {
  const description = result.indikator_temuan.slice(0, 6).map((f: IndicatorFinding) => ({
    kode_aturan: f.kode_aturan,
    penjelasan: `Indikator ${f.kode_aturan}: ${f.uraian_aturan} — nilai ${f.nilai_terukur}, ambang tinggi ${f.ambang}.`,
    arti_bagi_warga: 'Indikator ini patut ditanyakan untuk diperiksa kewajarannya.',
  }));

  const tickets = reports
    .map((l) => l.tiket)
    .filter((t): t is string => typeof t === 'string' && t.length > 0);
  const sources = [...new Set(result.indikator_temuan.map((f) => f.sumber).filter(Boolean))];

  return {
    kepada: INSTITUTION_LABELS[targetInstitution],
    perihal: `Permohonan klarifikasi indikator risiko proyek "${project.nama}"`,
    pembuka: `Kami mengajukan permohonan klarifikasi atas indikator risiko pada proyek "${project.nama}"${project.dinas ? ` (${project.dinas})` : ''}${project.kabupaten ? ` di ${project.kabupaten}` : ''}.`,
    uraian_indikator: description,
    permohonan: 'Kami memohon klarifikasi berupa penjelasan dan dokumen pendukung terkait indikator di atas.',
    penutup: 'Demikian permohonan ini disampaikan; atas perhatian dan penjelasannya kami ucapkan terima kasih.',
    penafian: STANDARD_DISCLAIMER,
    lampiran_disarankan: [...tickets.map((t) => `Tiket laporan ${t}`), ...sources.map((s) => `Sumber data ${s}`)],
  };
}

export async function explainProject(id: string): Promise<ExplainResult> {
  const { project, result } = await loadProjectAndScore(id);
  const reports = await listVerifiedReportsByProjectId(id);
  const payload = buildPayload(project, result, 'explain', 'warga awam', reports);

  try {
    const output = (await callLlmService(payload)) as LlmExplainOutput;
    return { generated_by: 'llm', ...output };
  } catch (err) {
    if (err instanceof LlmServiceUnavailableError) {
      return { generated_by: 'fallback', ...buildFallbackExplain(project, result) };
    }
    throw err;
  }
}

export async function draftProject(id: string, targetInstitution: LlmTargetInstitution): Promise<DraftResult> {
  const { project, result } = await loadProjectAndScore(id);
  const reports = await listVerifiedReportsByProjectId(id);
  const payload = buildPayload(project, result, 'draft', targetInstitution, reports);

  try {
    const output = (await callLlmService(payload)) as LlmDraftOutput;
    return { generated_by: 'llm', ...output };
  } catch (err) {
    if (err instanceof LlmServiceUnavailableError) {
      return { generated_by: 'fallback', ...buildFallbackDraft(project, result, targetInstitution, reports) };
    }
    throw err;
  }
}
