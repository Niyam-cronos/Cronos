import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';
import { evaluateCheckIn } from './attendance-policy.service';

interface CheckInLogInput {
  latitude?: number;
  longitude?: number;
  source: string;
}

export async function performCheckIn(
  companyId: string,
  employeeId: string,
  log: CheckInLogInput
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });

  if (existing?.checkIn) {
    throw new AppError(400, 'Already checked in today');
  }

  const now = new Date();
  const evaluation = await evaluateCheckIn(companyId, employeeId, now);

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { defaultShiftId: true },
  });

  const notes =
    evaluation.policyTriggered && evaluation.penaltyType === 'SALARY_DEDUCTION'
      ? 'Salary deduction flagged per attendance policy'
      : undefined;

  const attendanceData = {
    checkIn: now,
    status: evaluation.status,
    lateMinutes: evaluation.lateMinutes,
    lateCount: evaluation.lateCount > 0 ? evaluation.lateCount : null,
    shiftId: employee?.defaultShiftId ?? undefined,
    notes,
  };

  const attendance = existing
    ? await prisma.attendance.update({
        where: { id: existing.id },
        data: attendanceData,
      })
    : await prisma.attendance.create({
        data: {
          companyId,
          employeeId,
          date: today,
          ...attendanceData,
        },
      });

  await prisma.attendanceLog.create({
    data: {
      attendanceId: attendance.id,
      type: 'check_in',
      timestamp: now,
      latitude: log.latitude,
      longitude: log.longitude,
      source: log.source,
    },
  });

  return { attendance, evaluation };
}
