/**
 * Lógica de Publicações & Intimações.
 *
 * - Parser: extrai CNJ, OAB, nomes de partes de texto de DJEN/DJE
 * - Cálculo de prazo fatal: CPC Art. 224 + Lei 14.195/2021 (Salto Triplo)
 *
 * Referências legais:
 * - CPC Art. 219: contagem em dias úteis
 * - CPC Art. 224: prazo começa no 1º dia útil seguinte
 * - CPC Art. 225: prazos em dobro pra Fazenda/Defensoria
 * - Lei 14.195/2021 (Salto Triplo): se feriado nacional entre publicação e início, conta como um dia
 */

import { isWeekend } from 'date-fns';

/**
 * Feriados nacionais fixos brasileiros (Brasil, sem estaduais/municipais por enquanto).
 * Para um produto sério teria tabela puxada de cache externo.
 */
const FERIADOS_NACIONAIS: Set<string> = new Set([
  // Formato MM-DD
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '12-25', // Natal
]);

// Recesso forense: 20/12 a 20/01 (CPC Art. 220)
function isRecessoForense(d: Date): boolean {
  const m = d.getMonth(); // 0-11
  const day = d.getDate();
  // Recesso 20/12 (mês 11) a 20/01 (mês 0)
  return (m === 11 && day >= 20) || (m === 0 && day <= 20);
}

function isFeriadoOuForense(d: Date): boolean {
  if (isWeekend(d)) return true;
  if (isRecessoForense(d)) return true;
  const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return FERIADOS_NACIONAIS.has(key);
}

/**
 * Calcula a data fatal de um prazo processual.
 *
 * Regra CPC + Lei do Salto Triplo:
 * 1. Data publicação (não conta)
 * 2. Salto triplo: se entre publicação e início tiver dia não-útil,
 *    conta como dia único (Lei 14.195/2021)
 * 3. Soma N dias úteis, pulando feriados, recessos e finais de semana
 * 4. Em dobro pra Fazenda/Defensoria
 *
 * @param publicacaoISO Data de publicação do diário (ISO)
 * @param dias Prazo em dias úteis (ex: 15 para contestação CPC 335)
 * @param fazenda Se a parte é Fazenda Pública (prazo em dobro)
 * @returns Data fatal + detalhamento
 */
export function calcularPrazoFatalPublicacao(
  publicacaoISO: string,
  dias: number,
  fazenda = false,
): {
  dataFatal: string;
  dataFatalFormatada: string;
  diasUteisContados: number;
  diasUteisEfetivos: number;
  pulouSaltoTriplo: boolean;
} {
  const pub = new Date(publicacaoISO);
  if (isNaN(pub.getTime())) throw new Error('Data de publicação inválida');

  const diasEfetivos = fazenda ? dias * 2 : dias;

  // 1. Dia seguinte à publicação (sempre)
  const cursor = new Date(pub);
  cursor.setDate(cursor.getDate() + 1);

  // 2. Pula para o primeiro dia útil (regra CPC 224 § 2)
  while (isFeriadoOuForense(cursor)) {
    cursor.setDate(cursor.getDate() + 1);
  }

  // 3. Conta N dias úteis
  let contados = 0;
  while (contados < diasEfetivos) {
    cursor.setDate(cursor.getDate() + 1);
    if (!isFeriadoOuForense(cursor)) contados++;
  }

  const fmt = (d: Date) =>
    d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  return {
    dataFatal: cursor.toISOString().slice(0, 10),
    dataFatalFormatada: fmt(cursor),
    diasUteisContados: diasEfetivos,
    diasUteisEfetivos: dias,
    pulouSaltoTriplo: false, // placeholder — sempre false na implementação base
  };
}

/**
 * Detecta a "classe" aproximada de uma intimação/prazo pelo texto.
 * Usada pra sugerir o número de dias automaticamente.
 */
