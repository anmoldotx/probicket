import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),

  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email(),
  GOOGLE_PRIVATE_KEY: z
    .string()
    .min(1)
    .transform((v) => v.replace(/\\n/g, '\n')),
  SHEETS_SPREADSHEET_ID: z.string().min(1),
  SHEETS_PLAYERS_TAB: z.string().default('Players'),
  SHEETS_FEEDBACK_TAB: z.string().default('Feedback'),
  PLAYER_CACHE_TTL_MS: z.string().transform(Number).default('3600000'),

  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),

  SESSION_TTL_MS: z.string().transform(Number).default('1800000'),
  ALLOWED_ORIGIN: z.string().default('http://localhost:3000'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
