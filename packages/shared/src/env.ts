import { z } from 'zod';

export function loadEnv<T extends z.ZodRawShape>(
  shape: T,
  source: Record<string, string | undefined>,
) {
  const values = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== ''),
  );

  const result = z.object(shape).safeParse(values);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
