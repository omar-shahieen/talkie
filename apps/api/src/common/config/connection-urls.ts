import { ConfigService } from '@nestjs/config';

export function getDatabaseUrl(config: ConfigService): string {
  const dbUrl = config.get<string>('DATABASE_URL');
  if (dbUrl) return dbUrl;
  const host = config.get<string>('DB_HOST', 'localhost');
  const port = config.get<number>('DB_PORT', 5432);
  const user = config.get<string>('DB_USERNAME', 'postgres');
  const pass = config.get<string>('DB_PASSWORD', 'postgres');
  const name = config.get<string>('DB_NAME', 'talkie');
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${name}`;
}

export function getRedisUrl(config: ConfigService): string {
  const redisUrl = config.get<string>('REDIS_URL');
  if (redisUrl) return redisUrl;
  const host = config.get<string>('REDIS_HOST', 'localhost');
  const port = config.get<number>('REDIS_PORT', 6379);
  const pass = config.get<string>('REDIS_PASSWORD');
  const isTls = config.get<string>('REDIS_TLS') === 'true';
  const protocol = isTls ? 'rediss' : 'redis';
  const auth = pass ? `:${encodeURIComponent(pass)}@` : '';
  return `${protocol}://${auth}${host}:${port}`;
}
