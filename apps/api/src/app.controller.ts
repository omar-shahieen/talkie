import {
  Controller,
  Get,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthCheck, HealthCheckResult } from '@nestjs/terminus';
import { AppService } from './app.service';
import type { LivenessCheckResult } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController implements OnModuleDestroy {
  private shuttingDown = false;

  constructor(private readonly appService: AppService) {}

  // First shutdown phase (before the HTTP server closes): flip readiness to 503.
  onModuleDestroy() {
    this.shuttingDown = true;
  }

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  // Liveness: process is up; never touches Postgres or Redis, so a dependency
  // outage never makes the orchestrator restart healthy pods.
  @Get('health')
  @Public()
  live(): LivenessCheckResult {
    return this.appService.checkLiveness();
  }

  // Readiness: 503 while Postgres/Redis are down and while draining for shutdown.
  @Get('ready')
  @Public()
  @HealthCheck()
  async ready(): Promise<HealthCheckResult> {
    if (this.shuttingDown) {
      throw new ServiceUnavailableException({
        status: 'shutting_down',
        info: {},
        error: {},
        details: {},
      });
    }
    return this.appService.checkHealth();
  }
}
