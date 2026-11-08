import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import app from '../app.js';
import pool from '../src/config/database.js';
import redisClient, { connectRedis } from '../src/config/redis.js';
import {
  calculateMatchScore,
  getUnmatchedWithCandidates,
  processMatchDecision,
} from '../src/services/matching.js';
import { findMatchCandidates } from '../src/repositories/matching.js';
import { HttpError } from '../src/helpers/http.js';
import { signToken } from '../src/helpers/jwt.js';

const TEST_URL = 'https://example.test/matching';
const ADMIN_EMAIL = 'matching-admin-test@clearsight.id';
const VERIFIER_EMAIL = 'matching-verifier-test@clearsight.id';
const ADMIN_NAME = 'Test Matching Admin';
const VERIFIER_NAME = 'Test Matching Verifier';
let kodeBps = '1871';

interface ProjectFixture {
  code: string;
  source: string;
  status?: string;
  score?: number | null;
  tender?: string | null;
  name?: string;
}

async function cleanupTestRows(): Promise<void> {
  await pool.query(
    `DELETE FROM log_audit WHERE aktor_nama = ANY($1::text[]) AND modul = 'etl'`,
    [[ADMIN_NAME, VERIFIER_NAME]],
  );
  await pool.query('DELETE FROM pengguna WHERE surel = ANY($1::text[])', [
    [ADMIN_EMAIL, VERIFIER_EMAIL],
  ]);
  await pool.query(
    `DELETE FROM proyek_pencocokan pair
      USING proyek project
     WHERE (pair.proyek_id = project.id OR pair.pasangan_id = project.id)
       AND project.kode_rup LIKE 'TEST-MATCH-%'`,
  );
  await pool.query("DELETE FROM proyek WHERE kode_rup LIKE 'TEST-MATCH-%'");
}

async function insertProject(fixture: ProjectFixture): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO proyek (
       kode_rup, kode_tender, nama, dinas, kode_bps, tahun_anggaran, pagu,
       source_id, source_url, fetched_at, match_status, skor_total, kategori
     ) VALUES ($1, $2, $3, 'Dinas Test', $4, 2025, 1000000000,
               $5, $6, now(), $7, $8, $9)
     RETURNING id`,
    [
      fixture.code,
      fixture.tender ?? null,
      fixture.name ?? fixture.code,
      kodeBps,
      fixture.source,
      TEST_URL,
      fixture.status ?? 'unmatched',
      fixture.score ?? null,
      fixture.score === undefined || fixture.score === null ? null : 'Rendah',
    ],
  );
  return result.rows[0].id;
}

async function createUser(email: string, name: string, role: string): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO pengguna (nama, surel, kata_sandi_hash, peran, aktif)
     VALUES ($1, $2, 'dummy_hash', $3, true)
     RETURNING id`,
    [name, email, role],
  );
  return result.rows[0].id;
}

before(async () => {
  await cleanupTestRows();
  const region = await pool.query<{ kode_bps: string }>('SELECT kode_bps FROM wilayah LIMIT 1');
  kodeBps = region.rows[0]?.kode_bps ?? '1871';
});

after(async () => {
  await cleanupTestRows();
  if (redisClient.isOpen) await redisClient.quit();
  await pool.end();
});

test('calculateMatchScore: nama identik, dinas dan pagu sama menghasilkan skor tinggi', () => {
  const a = { nama: 'Pembangunan Jalan Sudirman', dinas: 'Dinas PUPR', pagu: '1000000000' };
  const b = { nama: 'Pembangunan Jalan Sudirman', dinas: 'Dinas PUPR', pagu: '1000000000' };
  assert.ok(calculateMatchScore(a, b) > 80);
});

test('calculateMatchScore: dinas berbeda menghasilkan skor lebih rendah', () => {
  const a = { nama: 'Pembangunan Jalan Sudirman', dinas: 'Dinas PUPR', pagu: '1000000000' };
  const identical = calculateMatchScore(a, {
    nama: 'Pembangunan Jalan Sudirman',
    dinas: 'Dinas PUPR',
    pagu: '1000000000',
  });
  const differentDinas = calculateMatchScore(a, {
    nama: 'Pembangunan Jalan Sudirman',
    dinas: 'Dinas Perhubungan',
    pagu: '1000000000',
  });
  assert.ok(differentDinas < identical);
});

test('calculateMatchScore: nama mirip dengan dinas dan pagu berbeda menghasilkan skor menengah', () => {
  const score = calculateMatchScore(
    { nama: 'Pembangunan Jalan Sudirman Kota', dinas: 'Dinas PUPR', pagu: '1000000000' },
    { nama: 'Pembangunan Jalan Sudirman Kabupaten', dinas: 'Dinas Perhubungan', pagu: '850000000' },
  );
  assert.ok(score >= 20 && score < 70);
});

