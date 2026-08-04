import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, requireCompany, type AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { sendSuccess } from '../utils/response';
import { getCompanyId } from '../utils/company';
import { paramId } from '../utils/params';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate, requireCompany, authorize('dashboard.read'));

dashboardRouter.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalEmployees,
      presentToday,
      onLeaveToday,
      pendingLeaves,
      pendingCorrections,
      departments,
    ] = await Promise.all([
      prisma.employee.count({ where: { companyId, deletedAt: null, status: 'active' } }),
      prisma.attendance.count({ where: { companyId, date: today, status: 'present' } }),
      prisma.leaveRequest.count({
        where: {
          companyId,
          status: 'approved',
          startDate: { lte: today },
          endDate: { gte: today },
        },
      }),
      prisma.leaveRequest.count({ where: { companyId, status: 'pending' } }),
      prisma.attendanceRequest.count({ where: { status: 'pending' } }),
      prisma.department.count({ where: { companyId, isActive: true } }),
    ]);

    sendSuccess(res, {
      totalEmployees,
      presentToday,
      onLeaveToday,
      pendingLeaves,
      pendingCorrections,
      departments,
      role: req.user!.roles[0] ?? 'employee',
    });
  })
);

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    sendSuccess(res, notifications);
  })
);

notificationsRouter.patch(
  '/:id/read',
  asyncHandler(async (req: AuthRequest, res) => {
    const notification = await prisma.notification.update({
      where: { id: paramId(req) },
      data: { isRead: true },
    });
    sendSuccess(res, notification);
  })
);
