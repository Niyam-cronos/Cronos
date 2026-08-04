import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifyAccessToken } from '../lib/jwt';
import { AppError } from './error-handler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    companyId: string | null;
    roles: string[];
    permissions: string[];
  };
}

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Authentication required'));
  }

  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findFirst({
      where: { id: payload.sub, isActive: true, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user) return next(new AppError(401, 'Invalid or expired token'));

    const roles = user.userRoles.map((ur) => ur.role.slug);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.slug))
      ),
    ];

    req.user = {
      id: user.id,
      email: user.email,
      companyId: user.companyId,
      roles,
      permissions,
    };
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}

export function authorize(...required: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'Authentication required'));

    const hasAccess =
      req.user.roles.includes('super_admin') ||
      required.every((p) => req.user!.permissions.includes(p));

    if (!hasAccess) return next(new AppError(403, 'Insufficient permissions'));
    next();
  };
}

export function requireCompany(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.user?.companyId && !req.user?.roles.includes('super_admin')) {
    return next(new AppError(403, 'Company context required'));
  }
  next();
}
