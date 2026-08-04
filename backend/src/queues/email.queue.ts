import { Queue } from 'bullmq';
import { getRedisConnection } from '../lib/redis';

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  companyId?: string;
  notificationId?: string;
}

export const emailQueue = new Queue<EmailJobData>('email', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export async function queueEmail(data: EmailJobData) {
  return emailQueue.add('send-email', data);
}
