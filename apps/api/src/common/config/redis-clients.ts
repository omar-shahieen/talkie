import { Redis } from 'ioredis';
import { LoggingService } from '../../logging/logging.service';
import { ioRedisOptionsFromUrl } from './redis-url';

export const REDIS_HEALTH_CLIENT = Symbol('REDIS_HEALTH_CLIENT');

type ErrorEmitter = {
  on: (event: 'error', listener: (error: unknown) => void) => unknown;
};

/**
 * Attach an 'error' listener so a runtime Redis drop never surfaces as an
 * unhandled 'error' event. Logs are de-duplicated (same message at most once
 * per 30s) because reconnect attempts emit an error each time.
 */
export function attachErrorLogging(
  emitter: ErrorEmitter | undefined | null,
  name: string,
  logger: LoggingService,
): void {
  if (!emitter || typeof emitter.on !== 'function') return;
  let lastMessage = '';
  let lastAt = 0;
  emitter.on('error', (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    const now = Date.now();
    if (message === lastMessage && now - lastAt < 30_000) return;
    lastMessage = message;
    lastAt = now;
    logger.warn(`Redis error (auto-reconnect active): ${message}`, name);
  });
}

/**
 * Long-lived client used for readiness probes. Connects on construction,
 * reconnects automatically with backoff + jitter, and fails commands fast
 * while disconnected.
 */
export function createHealthRedisClient(
  redisUrl: string,
  logger: LoggingService,
): Redis {
  const client = new Redis({
    ...ioRedisOptionsFromUrl(redisUrl),
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
  });
  attachErrorLogging(client, 'RedisHealth', logger);
  return client;
}
