import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, requireCompany, type AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { sendSuccess } from '../utils/response';
import { getCompanyId } from '../utils/company';
import { paramId } from '../utils/params';

function isStaffUser(req: AuthRequest): boolean {
  const roles = req.user!.roles;
  if (roles.some((r) => ['admin', 'hr', 'manager', 'super_admin'].includes(r))) return true;
  return (
    req.user!.permissions.includes('employees.read') ||
    req.user!.permissions.includes('leave.approve')
  );
}

export const dashboardRouter = Router();
dashboardRouter.use(authenticate, requireCompany, authorize('dashboard.read'));

dashboardRouter.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!isStaffUser(req)) {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: {
          employee: {
            include: {
              department: { select: { name: true } },
              attendances: {
                where: { date: today },
                take: 1,
              },
              leaveBalances: {
                where: { year: today.getFullYear() },
                include: { leaveType: true },
              },
              leaveRequests: {
                where: { status: 'pending' },
              },
            },
          },
        },
      });

      const employee = user?.employee;
      const todayAttendance = employee?.attendances[0];
      const primaryBalance = employee?.leaveBalances[0];

      sendSuccess(res, {
        view: 'employee',
        role: 'employee',
        department: employee?.department?.name ?? null,
        todayStatus: todayAttendance?.status ?? 'not_checked_in',
        checkIn: todayAttendance?.checkIn ?? null,
        checkOut: todayAttendance?.checkOut ?? null,
        leaveBalance: primaryBalance?.balance ?? 0,
        leaveAllocated: primaryBalance?.allocated ?? 0,
        leaveUsed: primaryBalance?.used ?? 0,
        leaveTypeName: primaryBalance?.leaveType.name ?? 'Casual Leave',
        pendingLeaveRequests: employee?.leaveRequests.length ?? 0,
      });
      return;
    }

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
      view: 'staff',
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