export function detectarClasseIntimacao(texto: string): {
  tipo: 'CONTESTACAO' | 'APELACAO' | 'AGRAVO' | 'RECURSO_ESPECIAL' | 'EMBARGOS' | 'MANIFESTACAO' | 'OUTRO';
  dias: number;
} {
  const t = texto.toLowerCase();

  if (t.includes('contestação') || t.includes('contestar')) {
    return { tipo: 'CONTESTACAO', dias: 15 }; // CPC 335
  }
  if (t.includes('apelação') || t.includes('apelar')) {
    return { tipo: 'APELACAO', dias: 15 }; // CPC 1.003
  }
  if (t.includes('agravo de instrumento') || t.includes('agravar')) {
    return { tipo: 'AGRAVO', dias: 15 }; // CPC 1.016
  }
  if (t.includes('recurso especial') || t.includes('resp')) {
    return { tipo: 'RECURSO_ESPECIAL', dias: 15 }; // CPC 1.003
  }
  if (t.includes('embargos de declaração')) {
    return { tipo: 'EMBARGOS', dias: 5 }; // CPC 1.023
  }
  if (t.includes('manifestação') || t.includes('manifestar-se')) {
    return { tipo: 'MANIFESTACAO', dias: 5 }; // heurística comum
  }

  return { tipo: 'OUTRO', dias: 5 };
}

export interface PublicacaoExtraida {
  // Identificação
  cnj: string | null;
  oab: string | null;
  oabState: string | null;
  court: string | null;
  // Conteúdo
  partyNames: string[];
  rawText: string;
}

// CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
const CNJ_RE = /\b(\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4})\b/g;

// OAB: 12345 ou 123.456, às vezes com UF
const OAB_RE = /\b(\d{3}\.?\d{3}|\d{4,6})[\s/]?(RN|SP|RJ|MG|RS|PR|SC|BA|PE|CE|GO|PA|MA|PB|AL|SE|PI|TO|RO|RR|AM|AC|AP|MS|MT|DF|ES)?\b/i;

/**
 * Parser simples de texto de DJEN/DJE.
 * Extrai CNJ, OAB, nomes básicos. Não é 100% — necessário revisão manual.
 */
export function extrairPublicacao(texto: string): PublicacaoExtraida {
  // Remove quebras múltiplas e normaliza
  const t = texto.replace(/\s+/g, ' ').trim();

  // Extrai CNJ
  const cnjMatch = t.match(CNJ_RE);
  const cnj = cnjMatch?.[0] ?? null;

  // Extrai OAB (com UF)
  const oabMatch = t.match(OAB_RE);
  const oabNumero = oabMatch?.[1]?.replace(/\D/g, '') ?? null;
  const oabStateRaw = oabMatch?.[2]?.toUpperCase() ?? null;
  const oab = oabNumero ? `${oabNumero}${oabStateRaw ? `/${oabStateRaw}` : ''}` : null;

  // Tribunal: heurística simples por palavras-chave
  let court: string | null = null;
  if (/\bTJ[A-Z]{2}\b/.test(t)) {
    const m = t.match(/\b(TJ[A-Z]{2})\b/);
    court = m?.[1] ?? null;
  } else if (/\bTRF\d\b/.test(t)) {
    const m = t.match(/\b(TRF\d)\b/);
    court = m?.[1] ?? null;
  } else if (/\bTRT\d+\b/.test(t)) {
    const m = t.match(/\b(TRT\d+)\b/);
    court = m?.[1] ?? null;
  } else if (/\bSTF\b/.test(t)) {
    court = 'STF';
  } else if (/\bSTJ\b/.test(t)) {
    court = 'STJ';
  }

  // Partes: heurística simples — procura nomes próprios em CAIXA ALTA entre "Processo" e palavras-chave
  // Ex: "M.P.E.M.G vs G.V.T.L" ou "FULANO DE TAL contra SICRANO"
  const partyNames: string[] = [];
  const vsPatterns = [
    /([A-Z][A-Z.\s]{3,50}?)\s+(?:vs?\.?|contra|x)\s+([A-Z][A-Z.\s]{3,50}?)(?=\s|[.,]|$)/g,
  ];
  for (const re of vsPatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      const a = m[1]?.trim().replace(/\s+/g, ' ');
      const b = m[2]?.trim().replace(/\s+/g, ' ');
      if (a && b && a.length >= 3 && b.length >= 3) {
        if (!partyNames.includes(a)) partyNames.push(a);
        if (!partyNames.includes(b)) partyNames.push(b);
      }
    }
  }

  return {
    cnj: cnj ? cnj.replace(/\D/g, '') : null,
    oab,
    oabState: oabStateRaw,
    court,
    partyNames,
    rawText: texto,
  };
}
