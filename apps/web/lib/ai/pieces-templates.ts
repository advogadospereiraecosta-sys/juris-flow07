/**
 * Templates padrão de peças processuais.
 *
 * Cada template tem:
 * - systemPrompt: instrução persistente para o Claude
 * - userPromptTemplate: instrução específica ao tipo de peça + dados
 * - requiredFields: campos que o usuário precisa preencher
 * - optionalFields: campos extras
 *
 * Para criar templates customizados por tenant, duplicar este objeto
 * e persistir via /pecas/modelos.
 */

import type { PieceType, LegalArea } from '@prisma/client';

export type FieldSchema = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'money' | 'cpf-cnpj' | 'select';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  help?: string;
  minLength?: number;
};

export type PieceTemplateSpec = {
  type: PieceType;
  legalArea?: LegalArea;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  requiredFields: FieldSchema[];
  optionalFields: FieldSchema[];
  defaultModel: 'CLAUDE_OPUS_4_8' | 'CLAUDE_SONNET_5' | 'CLAUDE_HAIKU_4_5';
  temperature: number;
};

const SISTEMA_BASE = `Você é uma advogada brasileira experiente, especializada em redação de peças processuais de alto padrão.
Redija em português formal (PT-BR), use linguagem técnica jurídica, seja clara e objetiva.
Sempre que mencionar súmula, tese ou jurisprudência, cite explicitamente o número.
Não invente precedentes. Quando não houver citação específica, escreva "conforme jurisprudência dominante" ou "conforme entendimento majoritário".
Ao final, inclua local, data e assinatura do advogado no formato:
"LOCAL, DATA.
NOME DO ADVOGADO
OAB/XX 000.000"

IMPORTANTE: Você DEVE basear a peça exclusivamente nos dados fornecidos pelo usuário no campo "DADOS DO CASO". Não invente partes, fatos ou valores.

DISCLAIMER OBRIGATÓRIO ao final (após a assinatura):
"Esta peça foi gerada por inteligência artificial e DEVE ser revisada por advogado habilitado antes do protocolo. A IA pode conter erros. O uso é de inteira responsabilidade do operador."`;

const PETICAO_INICIAL_CIVEL: PieceTemplateSpec = {
  type: 'PETICAO_INICIAL_CIVEL',
  legalArea: 'CIVEL',
  name: 'Petição Inicial Cível',
  description: 'Petição inaugural para processos cíveis em geral (indenização, cobrança, obrigação de fazer, etc.)',
  defaultModel: 'CLAUDE_OPUS_4_8',
  temperature: 0.3,
  systemPrompt: SISTEMA_BASE,
  userPromptTemplate: `Redija uma PETIÇÃO INICIAL CÍVEL completa com base nos dados abaixo.

Estrutura obrigatória (na ordem):
1. **Endereçamento** — Juízo da Comarca de {{comarca}}/{{estado}}
2. **Qualificação das partes** — Autor (cliente) e Réu (parte contrária)
3. **Fatos** — narração clara, objetiva e cronológica, dividida em tópicos numerados
4. **Direito** — fundamentação jurídica com artigos de lei e súmulas aplicáveis
5. **Pedidos** — principais (mérito) + subsidiários + tutela de urgência (se cabível)
6. **Valor da causa** — R$ {{valor_causa}}
7. **Encerramento** — "Termos em que pede deferimento" + local/data/assinatura

Use linguagem técnica mas acessível. Evite repetições.
Quando aplicável, inclua pedido de inversão do ônus da prova (CDC art. 6º, VIII) e de gratuidade de justiça (se o autor declarar hipossuficiência).`,
  requiredFields: [
    { key: 'autor_nome', label: 'Nome do autor', type: 'text', required: true, placeholder: 'Maria da Silva' },
    { key: 'autor_cpf_cnpj', label: 'CPF/CNPJ do autor', type: 'cpf-cnpj', required: true },
    { key: 'autor_endereco', label: 'Endereço do autor', type: 'textarea', required: true, placeholder: 'Rua, número, bairro, cidade/UF, CEP' },
    { key: 'reu_nome', label: 'Nome do réu', type: 'text', required: true },
    { key: 'reu_cpf_cnpj', label: 'CPF/CNPJ do réu', type: 'cpf-cnpj', required: false },
    { key: 'reu_endereco', label: 'Endereço do réu (se conhecido)', type: 'textarea', required: false },
    { key: 'comarca', label: 'Comarca', type: 'text', required: true, placeholder: 'São Paulo' },
    { key: 'estado', label: 'UF', type: 'text', required: true, placeholder: 'SP' },
    { key: 'tipo_acao', label: 'Tipo de ação', type: 'select', required: true, options: [
      { value: 'INDENIZACAO', label: 'Indenização' },
      { value: 'COBRANCA', label: 'Cobrança' },
      { value: 'OBRIGACAO_FAZER', label: 'Obrigação de fazer' },
      { value: 'OBRIGACAO_NAO_FAZER', label: 'Obrigação de não fazer' },
      { value: 'DECLARATORIA', label: 'Declaratória' },
      { value: 'ANULATORIA', label: 'Anulatória' },
      { value: 'RESCISORIA', label: 'Rescisória' },
      { value: 'REVISIONAL', label: 'Revisional' },
      { value: 'OUTRA', label: 'Outra' },
    ] },
    { key: 'fatos', label: 'Descrição dos fatos', type: 'textarea', required: true, help: 'Narração cronológica dos fatos. Mínimo 200 caracteres.', minLength: 200 },
    { key: 'valor_causa', label: 'Valor da causa (R$)', type: 'money', required: true, placeholder: '10.000,00' },
  ],
  optionalFields: [
    { key: 'pedido_urgencia', label: 'Tutela de urgência?', type: 'select', required: false, options: [
      { value: 'SIM', label: 'Sim — incluir pedido de tutela' },
      { value: 'NAO', label: 'Não' },
    ] },
    { key: 'gratuidade_justica', label: 'Pedir gratuidade de justiça?', type: 'select', required: false, options: [
      { value: 'SIM', label: 'Sim' },
      { value: 'NAO', label: 'Não' },
    ] },
    { key: 'onus_prova', label: 'Pedir inversão do ônus da prova (CDC)?', type: 'select', required: false, options: [
      { value: 'SIM', label: 'Sim' },
      { value: 'NAO', label: 'Não' },
    ] },
    { key: 'observacoes', label: 'Observações adicionais', type: 'textarea', required: false },
  ],
};

