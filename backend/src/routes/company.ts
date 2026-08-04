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

export const companyRouter = Router();
companyRouter.use(authenticate);

const companySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  timezone: z.string().optional(),
});

const branchSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
  phone: z.string().optional(),
});

function slugify(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
}

// Company
companyRouter.get(
  '/',
  authorize('company.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    if (req.user!.roles.includes('super_admin')) {
      const companies = await prisma.company.findMany({ orderBy: { name: 'asc' } });
      return sendSuccess(res, companies);
    }
    const company = await prisma.company.findUnique({ where: { id: getCompanyId(req) } });
    sendSuccess(res, company);
  })
);

companyRouter.post(
  '/',
  authorize('company.create'),
  validateBody(companySchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const slug = req.body.slug || slugify(req.body.name);
    const company = await prisma.company.create({
      data: { ...req.body, slug },
    });
    sendSuccess(res, company, 'Company created', 201);
  })
);

companyRouter.get(
  '/current',
  requireCompany,
  authorize('company.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const company = await prisma.company.findUnique({
      where: { id: getCompanyId(req) },
      include: { settings: true, branches: true },
    });
    sendSuccess(res, company);
  })
);

companyRouter.put(
  '/current',
  requireCompany,
  authorize('company.update'),
  validateBody(companySchema.partial()),
  asyncHandler(async (req: AuthRequest, res) => {
    const company = await prisma.company.update({
      where: { id: getCompanyId(req) },
      data: req.body,
    });
    sendSuccess(res, company);
  })
);

// Branches
companyRouter.get(
  '/branches',
  requireCompany,
  authorize('company.read'),
  validateQuery(z.object({ page: z.string().optional(), pageSize: z.string().optional(), search: z.string().optional() })),
  asyncHandler(async (req: AuthRequest, res) => {
    const { page, pageSize, search, skip } = getPagination(req.query);
    const where = {
      companyId: getCompanyId(req),
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.branch.findMany({ where, skip, take: pageSize, orderBy: { name: 'asc' } }),
      prisma.branch.count({ where }),
    ]);
    sendPaginated(res, items, total, page, pageSize);
  })
);

companyRouter.post(
  '/branches',
  requireCompany,
  authorize('company.update'),
  validateBody(branchSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const branch = await prisma.branch.create({
      data: { ...req.body, companyId: getCompanyId(req) },
    });
    sendSuccess(res, branch, 'Branch created', 201);
  })
);

companyRouter.put(
  '/branches/:id',
  requireCompany,
  authorize('company.update'),
  validateBody(branchSchema.partial()),
  asyncHandler(async (req: AuthRequest, res) => {
    const branch = await prisma.branch.findFirst({
      where: { id: paramId(req), companyId: getCompanyId(req) },
    });
    if (!branch) throw new AppError(404, 'Branch not found');
    const updated = await prisma.branch.update({ where: { id: branch.id }, data: req.body });
    sendSuccess(res, updated);
  })
);

companyRouter.delete(
  '/branches/:id',
  requireCompany,
  authorize('company.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const branch = await prisma.branch.findFirst({
      where: { id: paramId(req), companyId: getCompanyId(req) },
    });
    if (!branch) throw new AppError(404, 'Branch not found');
    await prisma.branch.delete({ where: { id: branch.id } });
    sendSuccess(res, { deleted: true });
  })
);
