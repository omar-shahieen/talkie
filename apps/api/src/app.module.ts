import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AccessControlModule } from './access-control/access-control.module';
import { LoggingModule } from './logging/logging.module';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpCacheInterceptor } from './common/interceptors/cache.interceptor';
import { RolesModule } from './roles/roles.module';
import { ChannelsModule } from './channels/channels.module';
import { ServersModule } from './servers/servers.module';
import { MessagesModule } from './messages/messages.module';
import { EventsModule } from './events/events.module';
import { MailModule } from './mail/mail.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { NotificationsModule } from './notifications/notifications.module';
import { PresenceModule } from './presence/presence.module';
import { BullModule } from '@nestjs/bullmq';
import { InvitationsModule } from './invitations/invitations.module';
import { FriendsModule } from './friends/friends.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClsModule } from 'nestjs-cls';
import { AuthJwtGuard } from './auth/guards/auth-jwt.guard';
import { ServerPermissionsGuard } from './access-control/server-permissions/serverPermissions.guard';
import { AppPermissionsGuard } from './access-control/app-permissions/appPermissions.guard';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { FilesModule } from './files/files.module';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsModule } from './common/metrics/metrics.module';
import { createKeyv } from '@keyv/redis';
import { LoggingService } from './logging/logging.service';
import { redisOptionsFromUrl } from './common/config/redis-url';
import { getDatabaseUrl, getRedisUrl } from './common/config/connection-urls';
import {
  attachErrorLogging,
  createHealthRedisClient,
  REDIS_HEALTH_CLIENT,
} from './common/config/redis-clients';

@Module({
  imports: [
    TerminusModule,
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService, LoggingService],
      useFactory: (config: ConfigService, logger: LoggingService) => {
        const redisUrl = getRedisUrl(config);
        const keyv = createKeyv(redisUrl);
        // runtime Redis drops must log, not crash with an unhandled 'error'
        attachErrorLogging(keyv, 'RedisCache', logger);
        attachErrorLogging(keyv.store as never, 'RedisCacheStore', logger);
        return {
          stores: [keyv],
          ttl: config.get<number>('CACHE_TTL', 5000), // in milliseconds
        };
      },
    }),

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/api/.env', '../apps/api/.env'],
    }),

    TypeOrmModule.forRootAsync({
      // postgres
      imports: [ConfigModule],
      inject: [ConfigService, LoggingService],
      useFactory: (config: ConfigService, logger: LoggingService) => ({
        type: 'postgres',
        url: getDatabaseUrl(config),
        retryAttempts: Number(config.get('DB_RETRY_ATTEMPTS') ?? 10),
        retryDelay: Number(config.get('DB_RETRY_DELAY_MS') ?? 3000),
        // pool + runtime resilience
        poolSize: Number(config.get('DB_POOL_MAX') || 20),
        connectTimeoutMS: Number(
          config.get('DB_CONNECT_TIMEOUT_PER_ATTEMPT_MS') || 5000,
        ),
        extra: {
          idleTimeoutMillis: 30_000,
          keepAlive: true,
          keepAliveInitialDelayMillis: 10_000,
        },
        // idle client errors (DB restart, network drop) must not crash the
        // process; pg.Pool evicts the broken client and reconnects on demand
        poolErrorHandler: (error: Error) =>
          logger.warn(`Postgres pool error: ${error.message}`, 'Postgres'),
        autoLoadEntities: true,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        subscribers: [__dirname + '/**/*.subscriber{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsTableName: 'typeorm_migrations',
        migrationsRun: config.get<string>('DB_MIGRATIONS_RUN') === 'true',
        synchronize:
          (config.get<string>('DB_SYNC') ??
            (config.get<string>('NODE_ENV') === 'production'
              ? 'false'
              : 'true')) === 'true',

        logging: config.get<boolean>('DB_LOGGING') || false,
      }),
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: redisOptionsFromUrl(getRedisUrl(configService)),
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

    // Register the ClsModule,
    ClsModule.forRoot({
      global: true,
      middleware: {
        // automatically mount the
        // ClsMiddleware for all routes
        mount: true,
      },
    }),
    // register promotheous for metrics

    PrometheusModule.register({
      //GET /metrics
      defaultMetrics: { enabled: true }, // CPU, memory, event loop lag — free
      defaultLabels: {
        app: 'Talkie',
      },
    }),

    // GLOBAL MODULES
    AuthModule,
    AccessControlModule,
    AuditModule,
    LoggingModule,
    EventsModule,
    MailModule,

    // APP_MODULES
    UsersModule,
    RolesModule,
    ChannelsModule,
    ServersModule,
    MessagesModule,
    NotificationsModule,
    PresenceModule,
    InvitationsModule,
    FriendsModule,
    FilesModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: REDIS_HEALTH_CLIENT,
      inject: [ConfigService, LoggingService],
      useFactory: (config: ConfigService, logger: LoggingService) =>
        createHealthRedisClient(getRedisUrl(config), logger),
    },
    { provide: APP_GUARD, useClass: AuthJwtGuard },
    { provide: APP_GUARD, useClass: ServerPermissionsGuard },
    { provide: APP_GUARD, useClass: AppPermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: CorrelationIdInterceptor },
    { provide: APP_INTERCEPTOR, useClass: HttpCacheInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
