'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma, audit } from '@juris-flow/db';
import { getTemplate, validateInputs } from '@/lib/ai/pieces-templates';

const pieceTypeEnum = z.enum([
  'PETICAO_INICIAL_CIVEL',
  'CONTESTACAO_CIVEL',
  'APELACAO_CIVEL',
  'HABEAS_CORPUS',
  'MANDADO_SEGURANCA',
  'RECURSO_ORDINARIO',
  'AGRAVO_INSTRUMENTO',
  'EMBARGOS_DECLARACAO',
  'CONTRATO_HONORARIOS',
  'PROCURACAO',
  'OUTRO',
]);

const modelEnum = z.enum(['CLAUDE_OPUS_4_8', 'CLAUDE_SONNET_5', 'CLAUDE_HAIKU_4_5']);

const createGenerationSchema = z.object({
  type: pieceTypeEnum,
  templateId: z.string().uuid().optional(),
  caseId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  inputs: z.record(z.unknown()),
  model: modelEnum.optional(),
  temperature: z.number().min(0).max(1).optional(),
});

async function requireSession() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('Sessão inválida');
  return { userId: session.user.id, tenantId: session.user.tenantId };
}

export type GeneratePieceInput = z.infer<typeof createGenerationSchema>;

export type GeneratePieceResult =
  | { success: true; data: { generationId: string } }
  | { success: false; error: string };

/**
 * Cria uma PieceGeneration em status GENERATING.
 * A geração real é feita via streaming em /api/pieces/[id]/stream —
 * o cliente abre SSE e o servidor dispara anthropic.messages.stream().
 */
export async function createPieceAction(input: GeneratePieceInput): Promise<GeneratePieceResult> {
  try {
    const { userId, tenantId } = await requireSession();
    const parsed = createGenerationSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
    }

    const { type, inputs, model, temperature, templateId, caseId, leadId } = parsed.data;

    // Resolve template (built-in ou persistido)
    let spec: ReturnType<typeof getTemplate>;
    if (templateId) {
      const tpl = await prisma.pieceTemplate.findFirst({
        where: { id: templateId, tenantId, isActive: true },
      });
      if (!tpl) return { success: false, error: 'Template não encontrado' };
      spec = {
        type: tpl.type,
        legalArea: tpl.legalArea ?? undefined,
        name: tpl.name,
        description: tpl.description ?? '',
        systemPrompt: tpl.systemPrompt,
        userPromptTemplate: tpl.userPromptTemplate,
        requiredFields: tpl.requiredFields as never,
        optionalFields: (tpl.optionalFields ?? []) as never,
        defaultModel: tpl.defaultModel,
        temperature: tpl.temperature,
      };
    } else {
      spec = getTemplate(type);
    }

    if (!spec) {
      return { success: false, error: `Template para ${type} não disponível` };
    }

    // Valida inputs
    const validation = validateInputs(spec, inputs);
    if (!validation.ok) {
      return {
        success: false,
        error: `Campos obrigatórios faltando: ${validation.missing.join(', ')}`,
      };
    }

    const temp = temperature ?? spec.temperature;

    // Cria registro GENERATING — SSE route faz streaming sob demanda
    const generation = await prisma.pieceGeneration.create({
      data: {
        tenantId,
        userId,
        type,
        model: model ?? spec.defaultModel,
        temperature: temp,
        input: inputs as object,
        templateId: templateId ?? null,
        caseId: caseId ?? null,
        leadId: leadId ?? null,
        status: 'GENERATING',
        startedAt: new Date(),
      },
    });

    await audit({
      tenantId,
      userId,
      action: 'CREATE',
      resourceType: 'piece_generation',
      resourceId: generation.id,
      after: { type, model: model ?? spec.defaultModel },
    });

    revalidatePath('/pecas');
    revalidatePath(`/pecas/${generation.id}`);
    return { success: true, data: { generationId: generation.id } };
  } catch (e) {
    console.error('[createPieceAction]', e);
    return { success: false, error: 'Erro interno ao criar peça' };
  }
}

/**
 * Atualiza o texto de uma peça (refinamento manual via editor).
 */
export async function updatePieceTextAction(
  id: string,
  text: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId } = await requireSession();
    const existing = await prisma.pieceGeneration.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) return { success: false, error: 'Peça não encontrada' };

    const refinements = (Array.isArray(existing.refinements) ? existing.refinements : []) as Array<{
      at: string;
      text: string;
      note?: string;
    }>;
    refinements.push({ at: new Date().toISOString(), text, note: 'manual_edit' });

    await prisma.pieceGeneration.update({
      where: { id },
      data: { outputText: text, refinements: refinements as object },
    });
    await audit({
      tenantId,
      userId,
      action: 'UPDATE',
      resourceType: 'piece_generation',
      resourceId: id,
      after: { edited: true },
    });
    revalidatePath(`/pecas/${id}`);
    return { success: true };
  } catch {
    return { success: false, error: 'Erro ao salvar' };
  }
}

export async function deletePieceAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId } = await requireSession();
    await prisma.pieceGeneration.update({
      where: { id, tenantId },
      data: { deletedAt: new Date() },
    });
    await audit({ tenantId, userId, action: 'DELETE', resourceType: 'piece_generation', resourceId: id });
    revalidatePath('/pecas');
    return { success: true };
  } catch {
    return { success: false, error: 'Erro interno' };
  }
}
