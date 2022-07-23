/**
 * Instantiates a single instance PrismaClient and save it on the global object.
 * @link https://www.prisma.io/docs/support/help-articles/nextjs-prisma-client-dev-practices
 */
//  import { env } from '../env';
 import Redis from 'ioredis'

 const redisGlobal = global as typeof global & {
   redis?: Redis;
 }

 export const redis: Redis =
   redisGlobal.redis ||
   new Redis(process.env.REDIS_URL || '6379');

 if (process.env.NODE_ENV !== 'production') {
   redisGlobal.redis = redis;
 }
