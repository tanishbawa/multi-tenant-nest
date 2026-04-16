import { ConfigService } from '@nestjs/config';
import { RedisConfig } from './types';

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
};

export const getRedisConfig = (configService: ConfigService): RedisConfig => ({
  host: configService.get<string>('REDIS_HOST') ?? '127.0.0.1',
  port: parseNumber(configService.get<string>('REDIS_PORT'), 6379),
  password: configService.get<string>('REDIS_PASSWORD') || undefined,
  db: parseNumber(configService.get<string>('REDIS_DB'), 0),
  tls: parseBoolean(configService.get<string>('REDIS_TLS'), false),
});

export const getRedisUrl = (config: RedisConfig): string => {
  const protocol = config.tls ? 'rediss' : 'redis';
  const credentials = config.password
    ? `:${encodeURIComponent(config.password)}@`
    : '';

  return `${protocol}://${credentials}${config.host}:${config.port}/${config.db}`;
};
