import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().min(1).default('localhost'),
    PORT: z.coerce.number().int().min(0).max(65535).default(4000),
});

export const env = envSchema.parse(process.env);

export type Env = typeof env;
