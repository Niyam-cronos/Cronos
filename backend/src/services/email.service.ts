import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { loadEnv } from '../config/env';
import { sendWithCompanySmtp } from './smtp.service';

let transporter: Transporter | null = null;

function getEnvTransporter(): Transporter {
  if (transporter) return transporter;

  const env = loadEnv();

  if (!env.SMTP_HOST) {
    transporter = nodemailer.createTransport({ jsonTransport: true });
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

  if (options.companyId) {
    const companyResult = await sendWithCompanySmtp(options.companyId, options);
    if (companyResult) return companyResult;
  }

  const from = env.SMTP_FROM ?? 'noreply@cronos.app';
  const transport = getEnvTransporter();
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
    <h2>Password Reset — Chronos</h2>
    <p>Hi ${name},</p>
    <p>Click the link below to reset your password. This link expires in 1 hour.</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>If you didn't request this, ignore this email.</p>
  `;
}

export function buildLoginOtpEmail(name: string, otp: string): string {
  return `
    <h2>Your Chronos Login Code</h2>
    <p>Hi ${name},</p>
    <p>Use this 4-digit code to sign in. It expires in 10 minutes.</p>
    <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">${otp}</p>
    <p>If you didn't request this, ignore this email.</p>
  `;
}

export function buildLeaveStatusEmail(
  name: string,
  status: string,
  startDate: string,
  endDate: string,
  paidDays?: number,
  lopDays?: number
): string {
  const splitInfo =
    paidDays != null && lopDays != null && (paidDays > 0 || lopDays > 0)
      ? `<p><strong>Paid leave:</strong> ${paidDays} day(s)<br/><strong>Loss of pay:</strong> ${lopDays} day(s)</p>`
      : '';
  return `
    <h2>Leave Request ${status} — Chronos</h2>
    <p>Hi ${name},</p>
    <p>Your leave request from <strong>${startDate}</strong> to <strong>${endDate}</strong> has been <strong>${status}</strong>.</p>
    ${splitInfo}
  `;
}

export function buildLeaveApplicationHrEmail(params: {
  employeeName: string;
  employeeCode: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  currentBalance: number;
  paidDays: number;
  lopDays: number;
  balanceAfterApproval: number;
  reason: string;
  reviewUrl?: string;
}): string {
  const {
    employeeName,
    employeeCode,
    leaveTypeName,
    startDate,
    endDate,
    requestedDays,
    currentBalance,
    paidDays,
    lopDays,
    balanceAfterApproval,
    reason,
    reviewUrl,
  } = params;

  const reviewLink = reviewUrl
    ? `<p><a href="${reviewUrl}">Open Leave page in Chronos</a> to approve or reject this request.</p>`
    : `<p>Log in to Chronos → <strong>Leave</strong> to approve or reject this request.</p>`;

  return `
    <h2>New Leave Application — ${employeeName}</h2>
    <p><strong>Employee:</strong> ${employeeName} (${employeeCode})</p>
    <p><strong>Leave type:</strong> ${leaveTypeName}</p>
    <p><strong>Dates:</strong> ${startDate} to ${endDate} (${requestedDays} day(s))</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <hr/>
    <h3>Leave Balance</h3>
    <ul>
      <li><strong>Current available balance:</strong> ${currentBalance} day(s)</li>
      <li><strong>Paid leave (this request):</strong> ${paidDays} day(s)</li>
      <li><strong>Loss of pay (this request):</strong> ${lopDays} day(s)</li>
      <li><strong>Balance after approval:</strong> ${balanceAfterApproval} day(s)</li>
    </ul>
    ${reviewLink}
  `;
}

export function buildWelcomeEmail(name: string, email: string, tempPassword: string, loginUrl: string): string {
  return `
    <h2>Welcome to Chronos HRMS</h2>
    <p>Hi ${name},</p>
    <p>Your account has been created. Use the credentials below to sign in:</p>
    <ul>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Temporary password:</strong> ${tempPassword}</li>
    </ul>
    <p><a href="${loginUrl}">Sign in to Chronos</a></p>
    <p>Please change your password after your first login.</p>
  `;
}

export function buildAttendanceAlertEmail(
  date: string,
  employees: Array<{ name: string; email: string; code: string }>
): string {
  const rows = employees
    .map((e) => `<li>${e.name} (${e.code}) — ${e.email}</li>`)
    .join('');
  return `
    <h2>Late / Missing Check-in Alert — ${date}</h2>
    <p>The following employees have not checked in today:</p>
    <ul>${rows}</ul>
  `;
}

export function buildAttendanceReminderEmail(name: string): string {
  return `
    <h2>Attendance Reminder — Chronos</h2>
    <p>Hi ${name},</p>
    <p>You haven't checked in today. Please mark your attendance.</p>
  `;
}

export function buildAttendancePolicyHrEmail(
  employeeName: string,
  lateCount: number,
  penaltyLabel: string,
  periodLabel: string
): string {
  return `
    <h2>Late Attendance Rule Triggered</h2>
    <p><strong>Employee:</strong> ${employeeName}</p>
    <p><strong>Late Count:</strong> ${lateCount}</p>
    <p><strong>Penalty:</strong> ${penaltyLabel}</p>
    <p><strong>Period:</strong> ${periodLabel}</p>
    <p>Today's attendance has been updated automatically per your company attendance policy.</p>
  `;
}

export function buildAttendancePolicyEmployeeEmail(
  name: string,
  lateCount: number,
  penaltyLabel: string,
  periodLabel: string
): string {
  return `
    <h2>Attendance Update</h2>
    <p>Hi ${name},</p>
    <p>You have exceeded the ${periodLabel.toLowerCase()} late attendance limit (${lateCount}).</p>
    <p>Today's attendance has been marked as <strong>${penaltyLabel}</strong>.</p>
    <p>Please contact HR if you believe this is incorrect.</p>
  `;
}
