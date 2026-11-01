export class MediaMetadataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaMetadataError';
  }
}

const MARKER_SOI = 0xd8;
const MARKER_EOI = 0xd9;
const MARKER_SOS = 0xda;
const JPEG_DROP_MARKERS = new Set([0xe1, 0xed, 0xfe]);

export function stripJpegMetadata(buf: Buffer): Buffer {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== MARKER_SOI) {
    throw new MediaMetadataError('Berkas bukan JPEG yang valid');
  }

  const parts: Buffer[] = [buf.subarray(0, 2)];
  let i = 2;

  while (i < buf.length) {
    if (buf[i] !== 0xff) {
      throw new MediaMetadataError('Struktur marker JPEG tidak valid');
    }

    let m = i + 1;
    while (m < buf.length && buf[m] === 0xff) m += 1;
    if (m >= buf.length) {
      throw new MediaMetadataError('Marker JPEG terpotong');
    }

    const marker = buf[m];

    const standalone = (marker >= 0xd0 && marker <= 0xd9) || marker === 0x01;
    if (standalone) {
      parts.push(buf.subarray(i, m + 1));
      i = m + 1;
      if (marker === MARKER_EOI) {
        if (i < buf.length) parts.push(buf.subarray(i));
        i = buf.length;
      }
      continue;
    }

    if (marker === MARKER_SOS) {
      parts.push(buf.subarray(i));
      i = buf.length;
      break;
    }

    const lenOffset = m + 1;
    if (lenOffset + 2 > buf.length) {
      throw new MediaMetadataError('Panjang segmen JPEG terpotong');
    }
    const segLength = buf.readUInt16BE(lenOffset);
    if (segLength < 2) {
      throw new MediaMetadataError('Panjang segmen JPEG tidak valid');
    }
    const segEnd = lenOffset + segLength;
    if (segEnd > buf.length) {
      throw new MediaMetadataError('Segmen JPEG melewati akhir berkas');
    }

    if (!JPEG_DROP_MARKERS.has(marker)) {
      parts.push(buf.subarray(i, segEnd));
    }
    i = segEnd;
  }

  return Buffer.concat(parts);
}

interface Mp4Box {
  type: string;
  start: number;
  headerSize: number;
  size: number;
}

const MP4_DESCEND = new Set(['trak', 'mdia', 'minf', 'stbl', 'edts', 'mvex']);

function readMp4Boxes(buf: Buffer, start: number, end: number): Mp4Box[] {
  const boxes: Mp4Box[] = [];
  let i = start;

  while (i + 8 <= end) {
    let size = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    let headerSize = 8;

    if (size === 1) {
      if (i + 16 > end) throw new MediaMetadataError(`Box ${type} terpotong`);
      const large = buf.readBigUInt64BE(i + 8);
      if (large > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new MediaMetadataError(`Ukuran box ${type} di luar jangkauan`);
      }
      size = Number(large);
      headerSize = 16;
    } else if (size === 0) {
      size = end - i;
    }

    if (size < headerSize || i + size > end) {
      throw new MediaMetadataError(`Box ${type} memiliki ukuran tidak valid`);
    }

    boxes.push({ type, start: i, headerSize, size });
    i += size;
  }

  if (i !== end) {
    throw new MediaMetadataError('Terdapat byte sisa yang tidak membentuk box MP4');
  }

  return boxes;
}

function buildMp4Box(type: string, body: Buffer): Buffer {
  const size = body.length + 8;
  if (size > 0xffffffff) {
    throw new MediaMetadataError(`Box ${type} melebihi batas 4 GB`);
  }
  const head = Buffer.alloc(8);
  head.writeUInt32BE(size, 0);
  head.write(type, 4, 'latin1');
  return Buffer.concat([head, body]);
}

interface BoxListResult {
  buffer: Buffer;
  changed: boolean;
}

function processBoxList(buf: Buffer, start: number, end: number, insideMoov: boolean): BoxListResult {
  const boxes = readMp4Boxes(buf, start, end);
  const parts: Buffer[] = [];
  let changed = false;

  for (const box of boxes) {
    if (insideMoov && box.type === 'udta') {
      changed = true;
      continue;
    }

    const shouldDescend = box.type === 'moov' || (insideMoov && MP4_DESCEND.has(box.type));

    if (!shouldDescend) {
      parts.push(buf.subarray(box.start, box.start + box.size));
      continue;
    }

    const inner = processBoxList(buf, box.start + box.headerSize, box.start + box.size, true);
    if (inner.changed) {
      parts.push(buildMp4Box(box.type, inner.buffer));
      changed = true;
    } else {
      parts.push(buf.subarray(box.start, box.start + box.size));
    }
  }

  return { buffer: Buffer.concat(parts), changed };
}

export function stripMp4Metadata(buf: Buffer): Buffer {
  if (buf.length < 8) {
    throw new MediaMetadataError('Berkas MP4 terlalu pendek');
  }

  const top = readMp4Boxes(buf, 0, buf.length);
  if (!top.some((b) => b.type === 'moov')) {
    throw new MediaMetadataError('Struktur MP4 tidak dikenali (moov tidak ditemukan)');
  }

  const result = processBoxList(buf, 0, buf.length, false);
  return result.changed ? result.buffer : buf;
}

export function stripMediaMetadata(buf: Buffer, mimetype: string): Buffer {
  switch (mimetype) {
    case 'image/jpeg':
      return stripJpegMetadata(buf);
    case 'video/mp4':
      return stripMp4Metadata(buf);
    default:
      throw new MediaMetadataError(`Tipe media tidak didukung: ${mimetype}`);
  }
}
