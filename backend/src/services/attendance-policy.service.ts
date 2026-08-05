import type { AttendancePolicy } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  getEvaluationPeriodRange,
  getMinutesSinceMidnight,
  parseTimeToMinutes,
  startOfDayInTimezone,
} from '../utils/timezone';
import { notifyAttendancePolicyTriggered } from './notification.service';

export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent' | 'on_leave';

export interface CheckInEvaluation {
  status: AttendanceStatus;
  lateMinutes: number | null;
  lateCount: number;
  policyTriggered: boolean;
  penaltyType: string | null;
}

export interface AttendancePolicyInput {
  name?: string;
  shiftStartTime: string;
  graceMinutes: number;
  lateAfterTime: string;
  lateOccurrenceLimit: number;
  evaluationPeriod: string;
  penaltyType: string;
  penaltiesEnabled?: boolean;
  isActive?: boolean;
}

const PENALTY_STATUS_MAP: Record<string, AttendanceStatus> = {
  WARNING: 'late',
  HALF_DAY: 'half_day',
  FULL_DAY: 'absent',
  SALARY_DEDUCTION: 'late',
};

const PENALTY_LABELS: Record<string, string> = {
  WARNING: 'Warning',
  HALF_DAY: 'Half Day',
  FULL_DAY: 'Full Day',
  SALARY_DEDUCTION: 'Salary Deduction',
};

const PERIOD_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
};

export async function getAttendancePolicy(companyId: string, departmentId?: string | null) {
  if (departmentId) {
    const deptPolicy = await prisma.attendancePolicy.findFirst({
      where: { companyId, departmentId, isActive: true },
    });
    if (deptPolicy) return deptPolicy;
  }
  return prisma.attendancePolicy.findFirst({
    where: { companyId, departmentId: null, isActive: true },
  });
}

async function upsertAttendancePolicyByScope(
  companyId: string,
  departmentId: string | null,
  input: AttendancePolicyInput
) {
  const existing = await prisma.attendancePolicy.findFirst({
    where: { companyId, departmentId },
  });

  const data = {
    name: input.name ?? (departmentId ? 'Department Attendance Policy' : 'Default Attendance Policy'),
    shiftStartTime: input.shiftStartTime,
    graceMinutes: input.graceMinutes,
    lateAfterTime: input.lateAfterTime,
    lateOccurrenceLimit: input.lateOccurrenceLimit,
    evaluationPeriod: input.evaluationPeriod,
    penaltyType: input.penaltyType,
    penaltiesEnabled: input.penaltiesEnabled ?? true,
    isActive: input.isActive ?? true,
  };

  if (existing) {
    return prisma.attendancePolicy.update({ where: { id: existing.id }, data });
  }

  return prisma.attendancePolicy.create({
    data: { companyId, departmentId, ...data },
  });
}

export async function resolveAttendancePolicyForEmployee(companyId: string, employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { departmentId: true },
  });

  return getAttendancePolicy(companyId, employee?.departmentId ?? null);
}

export async function upsertAttendancePolicy(companyId: string, input: AttendancePolicyInput) {
  return upsertAttendancePolicyByScope(companyId, null, input);
}

export async function upsertDepartmentAttendancePolicy(
  companyId: string,
  departmentId: string,
  input: AttendancePolicyInput
) {
  return upsertAttendancePolicyByScope(companyId, departmentId, input);
}

async function countLateOccurrencesInPeriod(
  employeeId: string,
  period: PeriodBounds,
  beforeDate: Date
): Promise<number> {
  return prisma.attendance.count({
    where: {
      employeeId,
      status: 'late',
      date: {
        gte: period.start,
        lt: beforeDate,
      },
    },
  });
}

interface PeriodBounds {
  start: Date;
  end: Date;
}

function resolvePenaltyStatus(policy: AttendancePolicy): AttendanceStatus {
  return PENALTY_STATUS_MAP[policy.penaltyType] ?? 'half_day';
}

export async function evaluateCheckIn(
  companyId: string,
  employeeId: string,
  checkInTime: Date
): Promise<CheckInEvaluation> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { timezone: true },
  });
  const timezone = company?.timezone ?? 'Asia/Kolkata';

  const policy = await resolveAttendancePolicyForEmployee(companyId, employeeId);

  if (!policy || !policy.penaltiesEnabled) {
    return {
      status: 'present',
      lateMinutes: null,
      lateCount: 0,
      policyTriggered: false,
      penaltyType: null,
    };
  }

  const checkInMinutes = getMinutesSinceMidnight(checkInTime, timezone);
  const lateAfterMinutes = parseTimeToMinutes(policy.lateAfterTime);
  const shiftStartMinutes = parseTimeToMinutes(policy.shiftStartTime);
  const today = startOfDayInTimezone(checkInTime, timezone);

  if (checkInMinutes <= lateAfterMinutes) {
    return {
      status: 'present',
      lateMinutes: null,
      lateCount: 0,
      policyTriggered: false,
      penaltyType: null,
    };
  }

  const period = getEvaluationPeriodRange(checkInTime, policy.evaluationPeriod, timezone);
  const previousLateCount = await countLateOccurrencesInPeriod(employeeId, period, today);
  const lateCount = previousLateCount + 1;
  const lateMinutes = Math.max(0, checkInMinutes - shiftStartMinutes);
  const policyTriggered = lateCount >= policy.lateOccurrenceLimit;

  if (policyTriggered) {
    const status = resolvePenaltyStatus(policy);
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { firstName: true, lastName: true },
    });

    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Employee';
    const penaltyLabel = PENALTY_LABELS[policy.penaltyType] ?? policy.penaltyType;
    const periodLabel = PERIOD_LABELS[policy.evaluationPeriod] ?? policy.evaluationPeriod;

    await notifyAttendancePolicyTriggered({
      companyId,
      employeeId,
      employeeName,
      lateCount,
      penaltyLabel,
      periodLabel,
    });

    console.log(
      `[AttendancePolicy] Penalty triggered for ${employeeName} — HR + employee notified (late #${lateCount})`
    );

    return {
      status,
      lateMinutes,
      lateCount,
      policyTriggered: true,
      penaltyType: policy.penaltyType,
    };
  }

  return {
    status: 'late',
    lateMinutes,
    lateCount,
    policyTriggered: false,
    penaltyType: null,
  };
}

export function getPolicyLateAfterTime(policy: AttendancePolicy): string {
  return policy.lateAfterTime;
}
