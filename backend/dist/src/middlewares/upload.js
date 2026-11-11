import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import multer, { MulterError } from 'multer';
import { HttpError } from '../helpers/http.js';
import { MediaMetadataError, stripMediaMetadata } from '../helpers/media-metadata.js';
const ETL_ALLOWED_MIME = {
    'text/csv': 'csv',
    'text/plain': 'csv',
    'application/csv': 'csv',
    'application/json': 'json',
    'text/json': 'json',
};
const ETL_MAX_SIZE = 10 * 1024 * 1024;
const ETL_FILE_FIELD = 'file';
const etlStorage = multer.memoryStorage();
function etlFileFilter(_req, file, cb) {
    if (ETL_ALLOWED_MIME[file.mimetype]) {
        cb(null, true);
        return;
    }
    cb(new HttpError(400, `Tipe file tidak didukung. Hanya CSV dan JSON yang diizinkan (dapat: ${file.mimetype})`));
}
const etlUploader = multer({
    storage: etlStorage,
    fileFilter: etlFileFilter,
    limits: { fileSize: ETL_MAX_SIZE, files: 1 },
});
const etlMulterHandler = etlUploader.single(ETL_FILE_FIELD);
export function uploadEtlFile(req, res, next) {
    etlMulterHandler(req, res, (err) => {
        if (err) {
            if (err instanceof MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    next(new HttpError(400, 'Ukuran file melebihi batas maksimal 10 MB'));
                    return;
                }
                next(new HttpError(400, `Upload gagal: ${err.message}`));
                return;
            }
            if (err instanceof HttpError) {
                next(err);
                return;
            }
            next(new HttpError(400, err instanceof Error ? err.message : 'Upload gagal'));
            return;
        }
        if (!req.file) {
            next(new HttpError(400, `File wajib diunggah pada field "${ETL_FILE_FIELD}"`));
            return;
        }
        next();
    });
}
export function getEtlFileType(file) {
    return ETL_ALLOWED_MIME[file.mimetype] ?? 'csv';
}
export const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
export const REPORT_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'reports');
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES = 5;
export const REPORT_MEDIA_FIELD = 'media';
const ALLOWED_MIME = {
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
function fileFilter(_req, file, cb) {
    if (ALLOWED_MIME[file.mimetype]) {
        cb(null, true);
        return;
    }
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
function translateMulterError(err) {
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
async function sanitizeReportMedia(files) {
    for (const file of files) {
        const tmpPath = `${file.path}.strip`;
        try {
            const raw = await readFile(file.path);
            const clean = stripMediaMetadata(raw, file.mimetype);
            if (clean.length === raw.length && clean.equals(raw))
                continue;
            await writeFile(tmpPath, clean);
            await rename(tmpPath, file.path);
            file.size = clean.length;
        }
        catch (err) {
            await unlink(tmpPath).catch(() => undefined);
            await Promise.all(files.map((f) => unlink(f.path).catch(() => undefined)));
            const reason = err instanceof MediaMetadataError ? err.message : 'metadata tidak dapat dibersihkan';
            throw new HttpError(400, `Media "${file.originalname}" ditolak: ${reason}`);
        }
    }
}
export function uploadReportMedia(req, res, next) {
    multerHandler(req, res, (err) => {
        if (err) {
            if (err instanceof MulterError) {
                next(translateMulterError(err));
                return;
            }
            if (err instanceof HttpError) {
                next(err);
                return;
            }
            next(new HttpError(400, err instanceof Error ? err.message : 'Upload gagal'));
            return;
        }
        const files = req.files ?? [];
        sanitizeReportMedia(files)
            .then(() => next())
            .catch((stripErr) => next(stripErr));
    });
}
export function mediaFilesToUrls(files) {
    if (!files || files.length === 0)
        return [];
    return files.map((f) => `/uploads/reports/${f.filename}`);
}
export function requireReportMedia(req, _res, next) {
    const files = req.files;
    if (!files || files.length === 0) {
        next(new HttpError(400, `Minimal 1 file media (foto/video) wajib diunggah pada field "${REPORT_MEDIA_FIELD}"`));
        return;
    }
    next();
}
