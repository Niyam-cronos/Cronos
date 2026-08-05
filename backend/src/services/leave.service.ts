import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';
import { loadEnv } from '../config/env';
import { notifyLeaveApplicationToHr } from './notification.service';

export interface LeavePolicyInput {
  name?: string;
  annualLeaveDays: number;
  monthlyAccrualDays: number;
  carryForwardEnabled?: boolean;
  maxCarryForwardDays?: number | null;
  accrualFromJoinDate?: boolean;
  isActive?: boolean;
}

export interface LeaveSplit {
  paidDays: number;
  lopDays: number;
  availableBalance: number;
}

export async function getLeavePolicy(companyId: string, departmentId?: string | null) {
  if (departmentId) {
    const deptPolicy = await prisma.leavePolicy.findFirst({
      where: { companyId, departmentId, isActive: true },
    });
    if (deptPolicy) return deptPolicy;
  }
  return prisma.leavePolicy.findFirst({
    where: { companyId, departmentId: null, isActive: true },
  });
}

async function upsertLeavePolicyByScope(
  companyId: string,
  departmentId: string | null,
  input: LeavePolicyInput
) {
  const existing = await prisma.leavePolicy.findFirst({
    where: { companyId, departmentId },
  });

  const data = {
    name: input.name ?? (departmentId ? 'Department Leave Policy' : 'Default Leave Policy'),
    annualLeaveDays: input.annualLeaveDays,
    monthlyAccrualDays: input.monthlyAccrualDays,
    carryForwardEnabled: input.carryForwardEnabled ?? true,
    maxCarryForwardDays: input.maxCarryForwardDays ?? null,
    accrualFromJoinDate: input.accrualFromJoinDate ?? true,
    isActive: input.isActive ?? true,
  };

  if (existing) {
    return prisma.leavePolicy.update({ where: { id: existing.id }, data });
  }

  return prisma.leavePolicy.create({
    data: { companyId, departmentId, ...data },
  });
}

export async function resolveLeavePolicyForEmployee(companyId: string, employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { departmentId: true },
  });

  return getLeavePolicy(companyId, employee?.departmentId ?? null);
}

export async function upsertLeavePolicy(companyId: string, input: LeavePolicyInput) {
  return upsertLeavePolicyByScope(companyId, null, input);
}

export async function upsertDepartmentLeavePolicy(
  companyId: string,
  departmentId: string,
  input: LeavePolicyInput
) {
  return upsertLeavePolicyByScope(companyId, departmentId, input);
}

function getLeaveYearStartDate(leaveYearStart: string, referenceDate: Date): Date {
  const [month, day] = leaveYearStart.split('-').map(Number);
  let start = new Date(referenceDate.getFullYear(), month - 1, day);
  if (referenceDate < start) {
    start = new Date(referenceDate.getFullYear() - 1, month - 1, day);
  }
  return start;
}

export function countAccrualMonths(
  policy: {
    annualLeaveDays: number;
    monthlyAccrualDays: number;
    accrualFromJoinDate: boolean;
    carryForwardEnabled: boolean;
    maxCarryForwardDays: number | null;
  },
  employeeJoinDate: Date | null,
  leaveYearStart: string,
  referenceDate: Date = new Date()
): number {
  const periodStart = getLeaveYearStartDate(leaveYearStart, referenceDate);

  let accrualFrom = periodStart;
  if (policy.accrualFromJoinDate && employeeJoinDate) {
    const join = new Date(employeeJoinDate);
    join.setHours(0, 0, 0, 0);
    if (join > accrualFrom) accrualFrom = join;
  }

  if (referenceDate < accrualFrom) return 0;

  const months =
    (referenceDate.getFullYear() - accrualFrom.getFullYear()) * 12 +
    (referenceDate.getMonth() - accrualFrom.getMonth()) +
    1;

  const accrued = Math.min(months * policy.monthlyAccrualDays, policy.annualLeaveDays);

  if (!policy.carryForwardEnabled) {
    const currentMonthAccrual = policy.monthlyAccrualDays;
    return Math.min(accrued, currentMonthAccrual);
  }

  if (policy.maxCarryForwardDays != null) {
    return Math.min(accrued, policy.maxCarryForwardDays);
  }

  return accrued;
}

export function calculateLeaveSplit(requestedDays: number, availableBalance: number): LeaveSplit {
  const paidDays = Math.min(requestedDays, Math.max(0, availableBalance));
  const lopDays = Math.max(0, requestedDays - paidDays);
  return { paidDays, lopDays, availableBalance };
}

