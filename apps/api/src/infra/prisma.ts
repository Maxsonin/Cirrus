import { createPrisma } from '@cirrus/db';

import { env } from '../config/env';

export const prisma = createPrisma(env.databaseUrl);
