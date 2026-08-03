/**
 * Parser de número CNJ.
 *
 * Extrai tribunal, ramo de justiça e UF a partir do número CNJ.
 * Baseado na Resolução CNJ 65/2008 e atualizações posteriores.
 *
 * Formato: NNNNNNN-DD.AAAA.J.TR.OOOO
 * Onde J = segmento (1 dígito), TR = tribunal (2 dígitos)
 */

export interface CnjInfo {
  cnj: string;
  tribunal: string;
  ramo: 'ESTADUAL' | 'FEDERAL' | 'TRABALHO' | 'MILITAR' | 'ELEITORAL' | 'SUPERIOR';
  uf?: string;
  segmento?: string;
}

const TRIBUNAIS_ESTADUAIS: Record<string, { uf: string; tribunal: string; segmento: string }> = {
  '8.01': { uf: 'AC', tribunal: 'TJAC', segmento: 'Justiça Estadual do Acre' },
  '8.02': { uf: 'AL', tribunal: 'TJAL', segmento: 'Justiça Estadual de Alagoas' },
  '8.03': { uf: 'AP', tribunal: 'TJAP', segmento: 'Justiça Estadual do Amapá' },
  '8.04': { uf: 'AM', tribunal: 'TJAM', segmento: 'Justiça Estadual do Amazonas' },
  '8.05': { uf: 'BA', tribunal: 'TJBA', segmento: 'Justiça Estadual da Bahia' },
  '8.06': { uf: 'CE', tribunal: 'TJCE', segmento: 'Justiça Estadual do Ceará' },
  '8.07': { uf: 'DF', tribunal: 'TJDFT', segmento: 'Justiça Estadual do DF' },
  '8.08': { uf: 'ES', tribunal: 'TJES', segmento: 'Justiça Estadual do Espírito Santo' },
  '8.09': { uf: 'GO', tribunal: 'TJGO', segmento: 'Justiça Estadual de Goiás' },
  '8.10': { uf: 'MA', tribunal: 'TJMA', segmento: 'Justiça Estadual do Maranhão' },
  '8.11': { uf: 'MT', tribunal: 'TJMT', segmento: 'Justiça Estadual de Mato Grosso' },
  '8.12': { uf: 'MS', tribunal: 'TJMS', segmento: 'Justiça Estadual de Mato Grosso do Sul' },
  '8.13': { uf: 'MG', tribunal: 'TJMG', segmento: 'Justiça Estadual de Minas Gerais' },
  '8.14': { uf: 'PA', tribunal: 'TJPA', segmento: 'Justiça Estadual do Pará' },
  '8.15': { uf: 'PB', tribunal: 'TJPB', segmento: 'Justiça Estadual da Paraíba' },
  '8.16': { uf: 'PR', tribunal: 'TJPR', segmento: 'Justiça Estadual do Paraná' },
  '8.17': { uf: 'PE', tribunal: 'TJPE', segmento: 'Justiça Estadual de Pernambuco' },
  '8.18': { uf: 'PI', tribunal: 'TJPI', segmento: 'Justiça Estadual do Piauí' },
  '8.19': { uf: 'RJ', tribunal: 'TJRJ', segmento: 'Justiça Estadual do Rio de Janeiro' },
  '8.20': { uf: 'RN', tribunal: 'TJRN', segmento: 'Justiça Estadual do Rio Grande do Norte' },
  '8.21': { uf: 'RS', tribunal: 'TJRS', segmento: 'Justiça Estadual do Rio Grande do Sul' },
  '8.22': { uf: 'RO', tribunal: 'TJRO', segmento: 'Justiça Estadual de Rondônia' },
  '8.23': { uf: 'RR', tribunal: 'TJRR', segmento: 'Justiça Estadual de Roraima' },
  '8.24': { uf: 'SC', tribunal: 'TJSC', segmento: 'Justiça Estadual de Santa Catarina' },
  '8.25': { uf: 'SE', tribunal: 'TJSE', segmento: 'Justiça Estadual de Sergipe' },
  '8.26': { uf: 'SP', tribunal: 'TJSP', segmento: 'Justiça Estadual de São Paulo' },
  '8.27': { uf: 'TO', tribunal: 'TJTO', segmento: 'Justiça Estadual do Tocantins' },
};

