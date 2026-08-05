import { prisma } from '../lib/prisma';
import { queueEmail } from '../queues/email.queue';
import { buildAttendanceAlertEmail } from './email.service';
import { startOfDayInTimezone } from '../utils/timezone';

const CHECK_INTERVAL_MS = 60_000;
const lastRunByCompany = new Map<string, string>();

function getIstDateKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getIstHourMinute(): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  return {
    hour: Number(parts.find((p) => p.type === 'hour')?.value ?? '0'),
    minute: Number(parts.find((p) => p.type === 'minute')?.value ?? '0'),
  };
}

async function runAttendanceAlert(): Promise<void> {
  const todayKey = getIstDateKey();
  const { hour, minute } = getIstHourMinute();

  const companies = await prisma.company.findMany({
    where: { isActive: true },
    include: {
      smtpSettings: true,
      attendancePolicy: true,
      employees: {
        where: { status: 'active', deletedAt: null },
        select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true },
      },
    },
  });

  for (const company of companies) {
    if (!company.smtpSettings || company.smtpSettings.status !== 'active') continue;

    const timezone = company.timezone ?? 'Asia/Kolkata';
    const policy = company.attendancePolicy;
    const alertTime = policy?.lateAfterTime ?? '09:30';
    const [alertHour, alertMinute] = alertTime.split(':').map(Number);

    if (hour !== alertHour || minute !== alertMinute) continue;

    const runKey = `${company.id}:${todayKey}`;
    if (lastRunByCompany.get(company.id) === todayKey) continue;
    lastRunByCompany.set(company.id, todayKey);

    const startOfDay = startOfDayInTimezone(new Date(), timezone);

    const checkedIn = await prisma.attendance.findMany({
      where: {
        companyId: company.id,
        date: startOfDay,
        checkIn: { not: null },
      },
      select: { employeeId: true },
    });
    const checkedInIds = new Set(checkedIn.map((a) => a.employeeId));
    const missing = company.employees.filter((e) => !checkedInIds.has(e.id));
    if (!missing.length) continue;

    const hrUsers = await prisma.user.findMany({
      where: {
        companyId: company.id,
        isActive: true,
        deletedAt: null,
        userRoles: { some: { role: { slug: { in: ['hr', 'admin'] } } } },
      },
      select: { email: true },
    });

    const hrEmails = [...new Set(hrUsers.map((u) => u.email))];
    if (!hrEmails.length) continue;

    const employeeList = missing.map((e) => ({
      name: `${e.firstName} ${e.lastName}`,
      email: e.email,
      code: e.employeeCode,
    }));

    for (const hrEmail of hrEmails) {
      await queueEmail({
        to: hrEmail,
        subject: `Attendance alert — ${missing.length} employee(s) not checked in by ${alertTime}`,
        html: buildAttendanceAlertEmail(todayKey, employeeList),
        companyId: company.id,
      });
    }
  }

  if (companies.length) {
    console.log(`[AttendanceAlert] Checked companies at ${hour}:${minute}`);
  }
}

export function startAttendanceAlertScheduler(): void {
  setInterval(() => {
    runAttendanceAlert().catch((err) => {
      console.error('[AttendanceAlert] Failed:', err);
    });
  }, CHECK_INTERVAL_MS);
}
