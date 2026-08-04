import { Worker } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { sendEmail, type SendEmailOptions } from '../services/email.service';
import { prisma } from '../lib/prisma';
import type { EmailJobData } from '../queues/email.queue';

export function startEmailWorker() {
  const worker = new Worker<EmailJobData>(
    'email',
    async (job) => {
      const { to, subject, html, text, companyId, notificationId } = job.data;
      const result = await sendEmail({ to, subject, html, text, companyId });

      if (notificationId) {
        await prisma.notificationLog.create({
          data: {
            notificationId,
            channel: 'email',
            status: 'sent',
          },
        });
      }

      return result;
    },
    { connection: getRedisConnection(), concurrency: 5 }
  );

  worker.on('failed', async (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} failed:`, err.message);
    if (job?.data.notificationId) {
      await prisma.notificationLog.create({
        data: {
          notificationId: job.data.notificationId,
          channel: 'email',
          status: 'failed',
          error: err.message,
        },
      });
    }
  });

  worker.on('completed', (job) => {
    console.log(`[EmailWorker] Sent email to ${job.data.to}`);
  });

  console.log('📧 Email worker started');
  return worker;
}
