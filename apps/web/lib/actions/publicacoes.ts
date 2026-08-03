'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma, audit, PubStatus, PubSource } from '@juris-flow/db';
import {
  calcularPrazoFatalPublicacao,
  detectarClasseIntimacao,
  extrairPublicacao,
} from '@/lib/legal/publicacoes';
import { matchPublication } from '@/lib/legal/publication-matcher';

const criarPublicacaoSchema = z.object({
  rawText: z.string().min(20),
  source: z.enum(['DJEN', 'DJE', 'MANUAL', 'DATAJUD']).default('MANUAL'),
  publishedAt: z.string().optional(), // ISO date — se não vier, usa agora
  prazoDias: z.number().int().min(1).max(60).optional(),
  fazenda: z.boolean().default(false),
  // Vínculo opcional ao cadastrar:
  caseId: z.string().uuid().optional(),
});

export type CriarPublicacaoResult =
  | {
      success: true;
      publicationId: string;
      prazoFatal: string;
      matched: {
        viaOab: boolean;
        viaCnpj: boolean;
        viaPartyName: boolean;
        linkedToCase: boolean;
        caseId: string | null;
      };
    }
  | { success: false; error: string };

/**
 * Cria uma publicação a partir de texto (DJEN/DJE colado ou extraído via DataJud).
 * Auto-detecta: CNJ, OAB, partes, tipo de intimação → sugere prazo fatal.
 */
export async function criarPublicacaoAction(
  input: z.infer<typeof criarPublicacaoSchema>,
): Promise<CriarPublicacaoResult> {
  const session = await auth();
  const userId = session?.user?.id;
  const tenantId = session?.user?.tenantId;
  if (!userId || !tenantId) {
    return { success: false, error: 'Não autenticado' };
  }

  const parsed = criarPublicacaoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
  }

  const { rawText, source, publishedAt, prazoDias, fazenda, caseId: caseIdFromUser } = parsed.data;

  // Detecção automática
  const extraido = extrairPublicacao(rawText);
  const classe = detectarClasseIntimacao(rawText);

  // Match automático OAB/CNPJ/nome
  const match = await matchPublication(tenantId, {
    oab: extraido.oab,
    oabState: extraido.oabState,
    cnj: extraido.cnj,
    partyNames: extraido.partyNames,
  });

  // Prazo fatal
  const pubDate = publishedAt ? new Date(publishedAt) : new Date();
  const diasUsar = prazoDias ?? classe.dias;
  const prazo = calcularPrazoFatalPublicacao(
    pubDate.toISOString(),
    diasUsar,
    fazenda,
  );

  try {
    const pub = await prisma.publication.create({
      data: {
        tenantId,
        rawText,
        source: source as PubSource,
        publishedAt: pubDate,
        diary: source === 'DJEN' ? 'DJEN' : source === 'DJE' ? 'DJE' : null,
        court: extraido.court,
        oab: extraido.oab,
        oabState: extraido.oabState,
        partyNames: extraido.partyNames,
        cnj: extraido.cnj,
        deadlineAt: new Date(prazo.dataFatal),
        deadlineDays: diasUsar,
        status: caseIdFromUser ? PubStatus.LINKED : PubStatus.NEW,
        caseId: caseIdFromUser ?? null,
      },
    });

    // Vincula a um caso do match (CNPJ bateu com algum cliente) e cria Task
    const caseIdFinal = caseIdFromUser ?? match.matchedCaseId;
    if (caseIdFinal && caseIdFinal !== caseIdFromUser) {
      await prisma.publication.update({
        where: { id: pub.id },
        data: { caseId: caseIdFinal, status: PubStatus.LINKED },
      });
    }

    if (match.matchedClientId && caseIdFinal) {
      const caso = await prisma.case.findFirst({
        where: { id: caseIdFinal, tenantId },
        select: { title: true, responsibleUserId: true },
      });
      if (caso) {
        await prisma.task.create({
          data: {
            tenantId,
            title: `Intimação: ${classe.tipo.toLowerCase()} — ${caso.title}`,
            description: [
              extraido.partyNames[0] ?? '',
              extraido.cnj ? `CNJ: ${extraido.cnj}` : '',
              extraido.oab ? `OAB: ${extraido.oab}` : '',
              `Prazo: ${diasUsar} dias úteis`,
            ].filter(Boolean).join('\n'),
            status: 'TODO',
            priority: 'HIGH',
            dueDate: new Date(prazo.dataFatal),
            caseId: caseIdFinal,
            createdById: match.matchedUserId ?? userId,
            assignedToId: caso.responsibleUserId ?? match.matchedUserId ?? userId,
          },
        });
      }
    }

    await audit({
      tenantId,
      userId,
      action: 'CREATE',
      resourceType: 'publication',
      resourceId: pub.id,
      after: {
        source,
        classe: classe.tipo,
        diasPrazo: diasUsar,
        prazoFatal: prazo.dataFatal,
        cnj: extraido.cnj,
        oab: extraido.oab,
        match: {
          viaCnpj: !!extraido.cnj && !!match.matchedClientId,
          viaOab: !!extraido.oab && !!match.matchedUserId,
          viaPartyName: !!(match.matchedClientId && !extraido.cnj),
          caseIdLinked: caseIdFinal,
        },
      },
    });

    revalidatePath('/inbox');
    if (caseIdFinal) revalidatePath(`/processos/${caseIdFinal}`);

    return {
      success: true,
      publicationId: pub.id,
      prazoFatal: prazo.dataFatal,
      matched: {
        viaOab: !!(extraido.oab && match.matchedUserId),
        viaCnpj: !!(extraido.cnj && match.matchedClientId),
        viaPartyName: !!(match.matchedClientId && !extraido.cnj),
        linkedToCase: !!caseIdFinal,
        caseId: caseIdFinal ?? null,
      },
    };
  } catch (e) {
    console.error('[criarPublicacao]', e);
    return { success: false, error: 'Erro ao criar publicação' };
  }
}

