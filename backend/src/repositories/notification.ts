import pool from '../config/database.js';

export interface NotificationRow {
  id: string;
  tiket: string;
  kanal: string;
  alamat_tujuan_hash: string | null;
  status_dari: string | null;
  status_ke: string | null;
  status_kirim: string;
  percobaan: number;
  galat: string | null;
  dibuat_pada: Date;
  dikirim_pada: Date | null;
}

export async function insertNotification(input: {
  tiket: string;
  kanal: string;
  alamat_tujuan_hash: string | null;
  status_dari: string;
  status_ke: string;
}): Promise<NotificationRow> {
  const res = await pool.query<NotificationRow>(
    `INSERT INTO notifikasi (tiket, kanal, alamat_tujuan_hash, status_dari, status_ke, status_kirim)
     VALUES ($1, $2, $3, $4, $5, 'tertunda')
     RETURNING *`,
    [input.tiket, input.kanal, input.alamat_tujuan_hash, input.status_dari, input.status_ke],
  );
  return res.rows[0];
}

export async function updateNotificationStatus(
  id: string,
  status_kirim: string,
  galat?: string | null,
): Promise<void> {
  const dikirim_pada = status_kirim === 'terkirim' ? 'now()' : 'NULL';
  await pool.query(
    `UPDATE notifikasi
        SET status_kirim = $2,
            galat = $3,
            dikirim_pada = ${dikirim_pada},
            percobaan = percobaan + 1
      WHERE id = $1`,
    [id, status_kirim, galat ?? null],
  );
}

export async function getNotificationById(id: string): Promise<NotificationRow | null> {
  const res = await pool.query<NotificationRow>(
    `SELECT * FROM notifikasi WHERE id = $1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function listNotifications(filters: {
  tiket?: string;
  status_kirim?: string;
  limit: number;
  offset: number;
}): Promise<{ rows: NotificationRow[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.tiket) {
    params.push(filters.tiket);
    conditions.push(`tiket = $${params.length}`);
  }
  if (filters.status_kirim) {
    params.push(filters.status_kirim);
    conditions.push(`status_kirim = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM notifikasi ${whereClause}`,
    params,
  );
  const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

  params.push(filters.limit);
  params.push(filters.offset);
  const dataRes = await pool.query<NotificationRow>(
    `SELECT * FROM notifikasi ${whereClause}
     ORDER BY dibuat_pada DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return { rows: dataRes.rows, total };
}

export async function getReportSurel(tiket: string): Promise<string | null> {
  const res = await pool.query<{ surel_pelapor: string | null }>(
    `SELECT surel_pelapor FROM laporan_warga WHERE tiket = $1`,
    [tiket],
  );
  return res.rows[0]?.surel_pelapor ?? null;
}

export async function listNotificationsForRetention(): Promise<
  { tiket: string; nama_pelapor: Buffer | null; surel_pelapor: string | null; telepon_pelapor: Buffer | null }[]
> {
  const res = await pool.query<{
    tiket: string;
    nama_pelapor: Buffer | null;
    surel_pelapor: string | null;
    telepon_pelapor: Buffer | null;
  }>(
    `SELECT tiket, nama_pelapor, surel_pelapor, telepon_pelapor
       FROM laporan_warga
      WHERE kontak_dihapus_pada IS NULL
        AND status IN ('Selesai', 'Ditolak')
        AND diubah_pada < now() - interval '90 days'`,
  );
  return res.rows;
}

export async function clearReportContact(tiket: string): Promise<void> {
  await pool.query(
    `UPDATE laporan_warga
        SET nama_pelapor = NULL,
            surel_pelapor = NULL,
            telepon_pelapor = NULL,
            kontak_dihapus_pada = now()
      WHERE tiket = $1`,
    [tiket],
  );
}
