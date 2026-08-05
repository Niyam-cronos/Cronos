import 'dotenv/config';
import { createApp } from './app';
import { loadEnv } from './config/env';
import { startEmailWorker } from './workers/email.worker';
import { startAttendanceAlertScheduler } from './services/attendance-alert.service';

const env = loadEnv();
const app = createApp();

// Start BullMQ email worker
startEmailWorker();
startAttendanceAlertScheduler();

app.listen(env.API_PORT, () => {
  console.log(`🚀 Chronos API running on http://localhost:${env.API_PORT}`);
  console.log(`📧 Email queue worker active (Redis: ${env.REDIS_URL})`);
  if (env.FACE_SERVICE_URL) console.log(`🧠 Face service: ${env.FACE_SERVICE_URL}`);
});
