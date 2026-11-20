import { ServiceUnavailableException } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { REDIS_HEALTH_CLIENT } from './common/config/redis-clients';

describe('AppController', () => {
  let moduleRef: TestingModule;
  let appController: AppController;
  let mockDataSource: {
    isInitialized: boolean;
    options: { type: string };
    query: jest.Mock;
  };
  let mockRedis: { status: string; ping: jest.Mock };

  beforeEach(async () => {
    mockDataSource = {
      isInitialized: true,
      options: { type: 'postgres' },
      query: jest.fn(() =>
        mockDataSource.isInitialized
          ? Promise.resolve([{ '?column?': 1 }])
          : Promise.reject(new Error('DataSource not initialized')),
      ),
    };
    mockRedis = {
      status: 'ready',
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    moduleRef = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [AppController],
      providers: [
        AppService,
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: REDIS_HEALTH_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    appController = moduleRef.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('liveness (/health)', () => {
    it('returns ok without touching postgres or redis', () => {
      expect(appController.live()).toEqual({
        status: 'ok',
        uptime: expect.any(Number),
      });
      expect(mockDataSource.query).not.toHaveBeenCalled();
      expect(mockRedis.ping).not.toHaveBeenCalled();
    });

    it('stays ok when both dependencies are down', () => {
      mockDataSource.isInitialized = false;
      mockRedis.status = 'reconnecting';

      expect(appController.live().status).toBe('ok');
      expect(mockDataSource.query).not.toHaveBeenCalled();
      expect(mockRedis.ping).not.toHaveBeenCalled();
    });

    it('stays ok after shutdown has started', async () => {
      await moduleRef.close();

      expect(appController.live().status).toBe('ok');
    });
  });

  describe('readiness (/ready) & graceful shutdown hook', () => {
    it('returns ok when both postgres and redis are healthy', async () => {
      await expect(appController.ready()).resolves.toEqual({
        status: 'ok',
        info: {
          postgres: { status: 'up' },
          redis: { status: 'up' },
        },
        error: {},
        details: {
          postgres: { status: 'up' },
          redis: { status: 'up' },
        },
      });
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('throws 503 while the DataSource is not initialized', async () => {
      mockDataSource.isInitialized = false;

      await expect(appController.ready()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('throws 503 error when postgres check fails', async () => {
      mockDataSource.query.mockRejectedValueOnce(
        new Error('DB connection lost'),
      );

      await expect(appController.ready()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('throws 503 error when redis ping fails', async () => {
      mockRedis.ping.mockRejectedValueOnce(new Error('connection closed'));

      await expect(appController.ready()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('throws 503 when the redis client is not ready (reconnecting)', async () => {
      mockRedis.status = 'reconnecting';

      await expect(appController.ready()).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(mockRedis.ping).not.toHaveBeenCalled();
    });

    it('recovers to ok once the dependencies are back', async () => {
      mockDataSource.isInitialized = false;
      await expect(appController.ready()).rejects.toThrow(
        ServiceUnavailableException,
      );

      mockDataSource.isInitialized = true;
      await expect(appController.ready()).resolves.toMatchObject({
        status: 'ok',
      });
    });

    it('throws 503 shutting_down after OnModuleDestroy runs', async () => {
      await moduleRef.close();

      await expect(appController.ready()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