const CONTESTACAO_CIVEL: PieceTemplateSpec = {
  type: 'CONTESTACAO_CIVEL',
  legalArea: 'CIVEL',
  name: 'Contestação Cível',
  description: 'Peça de defesa do réu, com preliminares (impugnação) + mérito',
  defaultModel: 'CLAUDE_OPUS_4_8',
  temperature: 0.3,
  systemPrompt: SISTEMA_BASE,
  userPromptTemplate: `Redija uma CONTESTAÇÃO CÍVEL completa com base nos dados abaixo.

Estrutura obrigatória:
1. **Endereçamento e qualificação** do contestante (réu)
2. **Preliminares** — analise TODOS os itens do art. 337 do CPC e mencione quais são aplicáveis ao caso:
   - Inexistência/nulidade de citação
   - Incompetência
   - Incorreção do valor da causa
   - Inépcia da petição inicial
   - Conexão
   - Incapacidade processual ou falta de caução
   - Litispendência ou coisa julgada
   - Convenção de arbitragem
   - Carência de ação (ilegitimidade, falta de interesse processual, impossibilidade jurídica do pedido)
   - Falta de caução
3. **Impugnação específica** — IMPUGNE PONTO A PONTO cada fato alegado pelo autor (art. 341 CPC)
4. **Mérito** — defesa + fundamentação jurídica com súmulas/teses
5. **Pedidos** — improcedência + inversão de ônus da prova + honorários
6. **Encerramento** — local/data/assinatura

Lembre-se: o ônus de impugnação específica é do réu. Não deixe nada "por impugnado genericamente".`,
  requiredFields: [
    { key: 'reu_nome', label: 'Nome do réu/contestante', type: 'text', required: true },
    { key: 'reu_cpf_cnpj', label: 'CPF/CNPJ do réu', type: 'cpf-cnpj', required: true },
    { key: 'reu_endereco', label: 'Endereço do réu', type: 'textarea', required: true },
    { key: 'autor_nome', label: 'Nome do autor', type: 'text', required: true },
    { key: 'comarca', label: 'Comarca', type: 'text', required: true },
    { key: 'estado', label: 'UF', type: 'text', required: true, placeholder: 'SP' },
    { key: 'numero_processo', label: 'Número do processo (se conhecido)', type: 'text', required: false },
    { key: 'tipo_defesa', label: 'Linha principal de defesa', type: 'select', required: true, options: [
      { value: 'PRESCRICAO', label: 'Prescrição/decadência' },
      { value: 'ILEGITIMIDADE', label: 'Ilegitimidade' },
      { value: 'INEXISTENCIA_FATOS', label: 'Inexistência dos fatos narrados' },
      { value: 'CUMPRIMENTO', label: 'Cumprimento integral da obrigação' },
      { value: 'COMPENSACAO', label: 'Compensação de valores' },
      { value: 'MERITO', label: 'Mérito — improcedência do pedido' },
      { value: 'OUTRA', label: 'Outra' },
    ] },
    { key: 'fatos_peticao', label: 'Resumo dos fatos alegados pelo autor', type: 'textarea', required: true, minLength: 200 },
    { key: 'argumentos_defesa', label: 'Argumentos principais da defesa', type: 'textarea', required: true, minLength: 200 },
  ],
  optionalFields: [
    { key: 'preliminares', label: 'Preliminares específicas (art. 337 CPC)', type: 'textarea', required: false },
    { key: 'pedido_reconvencao', label: 'Pedido de reconvenção?', type: 'textarea', required: false },
    { key: 'valor_causa', label: 'Valor da causa da ação', type: 'money', required: false },
    { key: 'observacoes', label: 'Observações adicionais', type: 'textarea', required: false },
  ],
};

