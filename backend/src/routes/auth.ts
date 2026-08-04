import { Router } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { sendSuccess } from '../utils/response';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

const forgotSchema = z.object({ email: z.string().email() });

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

authRouter.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const data = await authService.login(
      req.body.email,
      req.body.password,
      req.ip,
      req.headers['user-agent']
    );
    sendSuccess(res, data);
  })
);

authRouter.post(
  '/refresh',
  validateBody(refreshSchema),
  asyncHandler(async (req, res) => {
    const data = await authService.refresh(req.body.refreshToken);
    sendSuccess(res, data);
  })
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await authService.logout(req.body?.refreshToken);
    sendSuccess(res, { message: 'Logged out' });
  })
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const data = await authService.me(req.user!.id);
    sendSuccess(res, data);
  })
);

authRouter.post(
  '/forgot-password',
  validateBody(forgotSchema),
  asyncHandler(async (req, res) => {
    const data = await authService.forgotPassword(req.body.email);
    sendSuccess(res, data);
  })
);

authRouter.post(
  '/reset-password',
  validateBody(resetSchema),
  asyncHandler(async (req, res) => {
    const data = await authService.resetPassword(req.body.token, req.body.password);
    sendSuccess(res, data);
  })
);
