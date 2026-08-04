import 'dotenv/config';
import { createApp } from './app';
import { loadEnv } from './config/env';
import { startEmailWorker } from './workers/email.worker';

const env = loadEnv();
const app = createApp();

// Start BullMQ email worker
startEmailWorker();

app.listen(env.API_PORT, () => {
  console.log(`🚀 Cronos API running on http://localhost:${env.API_PORT}`);
  console.log(`📧 Email queue worker active (Redis: ${env.REDIS_URL})`);
  if (env.FACE_SERVICE_URL) console.log(`🧠 Face service: ${env.FACE_SERVICE_URL}`);
});