/**
 * Lista publicações do tenant com filtros.
 */
export async function listarPublicacoesAction(filters: {
  status?: string;
  search?: string;
  period?: 'HOJE' | 'SEMANA' | 'MES' | 'TODAS';
}) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return [];

  const where: Record<string, unknown> = { tenantId };
  if (filters.status) where.status = filters.status;

  // Período
  const now = new Date();
  if (filters.period === 'HOJE') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    where.publishedAt = { gte: start };
  } else if (filters.period === 'SEMANA') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    where.publishedAt = { gte: start };
  } else if (filters.period === 'MES') {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    where.publishedAt = { gte: start };
  }

  if (filters.search) {
    where.OR = [
      { partyNames: { has: filters.search } },
      { cnj: { contains: filters.search.replace(/\D/g, '') } },
      { oab: { contains: filters.search.replace(/\D/g, '') } },
      { rawText: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return prisma.publication.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      rawText: true,
      source: true,
      diary: true,
      court: true,
      publishedAt: true,
      oab: true,
      oabState: true,
      partyNames: true,
      cnj: true,
      status: true,
      deadlineAt: true,
      deadlineDays: true,
      caseId: true,
      taskId: true,
      createdAt: true,
      case: { select: { id: true, title: true } },
    },
  });
}

/**
 * Cria tarefa a partir de uma publicação (linkar a um caso).
 */
export async function criarTarefaDePublicacaoAction(input: {
  publicationId: string;
  caseId: string;
  titulo?: string;
}) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return { success: false, error: 'Não autenticado' };

  const pub = await prisma.publication.findFirst({
    where: { id: input.publicationId, tenantId },
  });
  if (!pub) return { success: false, error: 'Publicação não encontrada' };

  const titulo =
    input.titulo ??
    `${pub.diary ?? 'Publicação'} — ${pub.deadlineDays ?? 5} dias — ${pub.partyNames[0] ?? pub.cnj ?? ''}`;

  const task = await prisma.task.create({
    data: {
      tenantId,
      title: titulo,
      description: `Gerada a partir de publicação: ${pub.rawText.slice(0, 200)}...`,
      status: 'TODO',
      priority: 'HIGH',
      dueDate: pub.deadlineAt,
      caseId: input.caseId,
      createdById: session?.user?.id,
    },
  });

  await prisma.publication.update({
    where: { id: input.publicationId },
    data: {
      taskId: task.id,
      caseId: input.caseId,
      status: PubStatus.LINKED,
      triagedById: session?.user?.id,
      triagedAt: new Date(),
    },
  });

  revalidatePath('/inbox');
  revalidatePath(`/processos/${input.caseId}`);
  return { success: true, taskId: task.id };
}

/**
 * Ignora uma publicação (descarta).
 */
export async function ignorarPublicacaoAction(publicationId: string) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return { success: false, error: 'Não autenticado' };

  await prisma.publication.update({
    where: { id: publicationId, tenantId },
    data: {
      status: PubStatus.IGNORED,
      triagedById: session?.user?.id,
      triagedAt: new Date(),
    },
  });
  revalidatePath('/inbox');
  return { success: true };
}
