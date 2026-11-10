import type { Request, Response } from 'express';
import {
  createRabItem,
  updateRabItemById,
  deleteRabItemById,
} from '../services/rab-items.js';
import {
  createPayment,
  updatePaymentById,
  deletePaymentById,
} from '../services/financials.js';
import {
  createProgress,
  updateProgressById,
  deleteProgressById,
} from '../services/progress.js';
import { respond } from '../middlewares/response.js';
import { invalidateCache } from '../middlewares/cache.js';
import { recordAudit } from '../helpers/audit.js';
import type {
  CreateRabItemInput,
  UpdateRabItemInput,
  CreatePaymentInput,
  UpdatePaymentInput,
  CreateProgressInput,
  UpdateProgressInput,
} from '../utils/validators/project-execution.js';

function getAuditContext(req: Request) {
  const rawIp = req.headers['x-real-ip'];
  return {
    actor: {
      id: req.user?.id ?? '',
      nama: req.user?.nama ?? 'Unknown',
      peran: req.user?.peran ?? 'system',
    },
    ip: typeof rawIp === 'string' ? rawIp : (req.ip || null),
  };
}

export async function createRabItemHandler(req: Request, res: Response): Promise<void> {
  const projectId = typeof req.params.id === 'string' ? req.params.id : '';
  const body = req.body as CreateRabItemInput;
  const ctx = getAuditContext(req);

  const result = await createRabItem(projectId, body);

  await recordAudit({
    aktor_id: ctx.actor.id || null,
    aktor_nama: ctx.actor.nama,
    peran: ctx.actor.peran,
    modul: 'proyek',
    aksi: 'CREATE_RAB_ITEM',
    target_id: result.rab_item.id,
    diff: {
      proyek_id: projectId,
      uraian: result.rab_item.uraian,
      volume: result.rab_item.volume,
      harga_satuan: result.rab_item.harga_satuan,
      skor_sesudah: result.scoring.skor_total,
    },
    ip: ctx.ip,
  });

  invalidateCache('projects', 'stats');
  respond(res, 201, { ...result });
}

export async function updateRabItemHandler(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const body = req.body as UpdateRabItemInput;
  const ctx = getAuditContext(req);

  const result = await updateRabItemById(id, body);

  await recordAudit({
    aktor_id: ctx.actor.id || null,
    aktor_nama: ctx.actor.nama,
    peran: ctx.actor.peran,
    modul: 'proyek',
    aksi: 'UPDATE_RAB_ITEM',
    target_id: id,
    diff: {
      changes: body,
      skor_sesudah: result.scoring.skor_total,
    },
    ip: ctx.ip,
  });

  invalidateCache('projects', 'stats');
  respond(res, 200, { ...result });
}

export async function deleteRabItemHandler(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const ctx = getAuditContext(req);

  const result = await deleteRabItemById(id);

  await recordAudit({
    aktor_id: ctx.actor.id || null,
    aktor_nama: ctx.actor.nama,
    peran: ctx.actor.peran,
    modul: 'proyek',
    aksi: 'DELETE_RAB_ITEM',
    target_id: id,
    diff: {
      uraian: result.deleted.uraian,
      skor_sesudah: result.scoring.skor_total,
    },
    ip: ctx.ip,
  });

  invalidateCache('projects', 'stats');
  respond(res, 200, { ...result });
}

export async function createPaymentHandler(req: Request, res: Response): Promise<void> {
  const projectId = typeof req.params.id === 'string' ? req.params.id : '';
  const body = req.body as CreatePaymentInput;
  const ctx = getAuditContext(req);

  const result = await createPayment(projectId, body);

  await recordAudit({
    aktor_id: ctx.actor.id || null,
    aktor_nama: ctx.actor.nama,
    peran: ctx.actor.peran,
    modul: 'proyek',
    aksi: 'CREATE_PAYMENT',
    target_id: result.pembayaran.id,
    diff: {
      proyek_id: projectId,
      termin_ke: result.pembayaran.termin_ke,
      jumlah: result.pembayaran.jumlah,
      persen_kontrak: result.pembayaran.persen_kontrak,
      skor_sesudah: result.scoring.skor_total,
    },
    ip: ctx.ip,
  });

  invalidateCache('projects', 'stats');
  respond(res, 201, { ...result });
}

export async function updatePaymentHandler(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const body = req.body as UpdatePaymentInput;
  const ctx = getAuditContext(req);

  const result = await updatePaymentById(id, body);

  await recordAudit({
    aktor_id: ctx.actor.id || null,
    aktor_nama: ctx.actor.nama,
    peran: ctx.actor.peran,
    modul: 'proyek',
    aksi: 'UPDATE_PAYMENT',
    target_id: id,
    diff: {
      changes: body,
      skor_sesudah: result.scoring.skor_total,
    },
    ip: ctx.ip,
  });

  invalidateCache('projects', 'stats');
  respond(res, 200, { ...result });
}

export async function deletePaymentHandler(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const ctx = getAuditContext(req);

  const result = await deletePaymentById(id);

  await recordAudit({
    aktor_id: ctx.actor.id || null,
    aktor_nama: ctx.actor.nama,
    peran: ctx.actor.peran,
    modul: 'proyek',
    aksi: 'DELETE_PAYMENT',
    target_id: id,
    diff: {
      termin_ke: result.deleted.termin_ke,
      skor_sesudah: result.scoring.skor_total,
    },
    ip: ctx.ip,
  });

  invalidateCache('projects', 'stats');
  respond(res, 200, { ...result });
}

export async function createProgressHandler(req: Request, res: Response): Promise<void> {
  const projectId = typeof req.params.id === 'string' ? req.params.id : '';
  const body = req.body as CreateProgressInput;
  const ctx = getAuditContext(req);

  const result = await createProgress(projectId, body);

  await recordAudit({
    aktor_id: ctx.actor.id || null,
    aktor_nama: ctx.actor.nama,
    peran: ctx.actor.peran,
    modul: 'proyek',
    aksi: 'CREATE_PROGRESS',
    target_id: result.progres.id,
    diff: {
      proyek_id: projectId,
      tanggal: result.progres.tanggal,
      persen_fisik: result.progres.persen_fisik,
      skor_sesudah: result.scoring.skor_total,
    },
    ip: ctx.ip,
  });

  invalidateCache('projects', 'stats');
  respond(res, 201, { ...result });
}

export async function updateProgressHandler(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const body = req.body as UpdateProgressInput;
  const ctx = getAuditContext(req);

  const result = await updateProgressById(id, body);

  await recordAudit({
    aktor_id: ctx.actor.id || null,
    aktor_nama: ctx.actor.nama,
    peran: ctx.actor.peran,
    modul: 'proyek',
    aksi: 'UPDATE_PROGRESS',
    target_id: id,
    diff: {
      changes: body,
      skor_sesudah: result.scoring.skor_total,
    },
    ip: ctx.ip,
  });

  invalidateCache('projects', 'stats');
  respond(res, 200, { ...result });
}

export async function deleteProgressHandler(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const ctx = getAuditContext(req);

  const result = await deleteProgressById(id);

  await recordAudit({
    aktor_id: ctx.actor.id || null,
    aktor_nama: ctx.actor.nama,
    peran: ctx.actor.peran,
    modul: 'proyek',
    aksi: 'DELETE_PROGRESS',
    target_id: id,
    diff: {
      persen_fisik: result.deleted.persen_fisik,
      skor_sesudah: result.scoring.skor_total,
    },
    ip: ctx.ip,
  });

  invalidateCache('projects', 'stats');
  respond(res, 200, { ...result });
}
