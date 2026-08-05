import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/password';
import { generateToken } from '../lib/token';
import { loadEnv } from '../config/env';
import { queueEmail } from '../queues/email.queue';
import { buildWelcomeEmail } from '../services/email.service';
import { authenticate, authorize, requireCompany, type AuthRequest } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { sendSuccess, sendPaginated } from '../utils/response';
import { getCompanyId, getPagination } from '../utils/company';
import { paramId } from '../utils/params';
import { AppError } from '../middleware/error-handler';

export const employeesRouter = Router();
employeesRouter.use(authenticate, requireCompany);

const employeeSchema = z.object({
  employeeCode: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  branchId: z.string().optional(),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  employmentTypeId: z.string().optional(),
  reportingToId: z.string().optional(),
  dateOfJoining: z.string().optional(),
  status: z.string().optional(),
  createLogin: z.boolean().optional(),
});

employeesRouter.get(
  '/',
  authorize('employees.read'),
  validateQuery(z.object({ page: z.string().optional(), pageSize: z.string().optional(), search: z.string().optional(), departmentId: z.string().optional(), status: z.string().optional() })),
  asyncHandler(async (req: AuthRequest, res) => {
    const { page, pageSize, search, skip } = getPagination(req.query);
    const where: Record<string, unknown> = { companyId: getCompanyId(req), deletedAt: null };
    if (req.query.departmentId) where.departmentId = req.query.departmentId;
    if (req.query.status) where.status = req.query.status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { firstName: 'asc' },
        include: { department: true, designation: true, branch: true },
      }),
      prisma.employee.count({ where }),
    ]);
    sendPaginated(res, items, total, page, pageSize);
  })
);

employeesRouter.post(
  '/',
  authorize('employees.create'),
  validateBody(employeeSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    const { createLogin, dateOfJoining, ...rest } = req.body;
    const data = {
      ...rest,
      companyId,
      dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
    };

    const employee = await prisma.employee.create({ data });

    if (createLogin) {
      const existingUser = await prisma.user.findUnique({ where: { email: employee.email } });
      if (!existingUser) {
        const tempPassword = generateToken().slice(0, 10);
        const employeeRole = await prisma.role.findFirst({
          where: { companyId, slug: 'employee' },
        });

        const user = await prisma.user.create({
          data: {
            email: employee.email,
            passwordHash: await hashPassword(tempPassword),
            firstName: employee.firstName,
            lastName: employee.lastName,
            companyId,
            employeeId: employee.id,
            isActive: true,
            isVerified: true,
          },
        });

        if (employeeRole) {
          await prisma.userRole.create({
            data: { userId: user.id, roleId: employeeRole.id },
          });
        }

        const loginUrl = `${loadEnv().WEB_URL}/login`;
        await queueEmail({
          to: employee.email,
          subject: 'Welcome to Cronos HRMS',
          html: buildWelcomeEmail(
            employee.firstName,
            employee.email,
            tempPassword,
            loginUrl
          ),
          companyId,
        });
      }
    }

    sendSuccess(res, employee, 'Employee created', 201);
  })
);

employeesRouter.get(
  '/:id',
  authorize('employees.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const employee = await prisma.employee.findFirst({
      where: { id: paramId(req), companyId: getCompanyId(req), deletedAt: null },
      include: {
        department: true,
        designation: true,
        branch: true,
        profile: true,
        addresses: true,
        emergencyContacts: true,
        employeeSkills: { include: { skill: true } },
      },
    });
    if (!employee) throw new AppError(404, 'Employee not found');
    sendSuccess(res, employee);
  })
);

employeesRouter.put(
  '/:id',
  authorize('employees.update'),
  validateBody(employeeSchema.partial()),
  asyncHandler(async (req: AuthRequest, res) => {
    const existing = await prisma.employee.findFirst({
      where: { id: paramId(req), companyId: getCompanyId(req), deletedAt: null },
    });
    if (!existing) throw new AppError(404, 'Employee not found');
    const data = {
      ...req.body,
      dateOfJoining: req.body.dateOfJoining ? new Date(req.body.dateOfJoining) : undefined,
    };
    const employee = await prisma.employee.update({ where: { id: existing.id }, data });
    sendSuccess(res, employee);
  })
);

employeesRouter.delete(
  '/:id',
  authorize('employees.delete'),
  asyncHandler(async (req: AuthRequest, res) => {
    const existing = await prisma.employee.findFirst({
      where: { id: paramId(req), companyId: getCompanyId(req), deletedAt: null },
    });
    if (!existing) throw new AppError(404, 'Employee not found');
    await prisma.employee.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
    sendSuccess(res, { deleted: true });
  })
);