const APELACAO_CIVEL: PieceTemplateSpec = {
  type: 'APELACAO_CIVEL',
  legalArea: 'CIVEL',
  name: 'Recurso de Apelação Cível',
  description: 'Apelação contra sentença cível (CPC art. 1.009-1.014)',
  defaultModel: 'CLAUDE_OPUS_4_8',
  temperature: 0.3,
  systemPrompt: SISTEMA_BASE,
  userPromptTemplate: `Redija um RECURSO DE APELAÇÃO CÍVEL completo com base nos dados abaixo.

Estrutura obrigatória (CPC art. 1.010):
1. **Endereçamento** — Tribunal de Justiça do Estado de {{estado}}
2. **Tempestividade** — mencione a data da intimação e calcule o prazo de 15 dias úteis
3. **Preparo** — confirme que o preparo foi recolhido (porte + custas) ou peça justiça gratuita
4. **Síntese da sentença recorrida** — resuma o que o juiz decidiu
5. **Razões de apelação** — demonstre error in procedendo e/ou in judicando
6. **Requerimentos** — reforma/anulação da sentença + pedido de efeito suspensivo (se cabível, art. 1.012)
7. **Encerramento** — local/data/assinatura

Fundamente cada alegação com o art. do CPC violado ou com súmula/tese do STJ.`,
  requiredFields: [
    { key: 'apelante_nome', label: 'Nome do apelante', type: 'text', required: true },
    { key: 'apelante_cpf_cnpj', label: 'CPF/CNPJ do apelante', type: 'cpf-cnpj', required: true },
    { key: 'apelado_nome', label: 'Nome do apelado', type: 'text', required: true },
    { key: 'numero_processo', label: 'Número do processo', type: 'text', required: true },
    { key: 'comarca', label: 'Comarca de origem', type: 'text', required: true },
    { key: 'vara', label: 'Vara de origem', type: 'text', required: true },
    { key: 'estado', label: 'UF do Tribunal', type: 'text', required: true },
    { key: 'data_intimacao', label: 'Data da intimação da sentença', type: 'date', required: true },
    { key: 'sintese_sentenca', label: 'Síntese da sentença recorrida', type: 'textarea', required: true, minLength: 100 },
    { key: 'razoes_apelacao', label: 'Razões da apelação (por que a sentença deve ser reformada/anulada)', type: 'textarea', required: true, minLength: 300 },
  ],
  optionalFields: [
    { key: 'efeito_suspensivo', label: 'Pedir efeito suspensivo?', type: 'select', required: false, options: [
      { value: 'SIM', label: 'Sim — pedir efeito suspensivo (art. 1.012 CPC)' },
      { value: 'NAO', label: 'Não — apelação apenas em seu efeito devolutivo' },
    ] },
    { key: 'preparo', label: 'Preparo recolhido?', type: 'select', required: false, options: [
      { value: 'SIM', label: 'Sim' },
      { value: 'GRATUIDADE', label: 'Pedir gratuidade de justiça' },
    ] },
    { key: 'pedido_tutela', label: 'Pedido de tutela recursal/provisória?', type: 'textarea', required: false },
    { key: 'observacoes', label: 'Observações adicionais', type: 'textarea', required: false },
  ],
};

export const PIECE_TEMPLATES: PieceTemplateSpec[] = [
  PETICAO_INICIAL_CIVEL,
  CONTESTACAO_CIVEL,
  APELACAO_CIVEL,
];

export function getTemplate(type: PieceType): PieceTemplateSpec | null {
  return PIECE_TEMPLATES.find((t) => t.type === type) ?? null;
}

/**
 * Renderiza o userPromptTemplate substituindo placeholders {{chave}}.
 */
export function renderUserPrompt(template: string, inputs: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = inputs[key];
    if (val == null || val === '') return `(informar ${key})`;
    return String(val);
  });
}

/**
 * Valida que todos os campos required foram preenchidos.
 */
export function validateInputs(template: PieceTemplateSpec, inputs: Record<string, unknown>): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const field of template.requiredFields) {
    const val = inputs[field.key];
    if (field.required && (val == null || val === '' || String(val).trim().length === 0)) {
      missing.push(field.label);
    }
  }
  return { ok: missing.length === 0, missing };
}