import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getRedisConfig } from 'src/config/redis.config';
import { AUDIT_QUEUE_NAME } from './queue.constants';
import { AuditProcessor } from './processors/audit.processor';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = getRedisConfig(configService);
        return {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            db: redisConfig.db,
            ...(redisConfig.tls ? { tls: {} } : {}),
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: 200,
            removeOnFail: 500,
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: AUDIT_QUEUE_NAME,
    }),
  ],
  providers: [AuditProcessor],
  exports: [BullModule],
})
export class QueueModule {}