async function getUsedPaidDays(employeeId: string, leaveTypeId: string, year: number): Promise<number> {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  const approved = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      leaveTypeId,
      status: 'approved',
      startDate: { gte: yearStart, lte: yearEnd },
    },
    select: { paidDays: true, days: true },
  });

  return approved.reduce((sum, l) => sum + (l.paidDays > 0 ? l.paidDays : l.days), 0);
}

export async function syncEmployeeLeaveBalance(
  companyId: string,
  employeeId: string,
  leaveTypeId: string,
  referenceDate: Date = new Date()
) {
  const [policy, employee, companySettings, leaveType] = await Promise.all([
    resolveLeavePolicyForEmployee(companyId, employeeId),
    prisma.employee.findUnique({ where: { id: employeeId } }),
    prisma.companySetting.findUnique({ where: { companyId } }),
    prisma.leaveType.findUnique({ where: { id: leaveTypeId } }),
  ]);

  if (!employee || !leaveType) throw new AppError(404, 'Employee or leave type not found');

  const year = referenceDate.getFullYear();
  const defaultPolicy = {
    annualLeaveDays: leaveType.daysPerYear || 12,
    monthlyAccrualDays: 1,
    accrualFromJoinDate: true,
    carryForwardEnabled: leaveType.isCarryForward,
    maxCarryForwardDays: leaveType.maxCarryDays,
  };

  const activePolicy = policy ?? defaultPolicy;
  const leaveYearStart = companySettings?.leaveYearStart ?? '01-01';

  const allocated = countAccrualMonths(
    activePolicy,
    employee.dateOfJoining,
    leaveYearStart,
    referenceDate
  );

  const used = await getUsedPaidDays(employeeId, leaveTypeId, year);
  const balance = Math.max(0, allocated - used);

  return prisma.leaveBalance.upsert({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    create: { employeeId, leaveTypeId, year, allocated, used, balance },
    update: { allocated, used, balance },
    include: { leaveType: true },
  });
}

export async function previewLeaveApplication(
  companyId: string,
  employeeId: string,
  leaveTypeId: string,
  requestedDays: number
) {
  const balance = await syncEmployeeLeaveBalance(companyId, employeeId, leaveTypeId);
  const split = calculateLeaveSplit(requestedDays, balance.balance);
  return { balance, split };
}

export async function applyLeaveWithPolicy(params: {
  companyId: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
}) {
  const { balance, split } = await previewLeaveApplication(
    params.companyId,
    params.employeeId,
    params.leaveTypeId,
    params.days
  );

  const leave = await prisma.leaveRequest.create({
    data: {
      companyId: params.companyId,
      employeeId: params.employeeId,
      leaveTypeId: params.leaveTypeId,
      startDate: params.startDate,
      endDate: params.endDate,
      days: params.days,
      paidDays: split.paidDays,
      lopDays: split.lopDays,
      reason: params.reason,
      status: 'pending',
    },
    include: { leaveType: true, employee: true },
  });

  const employeeName = `${leave.employee.firstName} ${leave.employee.lastName}`;
  const webUrl = loadEnv().WEB_URL;
  await notifyLeaveApplicationToHr({
    companyId: params.companyId,
    employeeId: params.employeeId,
    employeeName,
    employeeCode: leave.employee.employeeCode,
    leaveTypeName: leave.leaveType.name,
    startDate: params.startDate.toLocaleDateString('en-IN'),
    endDate: params.endDate.toLocaleDateString('en-IN'),
    requestedDays: params.days,
    currentBalance: balance.balance,
    paidDays: split.paidDays,
    lopDays: split.lopDays,
    balanceAfterApproval: Math.max(0, balance.balance - split.paidDays),
    reason: params.reason,
    leaveRequestId: leave.id,
    reviewUrl: `${webUrl}/leave`,
  });

  return { leave, balance, split };
}

export async function approveLeaveRequest(leaveId: string, companyId: string) {
  const leave = await prisma.leaveRequest.findFirst({
    where: { id: leaveId, companyId },
  });
  if (!leave) throw new AppError(404, 'Leave request not found');
  if (leave.status !== 'pending') throw new AppError(400, 'Leave request already processed');

  await syncEmployeeLeaveBalance(companyId, leave.employeeId, leave.leaveTypeId);

  const balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId_year: {
        employeeId: leave.employeeId,
        leaveTypeId: leave.leaveTypeId,
        year: new Date().getFullYear(),
      },
    },
  });

  if (leave.paidDays > (balance?.balance ?? 0)) {
    throw new AppError(400, 'Insufficient leave balance for paid days');
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: leave.id },
    data: { status: 'approved' },
  });

  await syncEmployeeLeaveBalance(companyId, leave.employeeId, leave.leaveTypeId);

  return updated;
}
