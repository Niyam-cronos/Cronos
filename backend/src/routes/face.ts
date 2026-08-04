import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize, requireCompany, type AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { sendSuccess } from '../utils/response';
import { getCompanyId } from '../utils/company';
import { paramId } from '../utils/params';
import { AppError } from '../middleware/error-handler';
import { prisma } from '../lib/prisma';
import * as faceService from '../services/face.service';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const faceRouter = Router();
faceRouter.use(authenticate, requireCompany);

async function resolveEmployeeId(req: AuthRequest, overrideId?: string): Promise<string> {
  if (overrideId && req.user!.permissions.includes('employees.update')) return overrideId;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.employeeId) throw new AppError(400, 'No employee profile linked');
  return user.employeeId;
}

faceRouter.post(
  '/register',
  authorize('employees.update'),
  upload.single('image'),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.file) throw new AppError(400, 'Image file required');
    const employeeId = await resolveEmployeeId(req, req.body.employeeId);
    const result = await faceService.registerFace(employeeId, req.file.buffer, getCompanyId(req));
    sendSuccess(res, result, 'Face registered', 201);
  })
);

faceRouter.post(
  '/verify',
  authorize('attendance.create'),
  upload.single('image'),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.file) throw new AppError(400, 'Image file required');
    const employeeId = await resolveEmployeeId(req, req.body.employeeId);
    const result = await faceService.verifyFaceImage(req.file.buffer, employeeId);
    sendSuccess(res, result);
  })
);

faceRouter.get(
  '/status/:employeeId',
  authorize('employees.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const status = await faceService.getFaceStatus(paramId(req, 'employeeId'));
    sendSuccess(res, status);
  })
);

faceRouter.delete(
  '/:employeeId',
  authorize('employees.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    await faceService.deleteFace(paramId(req, 'employeeId'));
    sendSuccess(res, { deleted: true });
  })
);
