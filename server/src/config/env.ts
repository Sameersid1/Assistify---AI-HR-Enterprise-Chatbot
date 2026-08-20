import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Environment loader.
 *
 * Rule (M1 guide §Phase-0): fail fast and loudly if a required var is missing.
 * A server that boots without JWT_ACCESS_SECRET and only breaks at first login
 * is worse than one that refuses to start.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  // .trim() is load-bearing, not tidiness. Hosting dashboards commonly store a
  // trailing newline or space when a value is pasted. CLIENT_URL is written
  // straight into the Access-Control-Allow-Origin header by cors(), and Node
  // throws ERR_INVALID_CHAR on a header containing a newline — which surfaces as
  // a 500 on EVERY route, including /health, because cors runs before all of
  // them. A stray space also silently breaks the exact-match origin check.
  // Trailing slashes break that same match, so strip those too.
  CLIENT_URL: z
    .string()
    .trim()
    .transform((v) => v.replace(/\/+$/, ''))
    .pipe(z.string().url())
    .default('http://localhost:5173'),

  MONGO_URI: z.string().trim().min(1, 'MONGO_URI is required'),

  JWT_ACCESS_SECRET: z.string().trim().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().trim().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),

  ACCESS_TOKEN_TTL: z.string().trim().default('15m'),
  REFRESH_TOKEN_TTL: z.string().trim().default('7d'),

  // ── Outbound email (invitations) ───────────────────────────────────────────
  // All optional on purpose. With no SMTP configured the mailer falls back to
  // Ethereal — a throwaway inbox that returns a preview URL — so a fresh clone
  // can run the whole invite → activate flow without anyone's credentials.
  // Set these four and the same code sends real mail; nothing else changes.
  SMTP_HOST: z.string().trim().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().trim().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().trim().default('Assistify <no-reply@assistify.local>'),

  // Set this and mail goes out over HTTPS instead of SMTP. Needed on hosts that
  // block outbound SMTP ports — common on free tiers, since that is how spam is
  // sent. Takes priority over SMTP_* when present.
  BREVO_API_KEY: z.string().trim().optional(),

  // ── Assistant ──────────────────────────────────────────────────────────────
  // Google AI Studio key (aistudio.google.com/apikey), which has a free tier.
  // Optional so a fresh clone still boots: without it every other feature works
  // and only POST /chat refuses, with a message saying why. Unlike the database
  // and JWT secrets, an unset key here is a missing feature, not a broken server.
  // Primary chat provider: its free tier allows thousands of requests a day
  // against Gemini's twenty. Optional so a checkout with only a Gemini key
  // still runs — llm.ts falls back to whichever is configured.
  GROQ_API_KEY: z.string().trim().optional(),
  GEMINI_API_KEY: z.string().trim().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
