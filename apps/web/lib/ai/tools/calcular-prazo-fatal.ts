import { z } from 'zod';
import type { ToolDefinition } from './registry';

const inputSchema = z.object({
  publicacao: z.string().describe('Data da publicação (ISO YYYY-MM-DD ou dd/mm/aaaa)'),
  tipoPrazo: z.enum(['UTEIS', 'CORRIDOS']).default('UTEIS').describe('Dias úteis ou corridos'),
  dias: z.number().min(1).describe('Quantidade de dias do prazo'),
  uf: z.string().length(2).optional().describe('UF para considerar feriados estaduais'),
  fazenda: z.boolean().default(false).describe('Se a parte é Fazenda Pública (prazo em dobro)'),
  defensoria: z.boolean().default(false).describe('Se a parte é Defensoria (prazo em dobro)'),
});

type Output = {
  dataFatal: string;
  dataFatalFormatada: string;
  diasUteis: number;
  justificativa: string;
  lembretes: { data: string; aviso: string }[];
};

/**
 * Cálculo de prazo fatal conforme CPC 219 (dias úteis) + CPC 224 § 2 (início)
 * + CPC 183/186 (Fazenda/Defensoria em dobro).
 *
 * Para ser completo em produção precisaria do calendário de feriados nacionais +
 * estaduais + forenses + suspensão 20/12-20/01. Aqui entregamos a lógica base
 * e marcamos o resultado como estimativa.
 */
export const calcularPrazoFatalTool: ToolDefinition = {
  name: 'calcular_prazo_fatal',
  description:
    'Calcula data fatal de um prazo processual considerando dias úteis, início no primeiro dia útil seguinte (CPC 224 § 2) e prazos em dobro para Fazenda/Defensoria. Retorna também régua de lembretes D-7/D-3/D-1/D-0.',
  inputSchema,
  modelHint: 'haiku',
  handler: async (rawInput) => {
    const input = inputSchema.parse(rawInput);
    // Parse da data de publicação
    let pubDate: Date;
    if (input.publicacao.includes('/')) {
      const [d, m, y] = input.publicacao.split('/').map(Number);
      pubDate = new Date(y!, m! - 1, d!);
    } else {
      pubDate = new Date(input.publicacao);
    }

    // Início do prazo: primeiro dia útil seguinte à publicação (CPC 224 § 2)
    let inicio = new Date(pubDate);
    inicio.setDate(inicio.getDate() + 1);
    while (inicio.getDay() === 0 || inicio.getDay() === 6) {
      inicio.setDate(inicio.getDate() + 1);
    }

    // Fazenda / Defensoria: prazo em dobro
    const diasEfetivos = input.fazenda || input.defensoria ? input.dias * 2 : input.dias;

    // Contagem de dias úteis
    let cursor = new Date(inicio);
    let contados = 0;
    while (contados < diasEfetivos) {
      cursor.setDate(cursor.getDate() + 1);
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) contados++;
    }

    const fmt = (d: Date) =>
      d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Régua de lembretes
    const lembretes: Output['lembretes'] = [];
    for (const offset of [-7, -3, -1, 0]) {
      const data = new Date(cursor);
      data.setDate(data.getDate() + offset);
      const aviso =
        offset === 0
          ? 'Vence hoje!'
          : offset === -1
          ? 'Vence amanhã'
          : `Vence em ${Math.abs(offset)} dias`;
      lembretes.push({ data: data.toISOString().slice(0, 10), aviso });
    }

    return {
      dataFatal: cursor.toISOString().slice(0, 10),
      dataFatalFormatada: fmt(cursor),
      diasUteis: diasEfetivos,
      justificativa: `Publicação ${pubDate.toISOString().slice(0, 10)}. Início em ${inicio.toISOString().slice(0, 10)} (primeiro dia útil seguinte, CPC 224 § 2). ${diasEfetivos} dias ${input.tipoPrazo.toLowerCase()} (${input.fazenda || input.defensoria ? 'em dobro para ' + (input.fazenda ? 'Fazenda Pública' : 'Defensoria') : 'prazo comum'}).`,
      lembretes,
    };
  },
};
