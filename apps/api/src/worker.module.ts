import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ClsModule } from 'nestjs-cls';
import { EventsModule } from './events/events.module';
import { redisOptionsFromUrl } from './common/config/redis-url';
import { LoggingModule } from './logging/logging.module';
import { LoggingService } from './logging/logging.service';
import { MailModule } from './mail/mail.module';
import { MailWorker } from './mail/mail.worker';
import { AuditModule } from './audit/audit.module';
import { AuditWorker } from './audit/auditLogger.worker';
import { MessagesModule } from './messages/messages.module';
import { MessageRetentionConsumer } from './messages/message-retention.queue';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { attachErrorLogging } from './common/config/redis-clients';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/api/.env', '../apps/api/.env'],
    }),

    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: false,
      },
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService, LoggingService],
      useFactory: (config: ConfigService, logger: LoggingService) => {
        const keyv = createKeyv(config.getOrThrow<string>('REDIS_URL'));
        // runtime Redis drops must log, not crash with an unhandled 'error'
        attachErrorLogging(keyv, 'RedisCache', logger);
        attachErrorLogging(keyv.store as never, 'RedisCacheStore', logger);
        return {
          stores: [keyv],
          ttl: config.get<number>('CACHE_TTL', 5000), // in milliseconds
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService, LoggingService],
      useFactory: (config: ConfigService, logger: LoggingService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        retryAttempts: Number(config.get('DB_RETRY_ATTEMPTS') ?? 10),
        retryDelay: Number(config.get('DB_RETRY_DELAY_MS') ?? 3000),
        connectTimeoutMS: Number(
          config.get('DB_CONNECT_TIMEOUT_PER_ATTEMPT_MS') || 5000,
        ),
        extra: {
          idleTimeoutMillis: 30_000,
          keepAlive: true,
          keepAliveInitialDelayMillis: 10_000,
        },
        poolErrorHandler: (error: Error) =>
          logger.warn(`Postgres pool error: ${error.message}`, 'Postgres'),
        autoLoadEntities: true,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        subscribers: [__dirname + '/**/*.subscriber{.ts,.js}'],
        synchronize: false,
      }),
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: redisOptionsFromUrl(
          configService.getOrThrow<string>('REDIS_URL'),
        ),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
          },
          removeOnComplete: 300,
          removeOnFail: 300,
        },
      }),
    }),
    AuthModule,
    LoggingModule,
    MailModule,
    AuditModule,
    MessagesModule,
    EventsModule,
  ],
  providers: [AuditWorker, MailWorker, MessageRetentionConsumer],
})
export class WorkerModule {}
