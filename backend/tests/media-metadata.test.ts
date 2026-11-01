import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MediaMetadataError,
  stripJpegMetadata,
  stripMp4Metadata,
  stripMediaMetadata,
} from '../src/helpers/media-metadata.js';

function jpegSegment(marker: number, payload: Buffer): Buffer {
  const head = Buffer.from([0xff, marker, 0x00, 0x00]);
  head.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([head, payload]);
}

function buildJpeg(): Buffer {
  const app0 = jpegSegment(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1'));
  const app1 = jpegSegment(
    0xe1,
    Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), Buffer.from('GPSLatitude\0N\0', 'latin1')]),
  );
  const com = jpegSegment(0xfe, Buffer.from('Copyright: Budi - Samsung - 2026', 'latin1'));
  const sof0 = jpegSegment(0xc0, Buffer.from([8, 0, 8, 0, 8, 3, 1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0]));
  const sos = jpegSegment(0xda, Buffer.from([1, 1, 0, 0, 63, 0]));
  const scan = Buffer.from([0x12, 0x34, 0xff, 0x00, 0x56, 0x78]);
  const eoi = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, app1, com, sof0, sos, scan, eoi]);
}

function mp4Box(type: string, body: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length + 8, 0);
  head.write(type, 4, 'latin1');
  return Buffer.concat([head, body]);
}

function buildMp4(options: { withUdta?: boolean } = {}): Buffer {
  const withUdta = options.withUdta ?? true;
  const gps = Buffer.from('\u00a9xyz+01.2345+005.6789/', 'latin1');
  const ftyp = mp4Box('ftyp', Buffer.from('isom\0\0\x02\0isomiso2avc1mp41', 'latin1'));
  const mvhd = mp4Box('mvhd', Buffer.alloc(100, 0));
  const trak = mp4Box('trak', withUdta ? mp4Box('udta', gps) : mp4Box('mdia', Buffer.alloc(8, 0)));
  const moovParts = [mvhd, trak];
  if (withUdta) moovParts.push(mp4Box('udta', gps));
  const moov = mp4Box('moov', Buffer.concat(moovParts));
  const mdat = mp4Box('mdat', Buffer.from([1, 2, 3, 4, 5, 6]));
  return Buffer.concat([ftyp, moov, mdat]);
}

function assertBoxesConsistent(buf: Buffer): string[] {
  const types: string[] = [];
  let i = 0;
  while (i + 8 <= buf.length) {
    const size = buf.readUInt32BE(i);
    assert.ok(size >= 8, `ukuran box di offset ${i} tidak valid: ${size}`);
    assert.ok(i + size <= buf.length, `box di offset ${i} melewati akhir berkas`);
    types.push(buf.toString('latin1', i + 4, i + 8));
    i += size;
  }
  assert.equal(i, buf.length, 'terdapat byte sisa yang bukan bagian box');
  return types;
}

test('JPEG: APP1 (EXIF/GPS) dan COM dibuang, APP0 & data gambar utuh', () => {
  const original = buildJpeg();
  const clean = stripJpegMetadata(original);

  assert.ok(clean.length < original.length, 'berkas harus lebih kecil setelah strip');
  assert.ok(!clean.includes(Buffer.from([0xff, 0xe1])), 'segmen APP1 (EXIF/GPS) harus hilang');
  assert.ok(!clean.includes(Buffer.from([0xff, 0xfe])), 'segmen COM harus hilang');
  assert.ok(!clean.includes(Buffer.from('Copyright', 'latin1')), 'teks komentar harus hilang');
  assert.ok(!clean.includes(Buffer.from('GPSLatitude', 'latin1')), 'payload GPS harus hilang');
  assert.ok(clean.includes(Buffer.from([0xff, 0xe0])), 'APP0/JFIF harus dipertahankan');

  assert.equal(clean[0], 0xff);
  assert.equal(clean[1], 0xd8);
  assert.equal(clean[clean.length - 2], 0xff);
  assert.equal(clean[clean.length - 1], 0xd9);

  assert.ok(clean.includes(Buffer.from([0x12, 0x34, 0xff, 0x00, 0x56, 0x78])), 'data scan harus utuh');
});

test('JPEG: berkas tanpa metadata tidak berubah isinya', () => {
  const original = buildJpeg();
  const clean = stripJpegMetadata(original);
  const cleanTwice = stripJpegMetadata(clean);
  assert.deepEqual(cleanTwice, clean, 'strip kedua tidak boleh mengubah apa pun');
});

test('JPEG: berkas bukan JPEG ditolak', () => {
  assert.throws(() => stripJpegMetadata(Buffer.from('bukan jpeg sama sekali')), MediaMetadataError);
});

test('MP4: box udta (GPS ©xyz) dibuang di semua kedalaman, struktur tetap valid', () => {
  const original = buildMp4();
  const clean = stripMp4Metadata(original);

  assert.ok(clean.length < original.length, 'berkas harus lebih kecil setelah strip');
  assert.ok(!clean.includes(Buffer.from('udta', 'latin1')), 'box udta harus hilang (termasuk di dalam trak)');
  assert.ok(!clean.includes(Buffer.from('\u00a9xyz', 'latin1')), 'tag GPS ©xyz harus hilang');

  const types = assertBoxesConsistent(clean);
  assert.deepEqual(types, ['ftyp', 'moov', 'mdat']);
  assert.ok(clean.includes(Buffer.from([1, 2, 3, 4, 5, 6])), 'isi mdat harus utuh');
});

test('MP4: berkas tanpa udta dikembalikan apa adanya', () => {
  const original = buildMp4({ withUdta: false });
  const clean = stripMp4Metadata(original);
  assert.equal(clean, original, 'buffer asli dikembalikan tanpa alokasi baru');
});

test('MP4: struktur tanpa moov ditolak', () => {
  const broken = mp4Box('ftyp', Buffer.from('isom', 'latin1'));
  assert.throws(() => stripMp4Metadata(broken), MediaMetadataError);
});

test('MP4: berkas terpotong ditolak', () => {
  const truncated = buildMp4().subarray(0, 40);
  assert.throws(() => stripMp4Metadata(truncated), MediaMetadataError);
});

test('stripMediaMetadata memilih parser sesuai MIME dan menolak tipe lain', () => {
  assert.ok(stripMediaMetadata(buildJpeg(), 'image/jpeg').length > 0);
  assert.ok(stripMediaMetadata(buildMp4(), 'video/mp4').length > 0);
  assert.throws(() => stripMediaMetadata(buildJpeg(), 'image/png'), MediaMetadataError);
});
