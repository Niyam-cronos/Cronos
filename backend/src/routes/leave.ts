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
  '/apply',
  authorize('leave.create'),
  validateBody(applyLeaveSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    let employeeId = req.body.employeeId;
    if (!employeeId) {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (!user?.employeeId) throw new AppError(400, 'No employee profile linked');
      employeeId = user.employeeId;
    }
    const leave = await prisma.leaveRequest.create({
      data: {
        companyId: getCompanyId(req),
        employeeId,
        leaveTypeId: req.body.leaveTypeId,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        days: req.body.days,
        reason: req.body.reason,
        status: 'pending',
      },
    });
    sendSuccess(res, leave, 'Leave applied', 201);
  })
);

leaveRouter.patch(
  '/:id/status',
  authorize('leave.approve'),
  validateBody(z.object({ status: z.enum(['approved', 'rejected']), comments: z.string().optional() })),
  asyncHandler(async (req: AuthRequest, res) => {
    const leave = await prisma.leaveRequest.findFirst({
      where: { id: paramId(req), companyId: getCompanyId(req) },
      include: { employee: true },
    });
    if (!leave) throw new AppError(404, 'Leave request not found');

    const [updated] = await prisma.$transaction([
      prisma.leaveRequest.update({
        where: { id: leave.id },
        data: { status: req.body.status },
      }),
      prisma.leaveApproval.create({
        data: {
          leaveRequestId: leave.id,
          approverId: req.user!.id,
          status: req.body.status,
          comments: req.body.comments,
        },
      }),
      prisma.leaveHistory.create({
        data: {
          leaveRequestId: leave.id,
          action: req.body.status,
          performedBy: req.user!.id,
          notes: req.body.comments,
        },
      }),
    ]);

    await queueEmail({
      to: leave.employee.email,
      subject: `Leave request ${req.body.status} — Cronos`,
      html: buildLeaveStatusEmail(
        leave.employee.firstName,
        req.body.status,
        leave.startDate.toLocaleDateString(),
        leave.endDate.toLocaleDateString()
      ),
      companyId: getCompanyId(req),
    });

    sendSuccess(res, updated);
  })
);

leaveRouter.get(
  '/balances',
  authorize('leave.read'),
  validateQuery(z.object({ employeeId: z.string().optional() })),
  asyncHandler(async (req: AuthRequest, res) => {
    const employeeId = (req.query.employeeId as string) || req.user!.id;
    const balances = await prisma.leaveBalance.findMany({
      where: { employeeId },
      include: { leaveType: true },
    });
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
