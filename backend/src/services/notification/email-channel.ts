import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { createHash } from 'node:crypto';
import { config } from '../../config/env.js';
import { buildNotificationEmail } from './template.js';
import type { NotificationChannel, NotificationPayload, NotificationSendResult } from './types.js';

export class EmailChannel implements NotificationChannel {
  readonly name = 'surel';
  readonly active: boolean;
  private transporter: Transporter | null = null;

  constructor() {
    this.active = !!config.smtp.host && !!config.smtp.from;
    if (this.active) {
      const auth =
        config.smtp.user && config.smtp.pass
          ? { user: config.smtp.user, pass: config.smtp.pass }
          : undefined;
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host!,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth,
      });
    }
  }

  async send(payload: NotificationPayload): Promise<NotificationSendResult> {
    if (!this.active || !this.transporter) {
      return { status: 'dilewati' };
    }

    if (!payload.surelPelapor) {
      return { status: 'dilewati' };
    }

    const { subject, text } = buildNotificationEmail(payload);

    try {
      await this.transporter.sendMail({
        from: config.smtp.from!,
        to: payload.surelPelapor,
        subject,
        text,
      });
      return { status: 'terkirim' };
    } catch (err) {
      return {
        status: 'gagal',
        galat: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

let singleton: EmailChannel | null = null;

export function getEmailChannel(): EmailChannel {
  if (!singleton) singleton = new EmailChannel();
  return singleton;
}

export function hashEmail(email: string): string {
  return createHash('sha256').update(email).digest('hex');
}
