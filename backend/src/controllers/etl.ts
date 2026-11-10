import type { Request, Response } from 'express';
import { runEtl } from '../services/etl/runner.js';
import { listEtlErrors as fetchEtlErrors } from '../repositories/etl.js';
import { HttpError, strParam, positiveIntParam, intParam } from '../helpers/http.js';
import { respond } from '../middlewares/response.js';
import { recordAudit } from '../helpers/audit.js';
import { uploadEtlFile, getEtlFileType } from '../middlewares/upload.js';
import type { EtlRunBody } from '../utils/validators/etl.js';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export async function runEtlHandler(req: Request, res: Response): Promise<void> {
  const { source_id, csv_content, source_url } = req.body as EtlRunBody;
  const result = await runEtl(source_id, csv_content, source_url);
  await recordAudit({
    aktor_id: req.user?.id ?? null,
    aktor_nama: req.user?.nama ?? 'Sistem ETL',
    peran: req.user?.peran ?? 'system',
    modul: 'etl',
    aksi: 'SYNC_SOURCE',
    target_id: result.source_id,
    diff: {
      total_rows: result.total_rows,
      accepted: result.accepted,
      rejected: result.rejected,
    },
    ip: (req.headers['x-real-ip'] as string) || req.ip || null,
  });
  respond(res, 200, {
    source_id: result.source_id,
    status: result.status,
    total_rows: result.total_rows,
    accepted: result.accepted,
    rejected: result.rejected,
  });
}

export async function listEtlErrors(req: Request, res: Response): Promise<void> {
  const limit = positiveIntParam(req.query.limit);
  if (req.query.limit !== undefined && limit === undefined) {
    throw new HttpError(400, 'limit harus bilangan bulat positif');
  }

  const offset = intParam(req.query.offset);
  if (req.query.offset !== undefined && (offset === undefined || offset < 0)) {
    throw new HttpError(400, 'offset harus bilangan bulat non-negatif');
  }

  const finalLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const finalOffset = offset ?? 0;

  const result = await fetchEtlErrors({
    source_id: strParam(req.query.source_id),
    limit: finalLimit,
    offset: finalOffset,
  });

  respond(res, 200, {
    etl_errors: result.rows,
    total: result.total,
    limit: finalLimit,
    offset: finalOffset,
  });
}

export async function importEtlFile(req: Request, res: Response): Promise<void> {
  const sourceId = req.body.source_id as string | undefined;
  if (!sourceId) {
    throw new HttpError(400, 'source_id wajib diisi');
  }
  const sourceUrl = typeof req.body.source_url === 'string' ? req.body.source_url : undefined;
  const file = req.file!;
  const fileType = getEtlFileType(file);
  const fileContent = file.buffer.toString('utf8');

  const result = await runEtl(
    sourceId,
    fileType === 'csv' ? fileContent : undefined,
    sourceUrl,
    fileType === 'json' ? fileContent : undefined,
  );

  const rawIp = req.headers['x-real-ip'];
  const clientIp = typeof rawIp === 'string' ? rawIp : (req.ip || null);
  await recordAudit({
    aktor_id: req.user?.id ?? null,
    aktor_nama: req.user?.nama ?? 'Sistem ETL',
    peran: req.user?.peran ?? 'system',
    modul: 'etl',
    aksi: 'SYNC_SOURCE',
    target_id: result.source_id,
    diff: {
      method: 'file_import',
      file_type: fileType,
      file_name: file.originalname,
      total_rows: result.total_rows,
      accepted: result.accepted,
      rejected: result.rejected,
    },
    ip: clientIp,
  });

  respond(res, 200, {
    source_id: result.source_id,
    status: result.status,
    total_rows: result.total_rows,
    accepted: result.accepted,
    rejected: result.rejected,
    errors: result.errors ?? [],
  });
}
