import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (prismaInstance) return prismaInstance;

  prismaInstance = new PrismaClient({
    log: [{ level: 'error', emit: 'event' }],
  });

  prismaInstance.$on('error' as never, (e: unknown) => {
    logger.error({ event: e }, 'Worker Prisma error');
  });

  return prismaInstance;
}

export async function closePrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
