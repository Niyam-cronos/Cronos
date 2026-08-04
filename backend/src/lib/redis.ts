import Redis from 'ioredis';
import { loadEnv } from '../config/env';

let connection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!connection) {
    const env = loadEnv();
    connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}
