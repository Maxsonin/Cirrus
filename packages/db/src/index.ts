import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/prisma/client';

export * from './generated/prisma/client';

export function createPrisma(databaseUrl: string) {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}
