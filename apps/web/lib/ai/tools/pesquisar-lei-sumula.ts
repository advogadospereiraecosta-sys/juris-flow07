import { z } from 'zod';
import { getAnthropic, MODEL_IDS } from '@juris-flow/ai';
import type { ToolDefinition } from './registry';

const inputSchema = z.object({
  dispositivo: z.string().describe('O que buscar (ex: "art. 5º CF", "CDC art. 39", "CPC 487")'),
  contexto: z.string().optional().describe('Contexto da dúvida (ex: "indeferimento de inicial", "prescrição")'),
});

type Output = {
  citacoes: Array<{ diploma: string; artigo: string; texto: string; url?: string }>;
  observacao: string;
};

export const pesquisarLeiSumulaTool: ToolDefinition = {
  name: 'pesquisar_lei_sumula',
  description:
    'Busca legislação federal/estadual e súmulas STF/STJ. Retorna redação atualizada + súmulas aplicáveis + análise de vigência.',
  inputSchema,
  modelHint: 'haiku',
  handler: async (rawInput) => {
    const input = inputSchema.parse(rawInput);
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: MODEL_IDS.haiku,
      max_tokens: 2500,
      system: `Você é pesquisador jurídico. Cite diplomas legais e súmulas VERIFICÁVEIS (não invente).
Resposta em JSON estrito:
{
  "citacoes": [
    {"diploma": "CF/88", "artigo": "art. 5º, XXXV", "texto": "texto oficial resumido", "url": "https://..."}
  ],
  "observacao": "1-2 frases sobre vigência/aplicabilidade"
}
Cite 2-4 diplomas/súmulas mais relevantes.`,
      messages: [
        {
          role: 'user',
          content: `Busca: ${input.dispositivo}\n${input.contexto ? `Contexto: ${input.contexto}` : ''}`,
        },
      ],
    });

    const raw = message.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join('');

    try {
      return JSON.parse(raw) as Output;
    } catch {
      return {
        citacoes: [],
        observacao: raw.slice(0, 500),
      };
    }
  },
};
