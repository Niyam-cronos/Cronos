import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, requireCompany, type AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { sendSuccess } from '../utils/response';
import { getCompanyId } from '../utils/company';
import { AppError } from '../middleware/error-handler';
import {
  getSmtpSettings,
  upsertSmtpSettings,
  sendSmtpTestEmail,
  verifySmtpConnection,
} from '../services/smtp.service';
import {
  getAttendancePolicy,
  upsertAttendancePolicy,
} from '../services/attendance-policy.service';
import { notifyAttendancePolicyTriggered } from '../services/notification.service';
import { getLeavePolicy, upsertLeavePolicy } from '../services/leave.service';

export const settingsRouter = Router();
settingsRouter.use(authenticate, requireCompany);

const smtpSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  username: z.string().email(),
  password: z.string().optional(),
  fromEmail: z.string().email(),
  fromName: z.string().optional(),
  replyTo: z.string().email().optional(),
  useTls: z.boolean().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

settingsRouter.get(
  '/smtp',
  authorize('settings.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const settings = await getSmtpSettings(getCompanyId(req));
    sendSuccess(res, settings);
  })
);

settingsRouter.put(
  '/smtp',
  authorize('settings.update'),
  validateBody(smtpSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const settings = await upsertSmtpSettings(getCompanyId(req), req.body);
    sendSuccess(res, settings, 'SMTP settings saved');
  })
);

settingsRouter.post(
  '/smtp/test',
  authorize('settings.update'),
  validateBody(z.object({ testEmail: z.string().email().optional() })),
  asyncHandler(async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    await verifySmtpConnection(companyId);
    const sentTo = await sendSmtpTestEmail(companyId, req.body.testEmail);
    sendSuccess(res, { sentTo }, 'SMTP configured successfully');
  })
);

const attendancePolicySchema = z.object({
  name: z.string().optional(),
  shiftStartTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  graceMinutes: z.coerce.number().int().min(0).max(120),
  lateAfterTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  lateOccurrenceLimit: z.coerce.number().int().min(1).max(30),
  evaluationPeriod: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY']),
  penaltyType: z.enum(['WARNING', 'HALF_DAY', 'FULL_DAY', 'SALARY_DEDUCTION']),
  isActive: z.boolean().optional(),
});

settingsRouter.get(
  '/attendance-policy',
  authorize('settings.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const policy = await getAttendancePolicy(getCompanyId(req));
    sendSuccess(res, policy);
  })
);

settingsRouter.put(
  '/attendance-policy',
  authorize('settings.update'),
  validateBody(attendancePolicySchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const body = {
      ...req.body,
      shiftStartTime: String(req.body.shiftStartTime).slice(0, 5),
      lateAfterTime: String(req.body.lateAfterTime).slice(0, 5),
    };
    const policy = await upsertAttendancePolicy(getCompanyId(req), body);
    sendSuccess(res, policy, 'Attendance policy saved');
  })
);

settingsRouter.post(
  '/attendance-policy/test-notification',
  authorize('settings.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    const rahul = await prisma.employee.findFirst({
      where: { companyId, email: 'rahul.sharma@gyroitsolutions.com' },
    });
    const employee = rahul ?? (await prisma.employee.findFirst({ where: { companyId } }));
    if (!employee) throw new AppError(400, 'No employee found to use for test');

    await notifyAttendancePolicyTriggered({
      companyId,
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      lateCount: 3,
      penaltyLabel: 'Half Day',
      periodLabel: 'Monthly',
    });

    sendSuccess(
      res,
      { employeeName: `${employee.firstName} ${employee.lastName}` },
      'Test policy emails sent to HR and employee (requires SMTP + Redis)'
    );
  })
);

const leavePolicySchema = z.object({
  name: z.string().optional(),
  annualLeaveDays: z.coerce.number().positive().max(365),
  monthlyAccrualDays: z.coerce.number().positive().max(31),
  carryForwardEnabled: z.boolean().optional(),
  maxCarryForwardDays: z.coerce.number().positive().nullable().optional(),
  accrualFromJoinDate: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

settingsRouter.get(
  '/leave-policy',
  authorize('settings.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const policy = await getLeavePolicy(getCompanyId(req));
    sendSuccess(res, policy);
  })
);

settingsRouter.put(
  '/leave-policy',
  authorize('settings.update'),
  validateBody(leavePolicySchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const policy = await upsertLeavePolicy(getCompanyId(req), req.body);
    sendSuccess(res, policy, 'Leave policy saved');
  })
);
