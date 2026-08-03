/**
 * Sincronização de movimentações DataJud → CaseMovement.
 *
 * Fluxo:
 * 1. Pega os CNJs do tenant (Cases ACTIVE com cnjNumber)
 * 2. Para cada um, consulta DataJud _search/{id} (pega partes + valor + movimentações completas)
 * 3. Para cada movimentação nova: cria CaseMovement (idempotente)
 * 4. Atualiza contadores no Case (movimentosCount, lastMovementAt)
 * 5. Detecta movimentações "fatais" (intimação, sentença) e cria Publication + Task
 */

import { prisma, audit } from '@juris-flow/db';
import {
  consultarProcessoDataJud,
  consultarProcessoDetalhesDataJud,
  mapearClasseParaAreaJuridica,
  type DataJudProcesso,
} from '@/lib/integrations/datajud';
import { parseCNJ } from '@/lib/integrations/cnj-parser';

/**
 * Detecta se uma movimentação DataJud é potencialmente fatal (intimação, decisão, sentença)
 * e calcula dias de prazo a partir do código do movimento + classe do processo.
 *
 * Heurística baseada em padrões CNJ:
 *   - Intimação / Citação / Notificação → 5 ou 15 dias úteis (varia por classe)
 *   - Sentença → 30 ou 60 dias (prazo para recurso)
 *   - Despacho → geralmente sem prazo
 *   - Decurso de prazo → informativo
 */
export function classificarMovimentacaoFatal(codigo: number, nome: string, classe: string | null): {
  isFatal: boolean;
  deadlineDays: number | null;
  tipo: 'INTIMACAO' | 'SENTENCA' | 'DESPACHO' | 'INFORMATIVO';
} {
  const n = nome.toLowerCase();

  // Despachos são geralmente sem prazo fatal
  if (n.includes('despacho') || n.includes('ato ordinatório') || n.includes('decurso')) {
    return { isFatal: false, deadlineDays: null, tipo: 'DESPACHO' };
  }

  // Sentença: 30 dias úteis para apelação (CPC 1.003)
  if (n.includes('sentença') || n.includes('sentenca') || codigo === 219) {
    return { isFatal: true, deadlineDays: 30, tipo: 'SENTENCA' };
  }

  // Tramitação / Sentença também
  if (n.includes('publicação') || n.includes('publicacao') || codigo === 1061) {
    return { isFatal: true, deadlineDays: 15, tipo: 'INTIMACAO' };
  }

  // Intimação / Citação
  if (n.includes('intimação') || n.includes('intimacao') || n.includes('citacao') || n.includes('notificação')) {
    // 15 dias padrão (CPC); ajuste por classe se quiser
    const dias = classe?.toLowerCase().includes('execução') ? 5 : 15;
    return { isFatal: true, deadlineDays: dias, tipo: 'INTIMACAO' };
  }

  // Decisão monocrática / acórdão
  if (n.includes('decisão') || n.includes('decisao') || n.includes('acórdão') || n.includes('acordao')) {
    return { isFatal: true, deadlineDays: 10, tipo: 'SENTENCA' };
  }

  return { isFatal: false, deadlineDays: null, tipo: 'INFORMATIVO' };
}

/**
 * Sincroniza TODAS as movimentações de um processo com o DataJud.
 * Idempotente: pulamos movimentações que já existem (mesmo código + data).
 *
 * @returns { criadas, atualizadas, fataisNovas, publicacoesCriadas }
 */
