import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { prisma } from '../lib/prisma';
import { encryptSecret, decryptSecret } from '../lib/encryption';
import { AppError } from '../middleware/error-handler';

export interface SmtpConfigInput {
  host: string;
  port: number;
  username: string;
  password?: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  useTls?: boolean;
  status?: string;
}

export interface SmtpConfigPublic {
  host: string;
  port: number;
  username: string;
  fromEmail: string;
  fromName: string | null;
  replyTo: string | null;
  useTls: boolean;
  status: string;
  passwordConfigured: boolean;
}

function toPublic(setting: {
  host: string;
  port: number;
  username: string;
  fromEmail: string;
  fromName: string | null;
  replyTo: string | null;
  useTls: boolean;
  status: string;
  password: string;
}): SmtpConfigPublic {
  return {
    host: setting.host,
    port: setting.port,
    username: setting.username,
    fromEmail: setting.fromEmail,
    fromName: setting.fromName,
    replyTo: setting.replyTo,
    useTls: setting.useTls,
    status: setting.status,
    passwordConfigured: !!setting.password,
  };
}

export async function getSmtpSettings(companyId: string): Promise<SmtpConfigPublic | null> {
  const setting = await prisma.smtpSetting.findUnique({ where: { companyId } });
  if (!setting) return null;
  return toPublic(setting);
}

export async function getSmtpSettingsWithPassword(companyId: string) {
  const setting = await prisma.smtpSetting.findUnique({ where: { companyId } });
  if (!setting || setting.status !== 'active') return null;
  return {
    ...setting,
    password: decryptSecret(setting.password),
  };
}

export async function upsertSmtpSettings(companyId: string, input: SmtpConfigInput): Promise<SmtpConfigPublic> {
  const existing = await prisma.smtpSetting.findUnique({ where: { companyId } });

  let password = input.password?.trim();
  if (!password && existing) {
    password = decryptSecret(existing.password);
  }
  if (!password) {
    throw new AppError(400, 'SMTP password is required');
  }

  const data = {
    host: input.host,
    port: input.port,
    username: input.username,
    password: encryptSecret(password),
    fromEmail: input.fromEmail,
    fromName: input.fromName ?? null,
    replyTo: input.replyTo ?? null,
    useTls: input.useTls ?? true,
    status: input.status ?? 'active',
  };

  const setting = await prisma.smtpSetting.upsert({
    where: { companyId },
    create: { companyId, ...data },
    update: data,
  });

  return toPublic(setting);
}

export function createSmtpTransport(config: {
  host: string;
  port: number;
  username: string;
  password: string;
  useTls: boolean;
}): Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.useTls && config.port !== 465,
    auth: { user: config.username, pass: config.password },
  });
}

export async function verifySmtpConnection(companyId: string): Promise<void> {
  const config = await getSmtpSettingsWithPassword(companyId);
  if (!config) throw new AppError(400, 'SMTP is not configured for this company');

  const transport = createSmtpTransport(config);
  await transport.verify();
}

export async function sendSmtpTestEmail(companyId: string, testEmail?: string): Promise<string> {
  const config = await getSmtpSettingsWithPassword(companyId);
  if (!config) throw new AppError(400, 'SMTP is not configured for this company');

  const to = testEmail ?? config.replyTo ?? config.fromEmail ?? config.username;
  const transport = createSmtpTransport(config);

  const result = await transport.sendMail({
    from: `"${config.fromName ?? 'Chronos HR'}" <${config.fromEmail}>`,
    to,
    replyTo: config.replyTo ?? config.fromEmail,
    subject: 'Chronos SMTP Test — Configuration Successful',
    html: `
      <h2>SMTP Configured Successfully</h2>
      <p>Your Chronos HRMS email settings are working correctly.</p>
      <p>Emails such as password resets, leave notifications, and welcome messages will be sent from <strong>${config.fromEmail}</strong>.</p>
    `,
    text: 'SMTP configured successfully. Your Chronos HRMS can now send emails.',
  });

  return to;
}

export async function sendWithCompanySmtp(
  companyId: string,
  options: { to: string; subject: string; html: string; text?: string }
): Promise<{ messageId: string } | null> {
  const config = await getSmtpSettingsWithPassword(companyId);
  if (!config) return null;

  const transport = createSmtpTransport(config);
  const result = await transport.sendMail({
    from: `"${config.fromName ?? 'Chronos'}" <${config.fromEmail}>`,
    replyTo: config.replyTo ?? config.fromEmail,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  return { messageId: result.messageId };
}
