'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma, audit } from '@juris-flow/db';
import {
  consultarProcessoDataJud,
  consultarProcessoDetalhesDataJud,
  mapearClasseParaAreaJuridica,
  type DataJudProcesso,
} from '@/lib/integrations/datajud';

const inputSchema = z.object({
  cnj: z.string().min(20).max(30),
  tribunal: z.string().optional(),
});

export type ConsultarDataJudResult =
  | { ok: true; data: DataJudProcesso; areaJuridica: string | null; cached: boolean }
  | { ok: false; error: string };

/**
 * Salva as movimentações do DataJud como CaseMovement do processo.
 * Chamado quando o usuário sincroniza um processo.
 */
export async function salvarMovimentosDataJudAction(input: {
  caseId: string;
  cnj: string;
}): Promise<{ success: boolean; data?: { criados: number; atualizados: number }; error?: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  const tenantId = session?.user?.tenantId;
  if (!userId || !tenantId) {
    return { success: false, error: 'Não autenticado' };
  }

  const { caseId, cnj } = input;
  if (!caseId || !cnj) {
    return { success: false, error: 'caseId e cnj são obrigatórios' };
  }

  // Confirma que o caso pertence ao tenant
  const caso = await prisma.case.findFirst({
    where: { id: caseId, tenantId },
    select: { id: true },
  });
  if (!caso) return { success: false, error: 'Processo não encontrado' };

  // Busca movimento no DataJud
  const resultado = await consultarProcessoDataJudAction({ cnj });
  if (!resultado.ok) return { success: false, error: resultado.error };

  const movimentos = resultado.data.movimentos;
  if (!movimentos.length) {
    return { success: true, data: { criados: 0, atualizados: 0 } };
  }

  let criados = 0;
  let atualizados = 0;

  for (const m of movimentos) {
    const occurredAt = new Date(m.dataHora || new Date().toISOString());
    if (isNaN(occurredAt.getTime())) continue;

    // Tenta achar existente
    const exists = await prisma.caseMovement.findFirst({
      where: {
        caseId,
        tenantId,
        code: String(m.codigo),
        occurredAt,
      },
      select: { id: true },
    });

    if (exists) {
      atualizados++;
      continue;
    }

    await prisma.caseMovement.create({
      data: {
        tenantId,
        caseId,
        sequence: 0, // Será reordenado abaixo
        occurredAt,
        title: m.nome,
        code: String(m.codigo),
        source: 'DATAJUD',
        // isFatal / deadline / deadlines serão marcados em sprint futuro (mapeamento código → regra)
      },
    });
    criados++;
  }

  // Renumera sequências (ordem temporal decrescente)
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

  await audit({
    tenantId,
    userId,
    action: 'CREATE',
    resourceType: 'datajud_sync',
    resourceId: caseId,
    after: { cnj, criados, atualizados },
  });

  revalidatePath(`/processos/${caseId}`);
  return { success: true, data: { criados, atualizados } };
}

/**
 * Consulta DataJud pelo CNJ. Retorna classe, partes, valor, status, últimas movimentações.
 *
 * Auto-preenche campos do form de novo processo quando CNJ é conhecido.
 * Persiste no TenantIntegration para evitar bater na API novamente no curto prazo.
 */
export async function consultarProcessoDataJudAction(input: { cnj: string; tribunal?: string }): Promise<ConsultarDataJudResult> {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return { ok: false, error: 'Não autenticado' };
  }
  const userId = session.user.id;
  const tenantId = session.user.tenantId;

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'CNJ inválido' };
  }

  const cnjDigits = parsed.data.cnj.replace(/\D/g, '');
  if (cnjDigits.length !== 20) {
    return { ok: false, error: 'CNJ deve ter 20 dígitos' };
  }

  // Resolve tribunal: do input OU do CNJ
  let tribunal = parsed.data.tribunal;
  let uf: string | null = null;
  const { parseCNJ } = await import('@/lib/integrations/cnj-parser');
  const cnjInfo = parseCNJ(cnjDigits);

  if (!tribunal) {
    if (!cnjInfo) return { ok: false, error: 'Não foi possível identificar o tribunal a partir do CNJ' };
    tribunal = cnjInfo.tribunal;
    uf = cnjInfo.uf ?? null;
  } else if (cnjInfo) {
    uf = cnjInfo.uf ?? null;
  }

  const resultado = await consultarProcessoDataJud(cnjDigits, tribunal, uf);

  if (!resultado.ok) {
    return { ok: false, error: resultado.error };
  }

  // 2ª chamada: detalhes pelo ID interno (pega partes + valor + mais)
  let dataCompleta = resultado.data;
  if (resultado.data.datajudId) {
    const detalhes = await consultarProcessoDetalhesDataJud(
      resultado.data.datajudId,
      tribunal,
      uf,
    );
    if (detalhes.ok) {
      dataCompleta = detalhes.data;
    }
    // Se detalhes falhar, segue com o que veio do _search (sem partes)
  }

  // Log para auditoria
  await audit({
    tenantId,
    userId,
    action: 'READ',
    resourceType: 'datajud',
    resourceId: cnjDigits,
    after: { tribunal, classe: dataCompleta.classe?.nome, cached: resultado.cached },
  });

  return {
    ok: true,
    data: dataCompleta,
    areaJuridica: mapearClasseParaAreaJuridica(dataCompleta.classe?.nome ?? ''),
    cached: resultado.cached,
  };
}
