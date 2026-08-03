/**
 * Roteador de modelos Claude por tipo de peça / caso de uso.
 *
 * Critérios:
 * 1. Plano do usuário (Elite → Opus sempre em peças complexas)
 * 2. Criticidade da peça (peças criminais complexas → Opus)
 * 3. Tipo de tarefa (documentos curtos → Haiku, complexidade média → Sonnet)
 *
 * Ver docs/06-IA.md tabela completa.
 */

import type { AnthropicModel } from './client';
import { MODEL_IDS } from './client';

type UserPlan = 'FREE' | 'ESSENTIAL' | 'PRO' | 'ELITE';

export type PieceType =
  // === Cível ===
  | 'PETICAO_INICIAL_CIVEL'
  | 'CONTESTACAO'
  | 'REPLICA'
  | 'AGRAVO_INSTRUMENTO'
  | 'APELACAO'
  | 'CONTRARRAZOES_APELACAO'
  | 'AGRAVO_INTERNO'
  | 'EMBARGOS_DECLARACAO'
  | 'CUMPRIMENTO_SENTENCA'
  | 'IMPUGNACAO_CUMPRIMENTO'
  | 'RECURSO_ESPECIAL'
  | 'RECURSO_EXTRAORDINARIO'
  // === Trabalhista ===
  | 'RECLAMACAO_TRABALHISTA'
  | 'CONTESTACAO_TRABALHISTA'
  | 'RECURSO_ORDINARIO_TRABALHO'
  | 'RECURSO_REVISTA'
  // === Criminal ===
  | 'RESPOSTA_ACUSACAO'
  | 'HABEAS_CORPUS'
  | 'APELACAO_CRIMINAL'
  | 'MEMORIAIS'
  // === Família ===
  | 'DIVORCIO_LITIGIOSO'
  | 'DIVORCIO_CONSENSUAL'
  | 'GUARDA_COMPARTILHADA'
  | 'ALIMENTOS_INICIAL'
  // === Empresarial ===
  | 'CONTRATO_SOCIAL_LTDA'
  | 'ACORDO_ACIONISTAS'
  | 'CONTRATO_PRESTACAO_SERVICOS'
  // === Documentos curtos ===
  | 'PROCURACAO'
  | 'DECLARACAO_HIPOSSUFICIENCIA'
  | 'TERMO_CIENCIA_LGPD'
  | 'NOTIFICACAO_EXTRAJUDICIAL'
  | 'CONTRATO_HONORARIOS'
  // === Análise ===
  | 'PARECER_JURIDICO'
  | 'RESUMO_PROCESSO'
  | 'TRIAGE_PUBLICACAO';

// Peças que exigem máxima qualidade (Opus)
const PIECES_OPUS: PieceType[] = [
  'RECURSO_ESPECIAL',
  'RECURSO_EXTRAORDINARIO',
  'RESPOSTA_ACUSACAO',
  'HABEAS_CORPUS',
  'PARECER_JURIDICO',
];

// Documentos administrativos curtos (Haiku)
const PIECES_HAIKU: PieceType[] = [
  'PROCURACAO',
  'DECLARACAO_HIPOSSUFICIENCIA',
  'TERMO_CIENCIA_LGPD',
];

/**
 * Retorna o modelo Claude apropriado para o tipo de peça + plano do usuário.
 */
export function routeModel(pieceType: PieceType, userPlan: UserPlan): AnthropicModel {
  // Elite → Opus sempre em peças complexas (custo não é problema)
  if (userPlan === 'ELITE' && PIECES_OPUS.includes(pieceType)) {
    return 'opus';
  }

  // Peças críticas (criminal defensiva, tribunais superiores) → Opus sempre
  if (PIECES_OPUS.includes(pieceType)) {
    return 'opus';
  }

  // Documentos curtos → Haiku
  if (PIECES_HAIKU.includes(pieceType)) {
    return 'haiku';
  }

  // Padrão: Sonnet (custo/benefício ótimo)
  return 'sonnet';
}

/**
 * Retorna o ID oficial do modelo.
 */
export function routeModelId(pieceType: PieceType, userPlan: UserPlan): string {
  return MODEL_IDS[routeModel(pieceType, userPlan)];
}
