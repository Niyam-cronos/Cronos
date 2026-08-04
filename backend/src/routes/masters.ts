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

type ModelName =
  | 'department'
  | 'designation'
  | 'employmentType'
  | 'leaveType'
  | 'holidayGroup'
  | 'officeLocation'
  | 'shiftType'
  | 'timeSlot'
  | 'skill'
  | 'assetCategory'
  | 'documentType';

interface MasterConfig {
  model: ModelName;
  permission: string;
  searchFields?: string[];
}

const paginationQuery = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
});

export function createMasterRouter(config: MasterConfig) {
  const router = Router();
  router.use(authenticate, requireCompany);

  const delegate = prisma[config.model] as {
    findMany: (args: object) => Promise<object[]>;
    count: (args: object) => Promise<number>;
    create: (args: object) => Promise<object>;
    update: (args: object) => Promise<object>;
    delete: (args: object) => Promise<object>;
    findFirst: (args: object) => Promise<object | null>;
  };

  router.get(
    '/',
    authorize(`${config.permission}.read`),
    validateQuery(paginationQuery),
    asyncHandler(async (req: AuthRequest, res) => {
      const { page, pageSize, search, skip } = getPagination(req.query);
      const where: Record<string, unknown> = { companyId: getCompanyId(req) };
      if (search && config.searchFields?.length) {
        where.OR = config.searchFields.map((field) => ({
          [field]: { contains: search, mode: 'insensitive' },
        }));
      }
      const [items, total] = await Promise.all([
        delegate.findMany({ where, skip, take: pageSize, orderBy: { name: 'asc' } }),
        delegate.count({ where }),
      ]);
      sendPaginated(res, items, total, page, pageSize);
    })
  );

  router.post(
    '/',
    authorize(`${config.permission}.create`),
    asyncHandler(async (req: AuthRequest, res) => {
      const item = await delegate.create({
        data: { ...req.body, companyId: getCompanyId(req) },
      });
      sendSuccess(res, item, 'Created', 201);
    })
  );

  router.get(
    '/:id',
    authorize(`${config.permission}.read`),
    asyncHandler(async (req: AuthRequest, res) => {
      const item = await delegate.findFirst({
        where: { id: paramId(req), companyId: getCompanyId(req) },
      });
      if (!item) throw new AppError(404, 'Not found');
      sendSuccess(res, item);
    })
  );

  router.put(
    '/:id',
    authorize(`${config.permission}.update`),
    asyncHandler(async (req: AuthRequest, res) => {
      const existing = await delegate.findFirst({
        where: { id: paramId(req), companyId: getCompanyId(req) },
      });
      if (!existing) throw new AppError(404, 'Not found');
      const item = await delegate.update({ where: { id: paramId(req) }, data: req.body });
      sendSuccess(res, item);
    })
  );

  router.delete(
    '/:id',
    authorize(`${config.permission}.delete`),
    asyncHandler(async (req: AuthRequest, res) => {
      const existing = await delegate.findFirst({
        where: { id: paramId(req), companyId: getCompanyId(req) },
      });
      if (!existing) throw new AppError(404, 'Not found');
      await delegate.delete({ where: { id: paramId(req) } });
      sendSuccess(res, { deleted: true });
    })
  );

  return router;
}

export const mastersRouter = Router();

mastersRouter.use('/departments', createMasterRouter({ model: 'department', permission: 'masters', searchFields: ['name', 'code'] }));
mastersRouter.use('/designations', createMasterRouter({ model: 'designation', permission: 'masters', searchFields: ['name', 'code'] }));
mastersRouter.use('/employment-types', createMasterRouter({ model: 'employmentType', permission: 'masters', searchFields: ['name', 'code'] }));
mastersRouter.use('/leave-types', createMasterRouter({ model: 'leaveType', permission: 'masters', searchFields: ['name', 'code'] }));
mastersRouter.use('/holiday-groups', createMasterRouter({ model: 'holidayGroup', permission: 'masters', searchFields: ['name'] }));
mastersRouter.use('/locations', createMasterRouter({ model: 'officeLocation', permission: 'masters', searchFields: ['name'] }));
mastersRouter.use('/shift-types', createMasterRouter({ model: 'shiftType', permission: 'masters', searchFields: ['name', 'code'] }));
mastersRouter.use('/time-slots', createMasterRouter({ model: 'timeSlot', permission: 'masters', searchFields: ['name'] }));
mastersRouter.use('/skills', createMasterRouter({ model: 'skill', permission: 'masters', searchFields: ['name'] }));
mastersRouter.use('/asset-categories', createMasterRouter({ model: 'assetCategory', permission: 'masters', searchFields: ['name', 'code'] }));
mastersRouter.use('/document-types', createMasterRouter({ model: 'documentType', permission: 'masters', searchFields: ['name', 'code'] }));

// Holidays (special - has date field)
mastersRouter.get(
  '/holidays',
  authenticate,
  requireCompany,
  authorize('masters.read'),
  validateQuery(paginationQuery),
  asyncHandler(async (req: AuthRequest, res) => {
    const { page, pageSize, skip } = getPagination(req.query);
    const where = { companyId: getCompanyId(req) };
    const [items, total] = await Promise.all([
      prisma.holiday.findMany({ where, skip, take: pageSize, orderBy: { date: 'asc' } }),
      prisma.holiday.count({ where }),
    ]);
    sendPaginated(res, items, total, page, pageSize);
  })
);

mastersRouter.post(
  '/holidays',
  authenticate,
  requireCompany,
  authorize('masters.create'),
  validateBody(z.object({ name: z.string(), date: z.string(), holidayGroupId: z.string().optional(), isOptional: z.boolean().optional() })),
  asyncHandler(async (req: AuthRequest, res) => {
    const holiday = await prisma.holiday.create({
      data: { ...req.body, date: new Date(req.body.date), companyId: getCompanyId(req) },
    });
    sendSuccess(res, holiday, 'Created', 201);
  })
);
