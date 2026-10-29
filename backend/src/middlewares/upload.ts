import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import { HttpError } from '../helpers/http.js';

export const UPLOAD_ROOT: string = path.resolve(process.cwd(), 'uploads');
export const REPORT_UPLOAD_DIR: string = path.join(UPLOAD_ROOT, 'reports');

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per file
export const MAX_FILES = 5;
export const REPORT_MEDIA_FIELD = 'media';

/** MIME yang diizinkan dipetakan ke ekstensi kanonikalnya. */
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'video/mp4': '.mp4',
};

if (!existsSync(REPORT_UPLOAD_DIR)) {
  mkdirSync(REPORT_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, REPORT_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME[file.mimetype] ?? '';
    const name = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (ALLOWED_MIME[file.mimetype]) {
    cb(null, true);
    return;
  }
  // Pesan ditangkap oleh wrapper di bawah dan diubah ke HttpError 400.
  cb(new HttpError(400, 'Tipe file tidak didukung. Hanya JPG (image/jpeg) dan MP4 (video/mp4) yang diizinkan'));
}

const uploader = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILES,
  },
});

const multerHandler = uploader.array(REPORT_MEDIA_FIELD, MAX_FILES);

/** Terjemahkan MulterError ke HttpError dengan pesan ramah pengguna. */
function translateMulterError(err: MulterError): HttpError {
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return new HttpError(400, 'Ukuran file melebihi batas maksimal 5 MB');
    case 'LIMIT_FILE_COUNT':
      return new HttpError(400, `Jumlah file melebihi batas maksimal ${MAX_FILES} file`);
    case 'LIMIT_UNEXPECTED_FILE':
      return new HttpError(400, `Field file tidak sesuai. Gunakan field "${REPORT_MEDIA_FIELD}"`);
    default:
      return new HttpError(400, `Upload gagal: ${err.message}`);
  }
}

/**
 * Middleware upload media laporan (field `media`, maksimal 5 file).
 * Menerima request multipart/form-data; file tersedia di `req.files`,
 * field teks lain tetap di `req.body`.
 */
export function uploadReportMedia(req: Request, res: Response, next: NextFunction): void {
  multerHandler(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof MulterError) {
      next(translateMulterError(err));
      return;
    }
    if (err instanceof HttpError) {
      next(err);
      return;
    }
    next(new HttpError(400, err instanceof Error ? err.message : 'Upload gagal'));
  });
}

/** Ubah daftar file hasil multer menjadi URL publik `/uploads/reports/<nama>`. */
export function mediaFilesToUrls(files: Express.Multer.File[] | undefined): string[] {
  if (!files || files.length === 0) return [];
  return files.map((f) => `/uploads/reports/${f.filename}`);
}

/** Pastikan minimal 1 file media diunggah; jika tidak → HttpError(400). */
export function requireReportMedia(req: Request, _res: Response, next: NextFunction): void {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    next(new HttpError(400, `Minimal 1 file media (foto/video) wajib diunggah pada field "${REPORT_MEDIA_FIELD}"`));
    return;
  }
  next();
}
