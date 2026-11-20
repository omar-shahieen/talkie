import { Inject, Injectable } from '@nestjs/common';
import {
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  HealthIndicatorService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import type { Redis } from 'ioredis';
import { REDIS_HEALTH_CLIENT } from './common/config/redis-clients';

export interface LivenessCheckResult {
  status: 'ok';
  uptime: number;
}

@Injectable()
export class AppService {
  private static readonly PROBE_TIMEOUT_MS = 2000;

  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly healthIndicatorService: HealthIndicatorService,
    @Inject(REDIS_HEALTH_CLIENT) private readonly redis: Redis,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  /** Liveness: process is up. Must never touch Postgres or Redis. */
  checkLiveness(): LivenessCheckResult {
    return { status: 'ok', uptime: Math.floor(process.uptime()) };
  }

  /** Readiness: can this instance serve traffic right now? */
  async checkHealth(): Promise<HealthCheckResult> {
    return this.health.check([
      () =>
        this.db.pingCheck('postgres', {
          timeout: AppService.PROBE_TIMEOUT_MS,
        }),
      () => this.checkRedis(),
    ]);
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check('redis');

    if (this.redis.status !== 'ready') {
      return indicator.down({
        message: `Redis client not ready (${this.redis.status})`,
      });
    }

    let timer: NodeJS.Timeout | undefined;
    try {
      const reply = await Promise.race([
        this.redis.ping(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Health check probe timed out')),
            AppService.PROBE_TIMEOUT_MS,
          );
        }),
      ]);

      if (reply !== 'PONG') {
        return indicator.down({ message: 'Redis ping value mismatch' });
      }

      return indicator.up();
    } catch (error) {
      return indicator.down({
        message:
          error instanceof Error ? error.message : 'Redis health check failed',
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
