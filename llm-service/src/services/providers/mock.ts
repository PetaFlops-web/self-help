import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { LlmConfig } from '../../config/env.js';
import type { Prompt } from '../prompt.js';
import type { LlmGenerateRequest } from '../../types/llm.js';

const GENERIC_SUGGESTION = 'Minta klarifikasi dokumen pendukung kepada instansi terkait.';

function buildMockOutput(req: LlmGenerateRequest): Record<string, unknown> {
  const indikator = req.indikator ?? [];
  const skor = req.skor ?? {};
  const total = typeof skor.total === 'number' ? skor.total : null;
  const kategori = typeof skor.kategori === 'string' ? skor.kategori : null;

  const temuan = indikator.slice(0, 6).map((i) => {
    const nilai = typeof i.nilai === 'number' ? i.nilai : null;
    const ambang = typeof i.ambang === 'number' ? i.ambang : null;
    const uraian = typeof i.uraian_aturan === 'string' ? i.uraian_aturan : 'Indikator risiko';
    const bagian = nilai !== null && ambang !== null ? ` (nilai ${nilai}, ambang tinggi ${ambang})` : '';
    return {
      kode_aturan: i.kode_aturan,
      penjelasan: `${uraian}${bagian}.`,
      arti_bagi_warga: 'Hal ini patut ditanyakan kepada instansi terkait untuk diperiksa kewajarannya.',
    };
  });

  const keterbatasan = [...(req.dimensi_data_belum_cukup ?? [])];
  if (req.proyek?.is_dummy === true) {
    keterbatasan.push('Data ini merupakan data simulasi (dummy), bukan data proyek sebenarnya.');
  }
  if (keterbatasan.length === 0) {
    keterbatasan.push('Tidak ada catatan keterbatasan data tambahan.');
  }

  const ringkasan =
    total !== null && kategori !== null
      ? `Proyek ini mendapat skor risiko ${total} (${kategori}) berdasarkan data yang diberikan. Skor ini indikator untuk diperiksa, bukan bukti pelanggaran.`
      : 'Proyek ini memiliki indikator risiko yang perlu diperiksa berdasarkan data yang diberikan.';

  return {
    ringkasan,
    temuan,
    keterbatasan,
    saran_tindak_lanjut: [{ langkah: GENERIC_SUGGESTION, lembaga: 'dinas_terkait' }],
    penafian: 'Ini indikator risiko untuk diperiksa, bukan bukti pelanggaran atau kesimpulan hukum.',
  };
}

/**
 * Provider mock untuk pengembangan/pengujian tanpa kunci API.
 * Bila AI_MOCK_RESPONSE_FILE diisi, isi file tersebut dikembalikan mentah-mentah
 * (mensimulasikan keluaran LLM yang rusak/terlarang untuk uji jalur 422).
 */
export async function callMock(
  _config: LlmConfig,
  _prompt: Prompt,
  req: LlmGenerateRequest,
): Promise<string> {
  const overrideFile = process.env.AI_MOCK_RESPONSE_FILE;
  if (overrideFile) {
    return readFileSync(path.resolve(process.cwd(), overrideFile), 'utf8');
  }
  const output = req.tugas === 'draft' ? buildMockDraftOutput(req) : buildMockOutput(req);
  return JSON.stringify(output, null, 2);
}

function buildMockDraftOutput(req: LlmGenerateRequest): Record<string, unknown> {
  const indikator = req.indikator ?? [];
  const tujuan = typeof req.tujuan_pembaca === 'string' ? req.tujuan_pembaca : 'inspektorat';
  const nama = typeof req.proyek?.nama === 'string' ? req.proyek.nama : 'proyek ini';

  const uraian = indikator.slice(0, 6).map((i) => {
    const nilai = typeof i.nilai === 'number' ? i.nilai : null;
    const ambang = typeof i.ambang === 'number' ? i.ambang : null;
    const uraianAturan = typeof i.uraian_aturan === 'string' ? i.uraian_aturan : 'Indikator risiko';
    const bagian = nilai !== null && ambang !== null ? ` (nilai ${nilai}, ambang tinggi ${ambang})` : '';
    return {
      kode_aturan: i.kode_aturan,
      penjelasan: `${uraianAturan}${bagian}.`,
      arti_bagi_warga: 'Hal ini patut ditanyakan kepada instansi terkait untuk diperiksa kewajarannya.',
    };
  });

  const lampiran: string[] = [];
  for (const l of req.laporan_terverifikasi ?? []) {
    if (typeof l.tiket === 'string' && l.tiket.length > 0) {
      lampiran.push(`Tiket laporan ${l.tiket}`);
    }
  }
  for (const i of indikator) {
    if (typeof i.sumber === 'string' && i.sumber.length > 0) {
      lampiran.push(`Sumber data ${i.sumber}`);
    }
  }

  return {
    kepada: tujuan,
    perihal: `Permohonan klarifikasi indikator risiko proyek "${nama}"`,
    pembuka: `Kami mengajukan permohonan klarifikasi atas indikator risiko pada proyek "${nama}".`,
    uraian_indikator: uraian,
    permohonan: 'Kami memohon klarifikasi berupa penjelasan dan dokumen pendukung terkait indikator di atas.',
    penutup: 'Demikian permohonan ini disampaikan; atas perhatian dan penjelasannya kami ucapkan terima kasih.',
    penafian: 'Ini indikator risiko untuk diperiksa, bukan bukti pelanggaran atau kesimpulan hukum.',
    lampiran_disarankan: lampiran,
  };
}
