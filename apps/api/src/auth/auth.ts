import { betterAuth } from 'better-auth/minimal';
import { prismaAdapter } from 'better-auth/adapters/prisma';

import { env } from '../config/env';
import { sendEmail } from '../infra/email';
import { prisma } from '../infra/prisma';
import { redis } from '../infra/redis';

const PREFIX = 'auth:';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  secondaryStorage: {
    get: async (key) => await redis.get(PREFIX + key),
    set: async (key, value, ttl) =>
      await redis.set(PREFIX + key, value, { EX: ttl }),
    delete: async (key) => {
      await redis.del(PREFIX + key);
    },
    getAndDelete: (key) => redis.getDel(PREFIX + key),
    increment: async (key, ttl) => {
      const [count] = await redis
        .multi()
        .incr(PREFIX + key)
        .expire(PREFIX + key, ttl, 'NX')
        .exec();
      return Number(count);
    },
  },

  rateLimit: {
    storage: 'secondary-storage',
  },

  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.FRONTEND_ORIGIN],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  socialProviders: {
    google: {
      prompt: 'select_account',
      clientId: [env.GOOGLE_WEB_CLIENT_ID],
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Confirm your email',
        html: `<a href="${url}">Confirm</a>`,
      });
    },
  },
});