export async function sincronizarMovimentacoesPorCnj(
  tenantId: string,
  caseId: string,
  cnj: string,
): Promise<{
  caseId: string;
  casoAtualizado: boolean;
  criadas: number;
  fataisNovas: number;
  publicacoesCriadas: number;
  tarefasCriadas: number;
}> {
  // Detecta tribunal via parser de CNJ (sem precisar de case)
  const cnjInfo = parseCNJ(cnj);
  const tribunal = cnjInfo?.tribunal ?? 'TJRN'; // fallback seguro
  const uf = cnjInfo?.uf ?? null;

  // 1. Consulta DataJud
  const datajudResult = await consultarProcessoDataJud(cnj, tribunal, uf);
  if (!datajudResult.ok) {
    return {
      caseId, casoAtualizado: false,
      criadas: 0, fataisNovas: 0,
      publicacoesCriadas: 0, tarefasCriadas: 0,
    };
  }

  const caso = await prisma.case.findFirst({
    where: { id: caseId, tenantId },
    select: { id: true, title: true, cnjNumber: true, responsibleUserId: true, clientId: true },
  });
  if (!caso) {
    return {
      caseId, casoAtualizado: false,
      criadas: 0, fataisNovas: 0,
      publicacoesCriadas: 0, tarefasCriadas: 0,
    };
  }

  // 2. Detalhes (partes se houver)
  let detalhes = datajudResult.data;
  if (detalhes.datajudId) {
    const det = await consultarProcessoDetalhesDataJud(detalhes.datajudId, tribunal, uf);
    if (det.ok) detalhes = det.data;
  }

  // 3. Move movimentos pro banco
  let criadas = 0;
  let fataisNovas = 0;
  const publicacoesNovas: string[] = [];

  for (const mov of detalhes.movimentos) {
    const occurredAt = new Date(mov.dataHora);
    if (isNaN(occurredAt.getTime())) continue;

    const exists = await prisma.caseMovement.findFirst({
      where: {
        caseId,
        tenantId,
        code: String(mov.codigo),
        occurredAt,
      },
      select: { id: true, isFatal: true },
    });

    if (exists) continue;

    const classif = classificarMovimentacaoFatal(mov.codigo, mov.nome, detalhes.classe?.nome ?? null);
    const isFatal = classif.isFatal;
    const deadlineAt = isFatal && classif.deadlineDays
      ? addBusinessDays(occurredAt, classif.deadlineDays)
      : null;

    // Cria o movimento (com dedup por codigo+data+caso)
    const existingMv = await prisma.caseMovement.findFirst({
      where: {
        caseId,
        tenantId,
        code: String(mov.codigo),
        occurredAt,
      },
      select: { id: true },
    });
    if (existingMv) continue;

    const mv = await prisma.caseMovement.create({
      data: {
        tenantId,
        caseId,
        sequence: 0, // renumerado abaixo
        occurredAt,
        title: mov.nome,
        code: String(mov.codigo),
        source: 'DATAJUD',
        isFatal,
        deadlineDays: classif.deadlineDays ?? undefined,
        deadlineEndsAt: deadlineAt ?? undefined,
        deadlineKind: 'UTEIS',
      },
    });
    criadas++;
    if (isFatal) fataisNovas++;

    // Se fatal, cria uma Publication pra ter no inbox também
    if (isFatal) {
      const externalId = `${cnj}-${mov.codigo}-${mov.dataHora}`;
      // Dedup por externalId (caso sync anterior tenha criado só a publication sem o movement)
      const existingPub = await prisma.publication.findFirst({
        where: { tenantId, source: 'DATAJUD', externalId },
        select: { id: true },
      });
      if (existingPub) continue;

      const pub = await prisma.publication.create({
        data: {
          tenantId,
          rawText: `[DataJud] ${mov.nome} — ${cnj}`,
          source: 'DATAJUD',
          externalId: `${cnj}-${mov.codigo}-${mov.dataHora}`,
          diary: 'DataJud',
          court: detalhes.tribunal,
          publishedAt: occurredAt,
          cnj,
          status: 'LINKED',
          caseId,
          deadlineAt: deadlineAt ?? occurredAt,
          deadlineDays: classif.deadlineDays ?? 0,
        },
      });
      publicacoesNovas.push(pub.id);

      // Cria tarefa
      const deadlineDate = deadlineAt ?? addBusinessDays(occurredAt, 5);
      const tipoLabel = {
        INTIMACAO: 'Intimação',
        SENTENCA: 'Sentença',
        DESPACHO: 'Despacho',
        INFORMATIVO: 'Movimentação',
      }[classif.tipo];
      await prisma.task.create({
        data: {
          tenantId,
          title: `${tipoLabel}: ${mov.nome} — ${caso.title}`,
          description: `Movimento gerado via sincronização DataJud. Prazo fatal: ${classif.deadlineDays ?? 5} dias úteis.`,
          status: 'TODO',
          priority: 'HIGH',
          dueDate: deadlineDate,
          caseId,
          createdById: caso.responsibleUserId ?? undefined,
        },
      });
    }
  }

  // 4. Renumera sequência
  const all = await prisma.caseMovement.findMany({
    where: { caseId, tenantId },
    select: { id: true, occurredAt: true },
    orderBy: { occurredAt: 'desc' },
  });
  for (let i = 0; i < all.length; i++) {
    await prisma.caseMovement.update({
      where: { id: all[i]!.id },
      data: { sequence: i + 1 },
    });
  }

  // 5. Atualiza contadores no Case
  const total = await prisma.caseMovement.count({ where: { caseId, tenantId } });
  const last = await prisma.caseMovement.findFirst({
    where: { caseId, tenantId },
    orderBy: { occurredAt: 'desc' },
    select: { occurredAt: true },
  });

  await prisma.case.update({
    where: { id: caseId },
    data: {
      movimentosCount: total,
      lastMovementAt: last?.occurredAt ?? null,
      datajudSyncedAt: new Date(),
      datajudId: detalhes.datajudId ?? null,
    },
  });

  await audit({
    tenantId,
    userId: caso.responsibleUserId ?? undefined,
    action: 'EXPORT', // 'SYNC' não existe no enum; 'EXPORT' se aproxima (ação automática de leitura em massa)
    resourceType: 'case_movements',
    resourceId: caseId,
    after: { fonte: 'datajud', criadas, fataisNovas, publicacoes: publicacoesNovas.length },
  });

  return {
    caseId,
    casoAtualizado: true,
    criadas,
    fataisNovas,
    publicacoesCriadas: publicacoesNovas.length,
    tarefasCriadas: publicacoesNovas.length,
  };
}

/**
 * Sync ALL CNJs ativos do tenant. Usado pelo cron diário.
 */
export async function sincronizarTodosAtivos(tenantId: string, maxPorVez = 20): Promise<{
  total: number;
  sucessos: number;
  erros: number;
  movimentacoesCriadas: number;
}> {
  const cases = await prisma.case.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: 'ACTIVE',
      cnjNumber: { not: null },
      OR: [
        { datajudSyncedAt: null },
        { datajudSyncedAt: { lt: new Date(Date.now() - 6 * 60 * 60 * 1000) } }, // mais de 6h
      ],
    },
    select: { id: true, cnjNumber: true },
    take: maxPorVez,
  });

  let sucessos = 0;
  let erros = 0;
  let movimentacoesCriadas = 0;

  for (const caso of cases) {
    if (!caso.cnjNumber) continue;
    try {
      const result = await sincronizarMovimentacoesPorCnj(tenantId, caso.id, caso.cnjNumber);
      if (result.casoAtualizado) {
        sucessos++;
        movimentacoesCriadas += result.criadas;
      } else erros++;
    } catch (e) {
      console.error(`[sync] ${caso.id}:`, e);
      erros++;
    }
  }

  return { total: cases.length, sucessos, erros, movimentacoesCriadas };
}

/** Adiciona N dias úteis a uma data (skip weekends, opção futuro: feriados) */
function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}
