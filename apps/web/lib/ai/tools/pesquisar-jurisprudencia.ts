import { z } from 'zod';
import { getAnthropic, MODEL_IDS } from '@juris-flow/ai';
import type { ToolDefinition } from './registry';

const inputSchema = z.object({
  tese: z.string().describe('Tese ou questão jurídica a pesquisar'),
  tribunal: z.enum(['STF', 'STJ', 'QUALQUER']).default('STJ'),
  tipo: z.enum(['SUMULA_VINCULANTE', 'REPETITIVO', 'REPERCUSSAO_GERAL', 'INFORMATIVO', 'QUALQUER']).default('QUALQUER'),
});

type Output = {
  resultados: Array<{ titulo: string; citacao: string; url?: string; relevante: 'ALTA' | 'MEDIA' | 'BAIXA' }>;
  observacao: string;
};

/**
 * Pesquisa jurisprudencial via Claude com conhecimento jurisprudencial.
 *
 * Para produção: integrar com APIs oficiais (JusBrasil, Escavador, DataJud).
 * Aqui retornamos análise estruturada do conhecimento do modelo + orientação de busca.
 */
export const pesquisarJurisprudenciaTool: ToolDefinition = {
  name: 'pesquisar_jurisprudencia',
  description:
    'Pesquisa jurisprudência no STF/STJ sobre uma tese jurídica. Retorna precedentes, súmulas vinculantes e teses repetitivas relevantes. Modelo Haiku (rápido e barato).',
  inputSchema,
  modelHint: 'haiku',
  handler: async (rawInput) => {
    const input = inputSchema.parse(rawInput);
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: MODEL_IDS.haiku,
      max_tokens: 2500,
      system: `Você é pesquisador jurídico brasileiro. Liste precedentes do ${input.tribunal} sobre a tese informada.
Formato da resposta (JSON estrito, sem markdown):
{
  "resultados": [
    {"titulo": "...", "citacao": "...", "url": "...", "relevante": "ALTA|MEDIA|BAIXA"}
  ],
  "observacao": "1-2 frases sobre o estado da tese (vinculante, divergente, pacificada, etc)"
}
Forneça 3-5 resultados. Use APENAS jurisprudência real verificável. Se incerto, marque como MEDIA.`,
      messages: [
        {
          role: 'user',
          content: `Tese: ${input.tese}\nTribunal: ${input.tribunal}\nTipo preferido: ${input.tipo}`,
        },
      ],
    });

    const raw = message.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join('');

    try {
      const parsed = JSON.parse(raw);
      return parsed as Output;
    } catch {
      return {
        resultados: [],
        observacao: raw.slice(0, 500),
      };
    }
  },
};