test('calculateMatchScore: proyek sepenuhnya berbeda menghasilkan skor rendah', () => {
  const score = calculateMatchScore(
    { nama: 'Pembangunan Jalan Sudirman', dinas: 'Dinas PUPR', pagu: '1000000000' },
    { nama: 'Pengadaan Meja Kantor', dinas: 'Dinas Kesehatan', pagu: '50000000' },
  );
  assert.ok(score < 20);
});

test('matching: kandidat hanya unmatched lintas sumber dan not_match disimpan permanen', async () => {
  const first = await insertProject({
    code: 'TEST-MATCH-FILTER-A',
    source: 'SRC-01',
    name: 'Proyek Filter A',
    tender: 'TEST-MATCH-FILTER-TENDER',
  });
  const sameSource = await insertProject({
    code: 'TEST-MATCH-FILTER-SAME',
    source: 'SRC-01',
    name: 'Proyek Filter B',
  });
  const other = await insertProject({
    code: 'TEST-MATCH-FILTER-OTHER',
    source: 'SRC-06',
    name: 'Proyek Filter C',
    tender: 'TEST-MATCH-FILTER-TENDER',
  });
  const matched = await insertProject({
    code: 'TEST-MATCH-FILTER-MATCHED',
    source: 'SRC-05',
    status: 'matched',
  });
  const rejected = await insertProject({
    code: 'TEST-MATCH-FILTER-REJECTED',
    source: 'SRC-04',
  });

  await assert.rejects(
    processMatchDecision({ unmatched_id: first, matched_id: sameSource, decision: 'match' }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 400);
      return true;
    },
  );
  await processMatchDecision({ unmatched_id: first, matched_id: rejected, decision: 'not_match' });
  await processMatchDecision({ unmatched_id: rejected, matched_id: first, decision: 'not_match' });

  const candidates = await findMatchCandidates(first);
  const fixtureIds = [other, sameSource, rejected, matched];
  const fixtureCandidates = candidates.filter((candidate) => fixtureIds.includes(candidate.id));
  const unmatchedResponse = await getUnmatchedWithCandidates({ limit: '100', offset: '0' });
  const listed = unmatchedResponse.rows.find((row) => row.project.id === first);
  if (!listed) assert.fail('proyek fixture harus masuk daftar unmatched');
  const otherCandidate = listed.candidates.find((candidate) => candidate.id === other);
  const pair = await pool.query<{ keputusan: string; count: string }>(
    `SELECT keputusan, COUNT(*) OVER() AS count
       FROM proyek_pencocokan
      WHERE (proyek_id = $1 AND pasangan_id = $2)
         OR (proyek_id = $2 AND pasangan_id = $1)`,
    [first, rejected],
  );
  const statuses = await pool.query<{ match_status: string }>(
    'SELECT match_status FROM proyek WHERE id = ANY($1::uuid[]) ORDER BY id',
    [[first, rejected]],
  );

  assert.equal(fixtureCandidates.length, 1);
  assert.equal(fixtureCandidates[0].id, other);
  assert.ok(otherCandidate);
  assert.equal(otherCandidate.skor, 100);
  assert.ok(
    listed.candidates.every((candidate, index) =>
      index === 0 ? true : listed.candidates[index - 1].skor >= candidate.skor,
    ),
  );
  assert.equal(pair.rows.length, 1);
  assert.equal(pair.rows[0].count, '1');
  assert.equal(pair.rows[0].keputusan, 'not_match');
  assert.ok(statuses.rows.every((row) => row.match_status === 'unmatched'));

  await assert.rejects(
    processMatchDecision({ unmatched_id: first, matched_id: rejected, decision: 'match' }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 400);
      return true;
    },
  );
});

