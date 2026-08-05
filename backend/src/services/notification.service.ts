import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { queueEmail } from '../queues/email.queue';
import {
  buildAttendancePolicyEmployeeEmail,
  buildAttendancePolicyHrEmail,
  buildLeaveApplicationHrEmail,
} from './email.service';

interface NotifyOptions {
  companyId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  email?: { to: string; subject: string; html: string };
}

export async function createNotification(options: NotifyOptions) {
  const notification = await prisma.notification.create({
    data: {
      companyId: options.companyId,
      userId: options.userId,
      type: options.type,
      title: options.title,
      message: options.message,
      data: (options.data ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  if (options.email) {
    await queueEmail({
      to: options.email.to,
      subject: options.email.subject,
      html: options.email.html,
      companyId: options.companyId,
      notificationId: notification.id,
    });
  }

  return notification;
}

export async function notifyHrUsers(
  companyId: string,
  payload: Omit<NotifyOptions, 'companyId' | 'userId' | 'email'> & {
    emailBuilder?: (recipientName: string) => { subject: string; html: string };
  }
) {
  const hrUsers = await prisma.user.findMany({
    where: {
      companyId,
      isActive: true,
      deletedAt: null,
      userRoles: { some: { role: { slug: { in: ['hr', 'admin'] } } } },
    },
    select: { id: true, email: true, firstName: true },
  });

  for (const user of hrUsers) {
    const emailContent = payload.emailBuilder?.(user.firstName);
    await createNotification({
      companyId,
      userId: user.id,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      email: emailContent
        ? { to: user.email, subject: emailContent.subject, html: emailContent.html }
        : undefined,
    });
  }
}

export async function notifyEmployeeUser(
  companyId: string,
  employeeId: string,
  payload: Omit<NotifyOptions, 'companyId' | 'userId' | 'email'> & {
    emailBuilder?: (employeeName: string, employeeEmail: string) => { subject: string; html: string };
  }
) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: true },
  });
  if (!employee) return;

  const userId = employee.user?.id;
  if (!userId) return;

  const emailContent = payload.emailBuilder?.(
    employee.firstName,
    employee.email
  );

  await createNotification({
    companyId,
    userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    data: payload.data,
    email: emailContent
      ? { to: employee.email, subject: emailContent.subject, html: emailContent.html }
      : undefined,
  });
}

export async function notifyAttendancePolicyTriggered(params: {
  companyId: string;
  employeeId: string;
  employeeName: string;
  lateCount: number;
  penaltyLabel: string;
  periodLabel: string;
}) {
  const { companyId, employeeId, employeeName, lateCount, penaltyLabel, periodLabel } = params;

  const hrTitle = 'Attendance Policy Triggered';
  const hrMessage = `${employeeName} has exceeded the ${periodLabel.toLowerCase()} late attendance limit (${lateCount}). Status updated to ${penaltyLabel}.`;

  await notifyHrUsers(companyId, {
    type: 'attendance_policy',
    title: hrTitle,
    message: hrMessage,
    data: { employeeId, lateCount, penaltyLabel },
    emailBuilder: () => ({
      subject: `Late Attendance Rule Triggered — ${employeeName}`,
      html: buildAttendancePolicyHrEmail(employeeName, lateCount, penaltyLabel, periodLabel),
    }),
  });

  const employeeTitle = 'Attendance Update';
  const employeeMessage = `You have exceeded the ${periodLabel.toLowerCase()} late attendance limit (${lateCount}). Today's attendance has been marked as ${penaltyLabel}. Please contact HR if you believe this is incorrect.`;

  await notifyEmployeeUser(companyId, employeeId, {
    type: 'attendance_policy',
    title: employeeTitle,
    message: employeeMessage,
    data: { lateCount, penaltyLabel },
    emailBuilder: (name) => ({
      subject: 'Attendance Update — Late Policy Applied',
      html: buildAttendancePolicyEmployeeEmail(name, lateCount, penaltyLabel, periodLabel),
    }),
  });
}

export async function notifyLeaveApplicationToHr(params: {
  companyId: string;
  employeeId: string;
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
  leaveRequestId: string;
  reviewUrl?: string;
}) {
  const {
    companyId,
    employeeId,
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
    leaveRequestId,
    reviewUrl,
  } = params;

  const title = 'New Leave Application';
  const message = `${employeeName} applied for ${requestedDays} day(s) (${startDate} – ${endDate}). Balance: ${currentBalance}, Paid: ${paidDays}, LOP: ${lopDays}.`;

  await notifyHrUsers(companyId, {
    type: 'leave_application',
    title,
    message,
    data: {
      leaveRequestId,
      employeeId,
      requestedDays,
      currentBalance,
      paidDays,
      lopDays,
      balanceAfterApproval,
    },
    emailBuilder: () => ({
      subject: `Leave Application — ${employeeName} (${paidDays} paid, ${lopDays} LOP)`,
      html: buildLeaveApplicationHrEmail({
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
      }),
    }),
  });
}
