import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Singleton do Prisma Client.
 * Em dev, evita múltiplas conexões ao recarregar via HMR.
 *
 * IMPORTANTE: passar `datasourceUrl` explicitamente para que o client use a URL
 * carregada pelo Next.js em runtime (via .env), e NÃO a URL que estava no
 * momento de `prisma generate` (que roda antes do .env ser carregado).
 */
const databaseUrl =
  process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '';

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL ou DIRECT_URL deve estar definida no .env do app web',
  );
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Helper para criar audit log.
 */
export async function audit(input: {
  tenantId: string;
  userId?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'EXPORT' | 'LOGIN' | 'LOGOUT';
  resourceType?: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
}) {
  return prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      before: (input.before ?? undefined) as never,
      after: (input.after ?? undefined) as never,
      ip: input.ip,
      userAgent: input.userAgent,
    },
  });
}

export * from '@prisma/client';
