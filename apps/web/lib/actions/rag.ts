'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma, audit } from '@juris-flow/db';
import { indexCaseDocuments, retrieveCaseContext } from '@/lib/ai/rag';

const indexSchema = z.object({
  caseId: z.string().uuid(),
});

async function requireSession() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Sessão inválida');
  return { userId: session.user.id, tenantId: session.user.tenantId };
}

/**
 * Indexa todos os documentos do Drive do caso para uso no RAG da geração de peças.
 * Disparado manualmente ou automaticamente ao vincular caso na peça.
 */
export async function indexCaseDocumentsAction(input: { caseId: string }): Promise<{
  success: boolean;
  data?: { filesIndexed: number; filesSkipped: number; chunksCreated: number };
  error?: string;
}> {
  try {
    const { userId, tenantId } = await requireSession();
    const parsed = indexSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Case ID inválido' };

    const result = await indexCaseDocuments(tenantId, parsed.data.caseId);
    await audit({
      tenantId,
      userId,
      action: 'CREATE',
      resourceType: 'document_index',
      resourceId: parsed.data.caseId,
      after: result,
    });
    revalidatePath(`/processos/${parsed.data.caseId}`);
    return { success: true, data: result };
  } catch (e) {
    console.error('[indexCaseDocumentsAction]', e);
    return { success: false, error: 'Erro ao indexar documentos' };
  }
}

/**
 * Recupera contexto RAG de um caso para uma query (uso interno pelo stream route).
 */
export async function getCaseContextForPrompt(
  caseId: string,
  query: string,
  topK = 5,
): Promise<string> {
  const chunks = await retrieveCaseContext(caseId, query, topK);
  if (chunks.length === 0) return '';
  return chunks
    .map((c) => `[${c.filename} | similaridade ${(c.similarity * 100).toFixed(0)}%]\n${c.content}`)
    .join('\n\n---\n\n');
}
