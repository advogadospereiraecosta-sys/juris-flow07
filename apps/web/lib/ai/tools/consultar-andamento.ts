import { z } from 'zod';
import { prisma } from '@juris-flow/db';
import type { ToolDefinition } from './registry';

const inputSchema = z.object({
  cnj: z.string().describe('CNJ do processo (20 dígitos)'),
  ultimosDias: z.number().int().min(1).max(180).default(30).optional(),
});

type Output = {
  cnj: string;
  totalMovimentos: number;
  totalFatais: number;
  prazosProximos: Array<{
    titulo: string;
    dataOcorrencia: string;
    prazoFatal: string | null;
    diasUteis: number | null;
  }>;
};

export const consultarAndamentoTool: ToolDefinition = {
  name: 'consultar_andamento',
  description:
    'Busca movimentações recentes de um processo (do DataJud ou já sincronizadas). Use quando o advogado quiser saber "como está esse processo?" ou "quando foi a última movimentação". Retorna últimos andamentos + prazos fatais próximos.',
  inputSchema,
  modelHint: 'haiku',
  handler: async (rawInput: Record<string, unknown>, ctx) => {
    const input = inputSchema.parse(rawInput as z.infer<typeof inputSchema>);
    const cnjDigits = input.cnj.replace(/\D/g, '');

    // 1. Tenta achar no DB local primeiro
    const caso = await prisma.case.findFirst({
      where: { tenantId: ctx.tenantId, cnjNumber: cnjDigits },
      include: {
        movements: {
          where: { isFatal: true, deadlineEndsAt: { not: null } },
          orderBy: { deadlineEndsAt: 'asc' },
          take: 5,
        },
        _count: { select: { movements: true } },
      },
    });

    if (caso) {
      const allMovs = await prisma.caseMovement.findMany({
        where: { caseId: caso.id, tenantId: ctx.tenantId },
        orderBy: { occurredAt: 'desc' },
        take: Math.max(input.ultimosDias ? 10 : 5, 5),
      });

      const prazosProximos = caso.movements
        .filter((m) => m.deadlineEndsAt !== null)
        .map((m) => ({
          titulo: m.title,
          dataOcorrencia: m.occurredAt.toISOString().slice(0, 10),
          prazoFatal: m.deadlineEndsAt!.toISOString().slice(0, 10),
          diasUteis: m.deadlineDays,
        }));

      return {
        cnj: cnjDigits,
        totalMovimentos: caso._count.movements,
        totalFatais: caso.movements.length,
        prazosProximos,
      };
    }

    // 2. Se não tem no DB, busca direto no DataJud (live)
    const { consultarProcessoDataJud, consultarProcessoDetalhesDataJud } = await import('@/lib/integrations/datajud');
    const result = await consultarProcessoDataJud(cnjDigits, '', null);
    if (!result.ok) {
      return {
        cnj: cnjDigits,
        totalMovimentos: 0,
        totalFatais: 0,
        prazosProximos: [],
      };
    }

    // Tenta detalhes
    if (result.data.datajudId) {
      const det = await consultarProcessoDetalhesDataJud(result.data.datajudId, '', null);
      if (det.ok) {
        result.data = det.data;
      }
    }

    const fatais = result.data.movimentos
      .filter((m) =>
        m.nome.toLowerCase().match(/intimação|citação|sentença|publicação|notificação/),
      )
      .slice(0, 5);

    return {
      cnj: cnjDigits,
      totalMovimentos: result.data.movimentos.length,
      totalFatais: fatais.length,
      prazosProximos: fatais.map((m) => ({
        titulo: m.nome,
        dataOcorrencia: m.dataHora ? m.dataHora.slice(0, 10) : '',
        prazoFatal: null,
        diasUteis: null,
      })),
    };
  },
};
