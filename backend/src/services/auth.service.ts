import { prisma } from '../lib/prisma';
import { hashPassword, comparePassword } from '../lib/password';
import { signAccessToken, signRefreshToken, parseExpiresIn } from '../lib/jwt';
import { generateToken } from '../lib/token';
import { loadEnv } from '../config/env';
import { AppError } from '../middleware/error-handler';
import { queueEmail } from '../queues/email.queue';
import { buildPasswordResetEmail, buildLoginOtpEmail } from './email.service';

const env = loadEnv();
const OTP_EXPIRY_MS = 10 * 60 * 1000;

async function userUsesOtpLogin(userId: string): Promise<boolean> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  const roles = userRoles.map((ur) => ur.role.slug);
  if (roles.length === 0) return false;
  return roles.every((slug) => slug === 'employee');
}

function generateOtpCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function issueAuthTokens(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    companyId: user.companyId,
  });
  const refreshToken = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN)),
    },
  });

  const profile = await getUserAuthProfile(user.id);
  return { accessToken, refreshToken, user: profile };
}

async function getUserAuthProfile(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: { rolePermissions: { include: { permission: true } } },
          },
        },
      },
    },
  });

  const roles = user.userRoles.map((ur) => ur.role.slug);
  const permissions = [
    ...new Set(
      user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.slug))
    ),
  ];

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    companyId: user.companyId,
    roles,
    permissions,
  };
}

export async function login(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  const success = !!(user && (await comparePassword(password, user.passwordHash)));

  if (user) {
    await prisma.loginHistory.create({
      data: { userId: user.id, ipAddress, userAgent, success },
    });
  }

  if (!user || !success) throw new AppError(401, 'Invalid email or password');
  if (!user.isActive) throw new AppError(403, 'Account is deactivated');

  if (await userUsesOtpLogin(user.id)) {
    throw new AppError(400, 'Employees must sign in with the email code sent to their inbox');
  }

  return issueAuthTokens(user.id);
}

export async function getLoginMethod(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) {
    return { method: 'password' as const };
  }
  const usesOtp = await userUsesOtpLogin(user.id);
  return { method: usesOtp ? ('otp' as const) : ('password' as const) };
}

export async function requestLoginOtp(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) {
    return { message: 'If this email is registered, a login code has been sent' };
  }
  if (!(await userUsesOtpLogin(user.id))) {
    throw new AppError(400, 'This account uses password login');
  }

  const code = generateOtpCode();

  await prisma.loginOtp.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.loginOtp.create({
    data: {
      userId: user.id,
      code,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    },
  });

  await queueEmail({
    to: user.email,
    subject: 'Your Chronos login code',
    html: buildLoginOtpEmail(user.firstName, code),
    companyId: user.companyId ?? undefined,
  });

  if (env.NODE_ENV === 'development') {
    console.log(`[DEV] Login OTP for ${email}: ${code}`);
  }

  return {
    message: 'A 4-digit login code has been sent to your email',
  };
}

export async function verifyLoginOtp(
  email: string,
  otp: string,
  ipAddress?: string,
  userAgent?: string
) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new AppError(401, 'Invalid email or code');

  const record = await prisma.loginOtp.findFirst({
    where: {
      userId: user.id,
      code: otp,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  const success = !!record;
  await prisma.loginHistory.create({
    data: { userId: user.id, ipAddress, userAgent, success },
  });

  if (!success) throw new AppError(401, 'Invalid or expired code');
  if (!user.isActive) throw new AppError(403, 'Account is deactivated');

  await prisma.loginOtp.update({ where: { id: record!.id }, data: { usedAt: new Date() } });

  return issueAuthTokens(user.id);
}

export async function refresh(refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Invalid refresh token');
  }

  const user = stored.user;
  if (!user.isActive) throw new AppError(403, 'Account is deactivated');

  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    companyId: user.companyId,
  });
  const newRefreshToken = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN)),
    },
  });

  const profile = await getUserAuthProfile(user.id);
  return { accessToken, refreshToken: newRefreshToken, user: profile };
}

export async function logout(refreshToken?: string) {
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
}

export async function me(userId: string) {
  return getUserAuthProfile(userId);
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return { message: 'If the email exists, a reset link has been sent' };

  const token = generateToken();
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 3600000),
    },
  });

  const resetUrl = `${env.WEB_URL}/reset-password?token=${token}`;

  await queueEmail({
    to: user.email,
    subject: 'Reset your Chronos password',
    html: buildPasswordResetEmail(user.firstName, resetUrl),
    companyId: user.companyId ?? undefined,
  });

  if (env.NODE_ENV === 'development') {
    console.log(`[DEV] Password reset token for ${email}: ${token}`);
    console.log(`[DEV] Reset URL: ${resetUrl}`);
  }

  return {
    message: 'If the email exists, a reset link has been sent',
    ...(env.NODE_ENV === 'development' ? { token, resetUrl } : {}),
  };
}

export async function resetPassword(token: string, password: string) {
  const reset = await prisma.passwordReset.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    throw new AppError(400, 'Invalid or expired reset token');
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
    prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    prisma.refreshToken.deleteMany({ where: { userId: reset.userId } }),
  ]);

  return { message: 'Password reset successful' };
}
