export type NotificationSendStatus = 'tertunda' | 'terkirim' | 'gagal' | 'dilewati';

export interface NotificationPayload {
  tiket: string;
  statusDari: string;
  statusKe: string;
  surelPelapor: string | null;
}

export interface NotificationSendResult {
  status: NotificationSendStatus;
  galat?: string;
}

export interface NotificationChannel {
  readonly name: string;
  readonly active: boolean;
  send(payload: NotificationPayload): Promise<NotificationSendResult>;
}
