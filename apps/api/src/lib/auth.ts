import { betterAuth } from 'better-auth/minimal';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '../infra/prisma';
import { authRedis } from '../infra/redis';
import { env } from '../config/env';
import { sendEmail } from './email';

const PREFIX = 'auth:';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  secondaryStorage: {
    get: async (key) => await authRedis.get(PREFIX + key),
    set: async (key, value, ttl) =>
      await authRedis.set(PREFIX + key, value, { EX: ttl }),
    delete: async (key) => {
      await authRedis.del(PREFIX + key);
    },
    getAndDelete: (key) => authRedis.getDel(PREFIX + key),
    increment: async (key, ttl) => {
      const [count] = await authRedis
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

  baseURL: env.baseURL,
  secret: env.betterAuthSecret,
  trustedOrigins: [env.frontendOrigin],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  socialProviders: {
    google: {
      prompt: 'select_account',
      clientId: [env.googleWebClientId],
      clientSecret: env.googleClientSecret,
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
