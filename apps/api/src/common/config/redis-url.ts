import type { ConnectionOptions } from 'bullmq';
import type { RedisOptions } from 'ioredis';

/**
 * Runtime reconnect delay for ioredis clients: exponential backoff
 * (500ms, 1s, 2s, 4s, 8s ...) capped at 10s, with +-25% jitter.
 */
export function redisRetryDelay(times: number): number {
  const exponential = Math.min(10_000, 500 * 2 ** Math.max(0, times - 1));
  return Math.floor(exponential * (0.75 + Math.random() * 0.5));
}

/**
 * Converts a REDIS_URL (redis:// or rediss://) into ioredis options.
 * `rediss://` enables TLS.
 *
 * Example: rediss://default:secret@host:6379/0
 */
export function ioRedisOptionsFromUrl(redisUrl: string): RedisOptions {
  const url = new URL(redisUrl);

  const dbPath = url.pathname.replace('/', '');
  const db = dbPath ? Number(dbPath) : undefined;

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    ...(db !== undefined && !Number.isNaN(db) ? { db } : {}),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    retryStrategy: redisRetryDelay,
  };
}

/** BullMQ/ioredis connection options (same shape, BullMQ typing). */
export function redisOptionsFromUrl(redisUrl: string): ConnectionOptions {
  return ioRedisOptionsFromUrl(redisUrl) as unknown as ConnectionOptions;
}
