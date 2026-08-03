'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { sincronizarMovimentacoesPorCnj, sincronizarTodosAtivos } from '@/lib/integrations/datajud-sync';

export async function sincronizarCasoDataJudAction(caseId: string) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return { success: false, error: 'Não autenticado' };

  try {
    const { prisma } = await import('@juris-flow/db');
    const caso = await prisma.case.findFirst({
      where: { id: caseId, tenantId },
      select: { cnjNumber: true },
    });
    if (!caso) {
      return { success: false, error: 'Processo não encontrado (verifique se está logado no tenant correto)' };
    }
    if (!caso.cnjNumber) {
      return { success: false, error: 'Processo sem CNJ' };
    }

    const result = await sincronizarMovimentacoesPorCnj(tenantId, caseId, caso.cnjNumber);
    revalidatePath(`/processos/${caseId}?tab=movimentos`);
    revalidatePath('/inbox');
    revalidatePath('/dashboard');
    if (!result.casoAtualizado) {
      return { success: false, error: 'DataJud não retornou dados para este CNJ (verifique se a chave API está correta ou se o processo é sigiloso)', ...result };
    }
    return { success: result.casoAtualizado, ...result };
  } catch (e) {
    console.error('[sincronizarCasoDataJudAction]', e);
    return { success: false, error: 'Erro ao consultar DataJud (conexão Supabase recusada). Tente novamente em alguns segundos.' };
  }
}

export async function sincronizarTodosCasosAction(tenantId?: string) {
  // tenantId opcional — se não vier, pega da sessão (uso comum no cron)
  const session = await auth();
  const tid = tenantId ?? session?.user?.tenantId;
  if (!tid) return { success: false, error: 'Não autenticado' };

  const result = await sincronizarTodosAtivos(tid);
  revalidatePath('/inbox');
  return { success: true, ...result };
}
