import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { loadEnv } from '../config/env';
import { prisma } from '../lib/prisma';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const env = loadEnv();

  if (!env.SMTP_HOST) {
    // Dev fallback: log emails to console
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: (env.SMTP_PORT ?? 587) === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  return transporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  companyId?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ messageId: string }> {
  const env = loadEnv();
  let from = env.SMTP_FROM ?? 'noreply@cronos.app';

  // Use per-company SMTP if configured
  if (options.companyId) {
    const companySmtp = await prisma.smtpSetting.findUnique({
      where: { companyId: options.companyId },
    });
    if (companySmtp) {
      const companyTransport = nodemailer.createTransport({
        host: companySmtp.host,
        port: companySmtp.port,
        secure: companySmtp.port === 465,
        auth: { user: companySmtp.username, pass: companySmtp.password },
      });
      const result = await companyTransport.sendMail({
        from: `"${companySmtp.fromName ?? 'Cronos'}" <${companySmtp.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      return { messageId: result.messageId };
    }
  }

  const transport = getTransporter();
  const result = await transport.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  if (!env.SMTP_HOST) {
    console.log('[DEV EMAIL]', JSON.parse(result.message).message);
  }

  return { messageId: result.messageId };
}

export function buildPasswordResetEmail(name: string, resetUrl: string): string {
  return `
    <h2>Password Reset — Cronos</h2>
    <p>Hi ${name},</p>
    <p>Click the link below to reset your password. This link expires in 1 hour.</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>If you didn't request this, ignore this email.</p>
  `;
}

export function buildLeaveStatusEmail(
  name: string,
  status: string,
  startDate: string,
  endDate: string
): string {
  return `
    <h2>Leave Request ${status} — Cronos</h2>
    <p>Hi ${name},</p>
    <p>Your leave request from <strong>${startDate}</strong> to <strong>${endDate}</strong> has been <strong>${status}</strong>.</p>
  `;
}

export function buildAttendanceReminderEmail(name: string): string {
  return `
    <h2>Attendance Reminder — Cronos</h2>
    <p>Hi ${name},</p>
    <p>You haven't checked in today. Please mark your attendance.</p>
  `;
}
