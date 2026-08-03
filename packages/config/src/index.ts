import { z } from 'zod';

/** Converte string vazia para undefined antes da validação. */
const optionalStr = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().min(1).optional(),
);
const optionalEmail = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().email().optional(),
);
const optionalUrl = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().url().optional(),
);

/**
 * Schema de validação das variáveis de ambiente.
 * Importe em qualquer lugar com: `import { env } from '@juris-flow/config'`
 */

const serverSchema = z.object({
  // === Banco de dados ===
  DATABASE_URL: z.string().url().describe('PostgreSQL connection string'),
  DIRECT_URL: z.string().url().optional(),

  // === Auth ===
  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET deve ter no mínimo 32 caracteres (gere com `openssl rand -base64 32`)'),
  AUTH_URL: z.string().url().optional().default('http://localhost:3000'),

  // === Provedores OAuth ===
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  // === IA — Anthropic ===
  ANTHROPIC_API_KEY: z.string().min(1).describe('Anthropic Claude API key'),

  // === IA — Voyage AI Embeddings (RAG) ===
  VOYAGE_API_KEY: z.string().min(1).describe('Voyage AI API key para embeddings'),

  // === Pagamentos — Asaas ===
  ASAAS_API_KEY: optionalStr,
  ASAAS_API_URL: z.string().url().default('https://api.asaas.com/v3'),
  ASAAS_WEBHOOK_TOKEN: optionalStr,

  // === DataJud / DJEN ===
  DATAJUD_API_KEY: optionalStr,
  DJEN_API_URL: z.string().url().default('https://comunicaapi.pje.jus.br'),

  // === Email ===
  RESEND_API_KEY: optionalStr,
  EMAIL_FROM: z.string().optional().default('Juris-Flow <noreply@juris-flow.com.br>'),

  // === Observabilidade ===
  SENTRY_DSN: optionalUrl,
  POSTHOG_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().default('https://app.posthog.com'),

  // === Storage ===
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),

  // === App ===
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CRON_SECRET: optionalStr,
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().default('https://app.posthog.com'),
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
});

/**
 * Lê as variáveis de ambiente do servidor.
 * FALHA se algum campo obrigatório estiver faltando.
 */
function parseServer() {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
    throw new Error('Configuração de ambiente inválida. Verifique o .env');
  }
  return parsed.data;
}

/**
 * Variáveis públicas no browser (devem ser NEXT_PUBLIC_*).
 */
function parseClient() {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    console.error('❌ Variáveis públicas inválidas:', parsed.error.flatten().fieldErrors);
    throw new Error('Configuração pública inválida');
  }
  return parsed.data;
}

export const serverEnv = parseServer();
export const clientEnv = parseClient();

/**
 * Helper para uso em client components (apenas NEXT_PUBLIC_*).
 */
export const env = typeof window === 'undefined' ? serverEnv : clientEnv;

export type Env = typeof serverEnv;
export type ClientEnv = typeof clientEnv;
