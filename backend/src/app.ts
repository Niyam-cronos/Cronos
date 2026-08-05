import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { loadEnv } from './config/env';
import { getUploadsDir } from './lib/storage';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { companyRouter } from './routes/company';
import { mastersRouter } from './routes/masters';
import { employeesRouter } from './routes/employees';
import { attendanceRouter } from './routes/attendance';
import { leaveRouter } from './routes/leave';
import { dashboardRouter, notificationsRouter } from './routes/dashboard';
import { faceRouter } from './routes/face';
import { settingsRouter } from './routes/settings';
import { errorHandler } from './middleware/error-handler';

export function createApp() {
  const env = loadEnv();
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.WEB_URL, credentials: true }));
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(getUploadsDir()));

  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/company', companyRouter);
  app.use('/api/v1/masters', mastersRouter);
  app.use('/api/v1/employees', employeesRouter);
  app.use('/api/v1/attendance', attendanceRouter);
  app.use('/api/v1/leave', leaveRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/notifications', notificationsRouter);
  app.use('/api/v1/face', faceRouter);
  app.use('/api/v1/settings', settingsRouter);

  app.use(errorHandler);

  return app;
}
