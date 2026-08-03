import { z } from 'zod';
import { getAnthropic, MODEL_IDS } from '@juris-flow/ai';
import type { ToolDefinition } from './registry';

const inputSchema = z.object({
  pergunta: z.string().describe('Dúvida do cliente em linguagem simples'),
  area: z.enum(['CIVEL', 'TRABALHISTA', 'FAMILIA', 'CRIMINAL', 'CONSUMIDOR', 'EMPRESARIAL', 'TRIBUTARIO']).optional(),
});

type Output = {
  resumo: string;
  direitos: string[];
  caminhos: Array<{ tipo: string; descricao: string; prazoEstimado: string; custoEstimado: string }>;
  observacao: string;
};

/**
 * Orientação jurídica preliminar em linguagem acessível ao cliente.
 * IMPORTANTE: Saída é sempre consulta, nunca promessa de resultado (EAOAB art. 41).
 */
export const orientarClienteTool: ToolDefinition = {
  name: 'orientar_cliente',
  description:
    'Explica situação jurídica de um cliente em linguagem acessível, lista direitos e caminhos possíveis (judicial, extrajudicial, acordo). Sem promessa de resultado.',
  inputSchema,
  modelHint: 'sonnet',
  handler: async (rawInput) => {
    const input = inputSchema.parse(rawInput);
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: MODEL_IDS.sonnet,
      max_tokens: 3000,
      system: `Você é advogado brasileiro orientando um cliente em primeira consulta.
Regras obrigatórias:
- Linguagem acessível (evite juridiquês sem explicar)
- NUNCA prometa resultado (EAOAB art. 41)
- Liste alternativas: judicial / extrajudicial / acordo
- Realismo sobre prazo e custo
Resposta em JSON estrito:
{
  "resumo": "explicação clara da situação",
  "direitos": ["direito 1", "direito 2"],
  "caminhos": [
    {"tipo": "judicial|extrajudicial|acordo|administrativo", "descricao": "...", "prazoEstimado": "X meses", "custoEstimado": "R$ X a R$ Y"}
  ],
  "observacao": "próximos passos práticos"
}`,
      messages: [
        {
          role: 'user',
          content: `Área: ${input.area ?? 'geral'}\nPergunta do cliente: ${input.pergunta}`,
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
        resumo: raw.slice(0, 1000),
        direitos: [],
        caminhos: [],
        observacao: '',
      };
    }
  },
};
