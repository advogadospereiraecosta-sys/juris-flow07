/**
 * Tool registry para o chat IA agentic.
 *
 * Cada tool tem:
 * - name (único, kebab-case)
 * - description (Claude usa pra decidir quando chamar)
 * - input_schema (Zod → JSON Schema)
 * - model hint (qual modelo usar: 'sonnet' para tools rápidos, 'opus' para peças longas)
 * - handler (executa a lógica)
 *
 * Tools disponíveis:
 * - transversal: buscar_documentos (RAG), listar_clientes, listar_processos, criar_tarefa
 * - agente: 8 ferramentas especializadas (petição inicial, contestação, lembrete prazo, etc)
 */

import type { z } from 'zod';

export type ModelHint = 'haiku' | 'sonnet' | 'opus';

export interface ToolContext {
  tenantId: string;
  userId: string;
  threadId: string;
  caseId?: string | null;
}

export interface ToolDefinition {
  name: string;
  description: string;
  /** Schema Zod do input — usado pra validação E pra gerar o JSON Schema pro Claude */
  inputSchema: z.ZodTypeAny;
  modelHint: ModelHint;
  /** Tipo do input — usado internamente para inferência */
  handler: (input: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
}

import { buscarDocumentosTool } from './buscar-documentos';
import { listarClientesTool } from './listar-clientes';
import { listarProcessosTool } from './listar-processos';
import { criarTarefaTool } from './criar-tarefa';
import { redigirPeticaoInicialTool } from './redigir-peticao-inicial';
import { redigirContestacaoTool } from './redigir-contestacao';
import { calcularPrazoFatalTool } from './calcular-prazo-fatal';
import { pesquisarJurisprudenciaTool } from './pesquisar-jurisprudencia';
import { pesquisarLeiSumulaTool } from './pesquisar-lei-sumula';
import { orientarClienteTool } from './orientar-cliente';
import { consultarAndamentoTool } from './consultar-andamento';

export const tools: ToolDefinition[] = [
  // Transversais
  buscarDocumentosTool,
  listarClientesTool,
  listarProcessosTool,
  criarTarefaTool,
  // Agentes especializados
  redigirPeticaoInicialTool,
  redigirContestacaoTool,
  calcularPrazoFatalTool,
  pesquisarJurisprudenciaTool,
  pesquisarLeiSumulaTool,
  orientarClienteTool,
  consultarAndamentoTool,
];

export function getToolByName(name: string): ToolDefinition | undefined {
  return tools.find((t) => t.name === name);
}

/**
 * Converte inputSchema (Zod) para descrição legível pra Claude.
 */
export function describeToolForClaude(tool: ToolDefinition): {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
} {
  // Zod → JSON Schema simplificado
  const jsonSchema = zodToJsonSchema(tool.inputSchema);
  return {
    name: tool.name,
    description: tool.description,
    input_schema: jsonSchema,
  };
}

function zodToJsonSchema(schema: z.ZodType<unknown>): Record<string, unknown> {
  // Implementação simplificada — cobre os tipos que usamos
  const def = (schema as unknown as { _def?: { typeName?: string } })._def;
  const typeName = def?.typeName;

  if (typeName === 'ZodObject') {
    const shape = (schema as z.ZodObject<z.ZodRawShape>).shape as Record<string, z.ZodType<unknown>>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, field] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(field);
      const isOptional = field.isOptional?.() ?? false;
      if (!isOptional) required.push(key);
    }
    const result: Record<string, unknown> = { type: 'object', properties };
    if (required.length > 0) result.required = required;
    return result;
  }
  if (typeName === 'ZodString') return { type: 'string' };
  if (typeName === 'ZodNumber') return { type: 'number' };
  if (typeName === 'ZodBoolean') return { type: 'boolean' };
  if (typeName === 'ZodArray') {
    const inner = (schema as z.ZodArray<z.ZodType<unknown>>)._def as { type: z.ZodType<unknown> };
    return { type: 'array', items: zodToJsonSchema(inner.type) };
  }
  if (typeName === 'ZodEnum') {
    const values = (schema as z.ZodEnum<[string, ...string[]]>)._def.values;
    return { type: 'string', enum: values };
  }
  if (typeName === 'ZodOptional') {
    const inner = (schema as z.ZodOptional<z.ZodType<unknown>>)._def.innerType;
    return zodToJsonSchema(inner);
  }
  return { type: 'string' };
}
