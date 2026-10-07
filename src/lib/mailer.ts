import nodemailer from 'nodemailer';

export interface MailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
}

export interface MailInput {
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
  attachments?: MailAttachment[];
}

export class SmtpNotConfiguredError extends Error {
  constructor() {
    super('SMTP no configurado');
    this.name = 'SmtpNotConfiguredError';
  }
}

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

export function smtpConfigSummary(): Record<string, string | boolean> {
  return {
    configured: isSmtpConfigured(),
    host: process.env.SMTP_HOST || '',
    port: process.env.SMTP_PORT || (process.env.SMTP_SECURE === 'true' ? '465' : '587'),
    user: process.env.SMTP_USER || '',
  };
}

function buildTransport() {
  const secure = process.env.SMTP_SECURE === 'true';
  const port = Number(process.env.SMTP_PORT || (secure ? 465 : 587));

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

export async function sendMail(input: MailInput): Promise<void> {
  if (!isSmtpConfigured()) throw new SmtpNotConfiguredError();

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || '';
  const fromName = process.env.SMTP_FROM_NAME || 'SIC Hacienda';

  const transport = buildTransport();
  await transport.sendMail({
    from: `"${fromName}" <${from}>`,
    to: input.to.join(', '),
    cc: input.cc && input.cc.length > 0 ? input.cc.join(', ') : undefined,
    subject: input.subject,
    text: input.text,
    attachments: input.attachments,
  });
}