test('matching: self-match, UUID hilang, dan sumber sama ditolak tanpa relasi', async () => {
  const first = await insertProject({ code: 'TEST-MATCH-INVALID-A', source: 'SRC-01' });
  const sameSource = await insertProject({ code: 'TEST-MATCH-INVALID-B', source: 'SRC-01' });

  for (const input of [
    { unmatched_id: first, matched_id: first, decision: 'match' as const, status: 400 },
    {
      unmatched_id: first,
      matched_id: '00000000-0000-4000-8000-000000000999',
      decision: 'match' as const,
      status: 404,
    },
    { unmatched_id: first, matched_id: sameSource, decision: 'match' as const, status: 400 },
  ]) {
    await assert.rejects(processMatchDecision(input), (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, input.status);
      return true;
    });
  }

  const pairs = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM proyek_pencocokan
      WHERE proyek_id = ANY($1::uuid[]) OR pasangan_id = ANY($1::uuid[])`,
    [[first, sameSource]],
  );
  assert.equal(pairs.rows[0].count, '0');
});

test('matching: match menyimpan canonical pair, mengubah dua status, dan menjaga skor', async () => {
  const first = await insertProject({
    code: 'TEST-MATCH-SUCCESS-A',
    source: 'SRC-01',
    score: 73,
  });
  const second = await insertProject({
    code: 'TEST-MATCH-SUCCESS-B',
    source: 'SRC-06',
    score: 38,
  });
  const third = await insertProject({ code: 'TEST-MATCH-SUCCESS-C', source: 'SRC-05' });

  const eligibleBefore = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM proyek
      WHERE id = ANY($1::uuid[]) AND (match_status = 'unmatched' OR match_status IS NULL)`,
    [[first, second]],
  );
  await processMatchDecision({ unmatched_id: first, matched_id: second, decision: 'match' });
  await processMatchDecision({ unmatched_id: second, matched_id: first, decision: 'match' });

  const projects = await pool.query<{
    id: string;
    match_status: string;
    skor_total: string;
    kategori: string;
  }>('SELECT id, match_status, skor_total, kategori FROM proyek WHERE id = ANY($1::uuid[])', [
    [first, second],
  ]);
  const pair = await pool.query<{
    proyek_id: string;
    pasangan_id: string;
    keputusan: string;
    count: string;
  }>(
    `SELECT proyek_id, pasangan_id, keputusan, COUNT(*) OVER() AS count
       FROM proyek_pencocokan
      WHERE (proyek_id = $1 AND pasangan_id = $2)
         OR (proyek_id = $2 AND pasangan_id = $1)`,
    [first, second],
  );
  const eligibleAfter = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM proyek
      WHERE id = ANY($1::uuid[]) AND (match_status = 'unmatched' OR match_status IS NULL)`,
    [[first, second]],
  );

  assert.equal(eligibleBefore.rows[0].count, '2');
  assert.equal(eligibleAfter.rows[0].count, '0');
  assert.ok(projects.rows.every((row) => row.match_status === 'matched'));
  assert.deepEqual(
    projects.rows.map((row) => [row.skor_total, row.kategori]).sort(),
    [
      ['38', 'Rendah'],
      ['73', 'Rendah'],
    ],
  );
  assert.equal(pair.rows[0].count, '1');
  assert.equal(pair.rows[0].keputusan, 'matched');
  assert.ok(pair.rows[0].proyek_id < pair.rows[0].pasangan_id);

  await assert.rejects(
    processMatchDecision({ unmatched_id: first, matched_id: third, decision: 'match' }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 400);
      return true;
    },
  );
});

test('matching HTTP: anon 401, verifikator 403, invalid tanpa audit, admin 200 dan satu audit', async () => {
  const first = await insertProject({ code: 'TEST-MATCH-HTTP-A', source: 'SRC-01' });
  const second = await insertProject({ code: 'TEST-MATCH-HTTP-B', source: 'SRC-06' });
  const adminId = await createUser(ADMIN_EMAIL, ADMIN_NAME, 'admin');
  const verifierId = await createUser(VERIFIER_EMAIL, VERIFIER_NAME, 'verifikator');
  const adminToken = signToken({ sub: adminId, surel: ADMIN_EMAIL, peran: 'admin', nama: ADMIN_NAME });
  const verifierToken = signToken({
    sub: verifierId,
    surel: VERIFIER_EMAIL,
    peran: 'verifikator',
    nama: VERIFIER_NAME,
  });

  if (!redisClient.isOpen) await connectRedis();
  assert.equal(redisClient.isReady, true);
  const versionBefore = Number((await redisClient.get('cache:ver:projects')) ?? '0');
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const address = server.address() as AddressInfo;
    const endpoint = `http://127.0.0.1:${address.port}/api/admin/etl/match`;
    const post = async (body: unknown, token?: string) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      return { status: response.status, payload };
    };

    const validBody = { unmatched_id: first, matched_id: second, decision: 'match' };
    const anon = await post(validBody);
    const verifier = await post(validBody, verifierToken);
    const self = await post({ ...validBody, matched_id: first }, adminToken);
    const missing = await post(
      { ...validBody, matched_id: '00000000-0000-4000-8000-000000000999' },
      adminToken,
    );
    const auditBefore = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM log_audit
        WHERE aktor_nama = $1 AND modul = 'etl' AND aksi = 'MATCH_DECISION'`,
      [ADMIN_NAME],
    );
    const success = await post(validBody, adminToken);
    const auditAfter = await pool.query<{ count: string; target_id: string }>(
      `SELECT COUNT(*) OVER() AS count, target_id
         FROM log_audit
        WHERE aktor_nama = $1 AND modul = 'etl' AND aksi = 'MATCH_DECISION'`,
      [ADMIN_NAME],
    );
    const versionAfter = Number(await redisClient.get('cache:ver:projects'));

    assert.equal(anon.status, 401);
    assert.equal(verifier.status, 403);
    assert.equal(self.status, 400);
    assert.equal(missing.status, 404);
    assert.equal(auditBefore.rows[0].count, '0');
    assert.equal(success.status, 200);
    assert.equal(auditAfter.rows.length, 1);
    assert.equal(auditAfter.rows[0].count, '1');
    assert.equal(auditAfter.rows[0].target_id, first);
    assert.equal(versionAfter, versionBefore + 1);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
