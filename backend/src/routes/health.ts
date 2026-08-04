import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  let dbStatus = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'cronos-api',
      version: '0.1.0',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    },
  });
});