const TRIBUNAIS_FEDERAIS: Record<string, string> = {
  '5.01': 'TRF1',
  '5.02': 'TRF2',
  '5.03': 'TRF3',
  '5.04': 'TRF4',
  '5.05': 'TRF5',
  '5.06': 'TRF6',
};

const TRIBUNAIS_TRABALHO: Record<string, string> = {
  '6.01': 'TRT1',
  '6.02': 'TRT2',
  '6.03': 'TRT3',
  '6.04': 'TRT4',
  '6.05': 'TRT5',
  '6.06': 'TRT6',
  '6.07': 'TRT7',
  '6.08': 'TRT8',
  '6.09': 'TRT9',
  '6.10': 'TRT10',
  '6.11': 'TRT11',
  '6.12': 'TRT12',
  '6.13': 'TRT13',
  '6.14': 'TRT14',
  '6.15': 'TRT15',
  '6.16': 'TRT16',
  '6.17': 'TRT17',
  '6.18': 'TRT18',
  '6.19': 'TRT19',
  '6.20': 'TRT20',
  '6.21': 'TRT21',
  '6.22': 'TRT22',
  '6.23': 'TRT23',
  '6.24': 'TRT24',
};

const UF_POR_TRF: Record<string, string> = {
  TRF1: 'DF/AC/AM/AP/BA/GO/MA/MT/PA/PI/RO/RR/TO',
  TRF2: 'ES/RJ',
  TRF3: 'MS/SP',
  TRF4: 'PR/RS/SC',
  TRF5: 'AL/CE/PB/PE/RN/SE',
  TRF6: 'MG',
};

export function parseCNJ(cnj: string): CnjInfo | null {
  const digits = cnj.replace(/\D/g, '');
  if (digits.length !== 20) return null;

  const segmento = digits[13];
  const tribunalCode = `${segmento}.${digits[14]}${digits[15]}`;

  if (segmento === '1') return { cnj: digits, tribunal: 'STF', ramo: 'SUPERIOR' };
  if (segmento === '3') return { cnj: digits, tribunal: 'STJ', ramo: 'SUPERIOR' };
  if (segmento === '4' || segmento === '9') return { cnj: digits, tribunal: 'TJM', ramo: 'MILITAR' };

  if (segmento === '5') {
    const t = TRIBUNAIS_FEDERAIS[tribunalCode];
    if (!t) return null;
    return { cnj: digits, tribunal: t, ramo: 'FEDERAL', segmento: UF_POR_TRF[t] };
  }

  if (segmento === '6') {
    const t = TRIBUNAIS_TRABALHO[tribunalCode];
    if (!t) return { cnj: digits, tribunal: 'TRT', ramo: 'TRABALHO' };
    return { cnj: digits, tribunal: t, ramo: 'TRABALHO' };
  }

  if (segmento === '7') return { cnj: digits, tribunal: 'STM', ramo: 'MILITAR' };

  if (segmento === '8') {
    const t = TRIBUNAIS_ESTADUAIS[tribunalCode];
    if (!t) return null;
    return { cnj: digits, tribunal: t.tribunal, ramo: 'ESTADUAL', uf: t.uf, segmento: t.segmento };
  }

  return null;
}

export function formatCNJ(cnj: string): string {
  const digits = cnj.replace(/\D/g, '');
  if (digits.length !== 20) return cnj;
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits[13]}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
}

export function maskCNJ(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 20);
  let out = d;
  if (d.length > 7) out = `${d.slice(0, 7)}-${d.slice(7)}`;
  if (d.length > 9) out = `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9)}`;
  if (d.length > 13) out = `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13)}`;
  if (d.length > 14) out = `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14)}`;
  if (d.length > 16) out = `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16)}`;
  return out;
}
