import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, requireCompany, type AuthRequest } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { sendSuccess, sendPaginated } from '../utils/response';
import { getCompanyId, getPagination } from '../utils/company';
import { paramId } from '../utils/params';
import { AppError } from '../middleware/error-handler';
import { validateGeofence } from '../services/geofence.service';
import * as faceService from '../services/face.service';
import { performCheckIn } from '../services/attendance.service';

export const attendanceRouter = Router();
attendanceRouter.use(authenticate, requireCompany);

const checkInSchema = z.object({
  employeeId: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  source: z.string().default('web'),
  requireGeofence: z.boolean().optional().default(false),
  requireFace: z.boolean().optional().default(false),
});

async function resolveEmployeeId(req: AuthRequest, overrideId?: string): Promise<string> {
  if (overrideId && req.user!.permissions.includes('attendance.approve')) return overrideId;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.employeeId) throw new AppError(400, 'No employee profile linked to this account');
  return user.employeeId;
}

attendanceRouter.post(
  '/check-in',
  authorize('attendance.create'),
  validateBody(checkInSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const employeeId = await resolveEmployeeId(req, req.body.employeeId);
    const companyId = getCompanyId(req);

    if (req.body.requireGeofence || (req.body.latitude != null && req.body.longitude != null)) {
      if (req.body.latitude == null || req.body.longitude == null) {
        throw new AppError(400, 'Location (latitude, longitude) required for geofenced check-in');
      }
      await validateGeofence(companyId, req.body.latitude, req.body.longitude);
    }

    const { attendance, evaluation } = await performCheckIn(companyId, employeeId, {
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      source: req.body.source,
    });

    sendSuccess(res, { attendance, evaluation }, 'Checked in');
  })
);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

attendanceRouter.post(
  '/check-in-with-face',
  authorize('attendance.create'),
  upload.single('image'),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.file) throw new AppError(400, 'Face image required');

    const employeeId = await resolveEmployeeId(req, req.body?.employeeId);
    const companyId = getCompanyId(req);
    const latitude = req.body?.latitude ? parseFloat(req.body.latitude) : undefined;
    const longitude = req.body?.longitude ? parseFloat(req.body.longitude) : undefined;

    if (latitude != null && longitude != null) {
      await validateGeofence(companyId, latitude, longitude);
    }

    const faceResult = await faceService.verifyFaceImage(req.file.buffer, employeeId);
    if (!faceResult.verified) {
      throw new AppError(403, `Face verification failed (confidence: ${faceResult.confidence})`);
    }

    const { attendance, evaluation } = await performCheckIn(companyId, employeeId, {
      latitude,
      longitude,
      source: 'face_recognition',
    });

    sendSuccess(res, { attendance, evaluation, faceVerification: faceResult }, 'Checked in with face verification');
  })
);

attendanceRouter.post(
  '/check-out',
  authorize('attendance.create'),
  validateBody(checkInSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const employeeId = await resolveEmployeeId(req, req.body.employeeId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });
    if (!attendance?.checkIn) throw new AppError(400, 'Not checked in today');
    if (attendance.checkOut) throw new AppError(400, 'Already checked out');

    const now = new Date();
    const totalHours = (now.getTime() - attendance.checkIn!.getTime()) / 3600000;

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { checkOut: now, totalHours },
    });

    await prisma.attendanceLog.create({
      data: {
        attendanceId: attendance.id,
        type: 'check_out',
        timestamp: now,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        source: req.body.source,
      },
    });

    sendSuccess(res, updated, 'Checked out');
  })
);

attendanceRouter.get(
  '/',
  authorize('attendance.read'),
  validateQuery(z.object({ page: z.string().optional(), pageSize: z.string().optional(), employeeId: z.string().optional(), date: z.string().optional() })),
  asyncHandler(async (req: AuthRequest, res) => {
    const { page, pageSize, skip } = getPagination(req.query);
    const where: Record<string, unknown> = { companyId: getCompanyId(req) };
    const staff = req.user!.permissions.includes('employees.read') || req.user!.permissions.includes('attendance.approve');
    if (!staff) {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (!user?.employeeId) throw new AppError(400, 'No employee profile linked');
      where.employeeId = user.employeeId;
    }
    if (req.query.employeeId && staff) where.employeeId = req.query.employeeId;
    if (req.query.date) {
      const d = new Date(req.query.date as string);
      d.setHours(0, 0, 0, 0);
      where.date = d;
    }
    const [items, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { date: 'desc' },
        include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      }),
      prisma.attendance.count({ where }),
    ]);
    sendPaginated(res, items, total, page, pageSize);
  })
);

attendanceRouter.post(
  '/corrections',
  authorize('attendance.create'),
  validateBody(z.object({ date: z.string(), type: z.string(), reason: z.string(), employeeId: z.string().optional() })),
  asyncHandler(async (req: AuthRequest, res) => {
    const request = await prisma.attendanceRequest.create({
      data: {
        employeeId: req.body.employeeId || req.user!.id,
        date: new Date(req.body.date),
        type: req.body.type,
        reason: req.body.reason,
        status: 'pending',
      },
    });
    sendSuccess(res, request, 'Correction request submitted', 201);
  })
);

attendanceRouter.patch(
  '/corrections/:id',
  authorize('attendance.approve'),
  validateBody(z.object({ status: z.enum(['approved', 'rejected']), notes: z.string().optional() })),
  asyncHandler(async (req: AuthRequest, res) => {
    const updated = await prisma.attendanceRequest.update({
      where: { id: paramId(req) },
      data: { status: req.body.status, reviewedBy: req.user!.id, reviewedAt: new Date() },
    });
    sendSuccess(res, updated);
  })
);
