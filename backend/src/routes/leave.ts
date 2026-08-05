import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, requireCompany, type AuthRequest } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { sendSuccess, sendPaginated } from '../utils/response';
import { getCompanyId, getPagination } from '../utils/company';
import { paramId } from '../utils/params';
import { AppError } from '../middleware/error-handler';
import { queueEmail } from '../queues/email.queue';
import { buildLeaveStatusEmail } from '../services/email.service';
import {
  applyLeaveWithPolicy,
  approveLeaveRequest,
  previewLeaveApplication,
  syncEmployeeLeaveBalance,
} from '../services/leave.service';

export const leaveRouter = Router();
leaveRouter.use(authenticate, requireCompany);

const applyLeaveSchema = z.object({
  leaveTypeId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  days: z.number().positive(),
  reason: z.string().min(1),
  employeeId: z.string().optional(),
});

async function resolveEmployeeId(req: AuthRequest, overrideId?: string): Promise<string> {
  if (overrideId && req.user!.permissions.includes('leave.approve')) return overrideId;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.employeeId) throw new AppError(400, 'No employee profile linked');
  return user.employeeId;
}

leaveRouter.get(
  '/',
  authorize('leave.read'),
  validateQuery(z.object({ page: z.string().optional(), pageSize: z.string().optional(), status: z.string().optional(), employeeId: z.string().optional() })),
  asyncHandler(async (req: AuthRequest, res) => {
    const { page, pageSize, skip } = getPagination(req.query);
    const where: Record<string, unknown> = { companyId: getCompanyId(req) };
    if (req.query.status) where.status = req.query.status;
    if (req.query.employeeId) where.employeeId = req.query.employeeId;
    const [items, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { leaveType: true, employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      }),
      prisma.leaveRequest.count({ where }),
    ]);
    sendPaginated(res, items, total, page, pageSize);
  })
);

leaveRouter.post(
  '/preview',
  authorize('leave.create'),
  validateBody(z.object({ leaveTypeId: z.string(), days: z.number().positive(), employeeId: z.string().optional() })),
  asyncHandler(async (req: AuthRequest, res) => {
    const employeeId = await resolveEmployeeId(req, req.body.employeeId);
    const result = await previewLeaveApplication(
      getCompanyId(req),
      employeeId,
      req.body.leaveTypeId,
      req.body.days
    );
    sendSuccess(res, result);
  })
);

leaveRouter.post(
  '/apply',
  authorize('leave.create'),
  validateBody(applyLeaveSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const employeeId = await resolveEmployeeId(req, req.body.employeeId);
    const result = await applyLeaveWithPolicy({
      companyId: getCompanyId(req),
      employeeId,
      leaveTypeId: req.body.leaveTypeId,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
      days: req.body.days,
      reason: req.body.reason,
    });
    sendSuccess(res, result, 'Leave applied', 201);
  })
);

leaveRouter.patch(
  '/:id/status',
  authorize('leave.approve'),
  validateBody(z.object({ status: z.enum(['approved', 'rejected']), comments: z.string().optional() })),
  asyncHandler(async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    const leave = await prisma.leaveRequest.findFirst({
      where: { id: paramId(req), companyId },
      include: { employee: true },
    });
    if (!leave) throw new AppError(404, 'Leave request not found');

    let updated;
    if (req.body.status === 'approved') {
      updated = await approveLeaveRequest(leave.id, companyId);
    } else {
      updated = await prisma.leaveRequest.update({
        where: { id: leave.id },
        data: { status: 'rejected' },
      });
    }

    await prisma.leaveApproval.create({
      data: {
        leaveRequestId: leave.id,
        approverId: req.user!.id,
        status: req.body.status,
        comments: req.body.comments,
      },
    });

    await prisma.leaveHistory.create({
      data: {
        leaveRequestId: leave.id,
        action: req.body.status,
        performedBy: req.user!.id,
        notes: req.body.comments,
      },
    });

    const paidInfo =
      leave.paidDays > 0 || leave.lopDays > 0
        ? ` Paid: ${leave.paidDays} day(s), Loss of Pay: ${leave.lopDays} day(s).`
        : '';

    await queueEmail({
      to: leave.employee.email,
      subject: `Leave request ${req.body.status} — Cronos`,
      html: buildLeaveStatusEmail(
        leave.employee.firstName,
        req.body.status,
        leave.startDate.toLocaleDateString(),
        leave.endDate.toLocaleDateString(),
        leave.paidDays,
        leave.lopDays
      ),
      companyId,
    });

    sendSuccess(res, { ...updated, message: paidInfo.trim() });
  })
);

leaveRouter.get(
  '/balances',
  authorize('leave.read'),
  validateQuery(z.object({ employeeId: z.string().optional(), leaveTypeId: z.string().optional() })),
  asyncHandler(async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    let employeeId = req.query.employeeId as string | undefined;

    if (!employeeId) {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      employeeId = user?.employeeId ?? undefined;
    }
    if (!employeeId) throw new AppError(400, 'Employee not found');

    const leaveTypes = req.query.leaveTypeId
      ? [await prisma.leaveType.findUnique({ where: { id: req.query.leaveTypeId as string } })]
      : await prisma.leaveType.findMany({ where: { companyId, isActive: true } });

    const balances = [];
    for (const lt of leaveTypes) {
      if (!lt) continue;
      balances.push(await syncEmployeeLeaveBalance(companyId, employeeId, lt.id));
    }

    sendSuccess(res, balances);
  })
);

leaveRouter.get(
  '/holidays',
  authorize('leave.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const holidays = await prisma.holiday.findMany({
      where: { companyId: getCompanyId(req) },
      orderBy: { date: 'asc' },
    });
    sendSuccess(res, holidays);
  })
);
