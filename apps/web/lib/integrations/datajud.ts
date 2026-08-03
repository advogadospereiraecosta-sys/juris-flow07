/**
 * Cliente DataJud (CNJ).
 *
 * Docs: https://datajud.cnj.jus.br
 *
 * - API Key pública (mesma para todos os tribunais)
 * - Auth via header: `Authorization: APIKey <chave>`
 * - URL: `https://api-publica.datajud.cnj.jus.br/api_publica_{tribunal}/_search`
 * - Body POST: `{"query": {"match": {"numeroProcesso": "<CNJ>"}}, "size": 1}`
 *
 * Cache em memória por 6h (dados DataJud são razoavelmente estáticos).
 * Para produção, trocar por Redis/upstash.
 */

// Mapeamento Tribunal (sigla) → endpoint DataJud
// Lista oficial obtida em https://datajud.cnj.jus.br (datajud-wiki)
const TRIBUNAIS_ENDPOINT: Record<string, string> = {
  STF: 'stf',
  STJ: 'stj',
  TST: 'tst',
  TSE: 'tse',
  STM: 'stm',
  TRF1: 'trf1',
  TRF2: 'trf2',
  TRF3: 'trf3',
  TRF4: 'trf4',
  TRF5: 'trf5',
  TRF6: 'trf6',
  TRT1: 'trt1',
  TRT2: 'trt2',
  TRT3: 'trt3',
  TRT4: 'trt4',
  TRT5: 'trt5',
  TRT6: 'trt6',
  TRT7: 'trt7',
  TRT8: 'trt8',
  TRT9: 'trt9',
  TRT10: 'trt10',
  TRT11: 'trt11',
  TRT12: 'trt12',
  TRT13: 'trt13',
  TRT14: 'trt14',
  TRT15: 'trt15',
  TRT16: 'trt16',
  TRT17: 'trt17',
  TRT18: 'trt18',
  TRT19: 'trt19',
  TRT20: 'trt20',
  TRT21: 'trt21',
  TRT22: 'trt22',
  TRT23: 'trt23',
  TRT24: 'trt24',
  TJAC: 'tjac',
  TJAL: 'tjal',
  TJAP: 'tjap',
  TJAM: 'tjam',
  TJBA: 'tjba',
  TJCE: 'tjce',
  TJDFT: 'tjdft',
  TJES: 'tjes',
  TJGO: 'tjgo',
  TJMA: 'tjma',
  TJMT: 'tjmt',
  TJMS: 'tjms',
  TJMG: 'tjmg',
  TJPA: 'tjpa',
  TJPB: 'tjpb',
  TJPR: 'tjpr',
  TJPE: 'tjpe',
  TJPI: 'tjpi',
  TJRJ: 'tjrj',
  TJRN: 'tjrn',
  TJRO: 'tjro',
  TJRR: 'tjrr',
  TJRS: 'tjrs',
  TJSC: 'tjsc',
  TJSP: 'tjsp',
  TJSE: 'tjse',
  TJTO: 'tjto',
  TREAC: 'tre-ac',
  TREAL: 'tre-al',
  TREAM: 'tre-am',
  TREAP: 'tre-ap',
  TREBA: 'tre-ba',
  TRECE: 'tre-ce',
  TREDT: 'tre-dft',
  TREES: 'tre-es',
  TREGO: 'tre-go',
  TREMA: 'tre-ma',
  TREMG: 'tre-mg',
  TREMS: 'tre-ms',
  TREMT: 'tre-mt',
  TREPA: 'tre-pa',
  TREPB: 'tre-pb',
  TREPE: 'tre-pe',
  TREPI: 'tre-pi',
  TREPR: 'tre-pr',
  TRERJ: 'tre-rj',
  TRERN: 'tre-rn',
  TRERO: 'tre-ro',
  TRERR: 'tre-rr',
  TRERS: 'tre-rs',
  TRESC: 'tre-sc',
  TRESE: 'tre-se',
  TRESP: 'tre-sp',
  TRETO: 'tre-to',
  TJMRS: 'tjmrs',
  TJMMG: 'tjmmg',
  TJMSP: 'tjmsp',
};

export interface DataJudProcesso {
  cnj: string;
  classe: {
    codigo: number;
    nome: string;
  } | null;
  sistema: { codigo: number; nome: string } | null;
  formato: { codigo: number; nome: string } | null;
  tribunal: string;
  uf: string | null;
  orgaoJulgador: {
    codigo: string;
    nome: string;
    codigoMunicipioIBGE?: number;
  } | null;
  dataAjuizamento: string | null;
  dataHoraUltimaAtualizacao: string | null;
  valorCausa: number | null;
  grau: string | null;
  nivelSigilo: number | null;
  assuntos: Array<{ codigo: number; nome: string }>;
  /** Quantidade de movimentações retornadas */
  movimentosCount: number;
  /** Movimentos completos (disponíveis no _search) */
  movimentos: Array<{
    codigo: number;
    nome: string;
    dataHora: string;
    complementosTabelados?: unknown;
  }>;
  /** Partes — só vêm no endpoint _search/{id}, não no _search */
  partes: {
    autor: Array<{ nome: string; cpfCnpj?: string; tipo: 'PF' | 'PJ' }>;
    reu: Array<{ nome: string; cpfCnpj?: string; tipo: 'PF' | 'PJ' }>;
    outros: Array<{ nome: string; tipo: string }>;
  } | null;
  /** ID interno do DataJud (pra buscar detalhes) */
  datajudId: string | null;
}

export type DataJudResultado =
  | { ok: true; data: DataJudProcesso; cached: boolean }
  | { ok: false; error: string };

// Cache em memória
const cache = new Map<string, { data: DataJudProcesso; expiresAt: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

export function getTribunalDataJudEndpoint(tribunal: string): string | null {
  return TRIBUNAIS_ENDPOINT[tribunal] ?? null;
}

function mapDataJudHit(hit: {
  _id?: string;
  _index?: string;
  _source?: Record<string, unknown>;
  _score?: number;
}, cnj: string, tribunalSigla: string, uf: string | null): DataJudProcesso {
  const s = hit._source ?? {};

  const classe = s.classe as { codigo?: number; nome?: string } | undefined;
  const sistema = s.sistema as { codigo?: number; nome?: string } | undefined;
  const formato = s.formato as { codigo?: number; nome?: string } | undefined;
  const assuntos = (s.assuntos as Array<{ codigo?: number; nome?: string }>) ?? [];
  const orgao = s.orgaoJulgador as { codigo?: string; nome?: string; codigoMunicipioIBGE?: number } | undefined;
  const valorCausa = typeof s.valorCausa === 'number' ? s.valorCausa : null;
  const dataAjuizamento = (s.dataAjuizamento as string) ?? null;
  const dataHoraUltimaAtualizacao = (s.dataHoraUltimaAtualizacao as string) ?? null;
  const grau = (s.grau as string) ?? null;
  const nivelSigilo = typeof s.nivelSigilo === 'number' ? s.nivelSigilo : null;

  // Movimentos — vêm no _search (limitados pelo size)
  const movs = (s.movimentos as Array<{
    codigo?: number;
    nome?: string;
    dataHora?: string;
    complementosTabelados?: unknown;
  }>) ?? [];

  return {
    cnj,
    classe: classe && classe.nome ? { codigo: classe.codigo ?? 0, nome: classe.nome } : null,
    sistema: sistema && sistema.nome ? { codigo: sistema.codigo ?? 0, nome: sistema.nome } : null,
    formato: formato && formato.nome ? { codigo: formato.codigo ?? 0, nome: formato.nome } : null,
    tribunal: tribunalSigla,
    uf,
    orgaoJulgador: orgao && orgao.nome
      ? { codigo: orgao.codigo ?? '', nome: orgao.nome, codigoMunicipioIBGE: orgao.codigoMunicipioIBGE }
      : null,
    dataAjuizamento,
    dataHoraUltimaAtualizacao,
    valorCausa,
    grau,
    nivelSigilo,
    assuntos: assuntos.filter((a) => !!a.nome).map((a) => ({ codigo: a.codigo ?? 0, nome: a.nome! })),
    movimentos: movs.map((m) => ({
      codigo: m.codigo ?? 0,
      nome: m.nome ?? '',
      dataHora: m.dataHora ?? '',
      complementosTabelados: m.complementosTabelados,
    })),
    movimentosCount: movs.length,
    /** _search NÃO retorna partes — elas vêm só em _search/{id} */
    partes: null,
    datajudId: hit._id ?? null,
  };
}

/**
 * Consulta DataJud por CNJ.
 *
 * @param cnj  Número CNJ (com ou sem pontuação)
 * @param tribunalSigla  Sigla do tribunal (ex: TJRN, TRF5). Vem do lookup CNJ local.
 * @param uf  UF do tribunal (opcional, para contexto)
 */
export async function consultarProcessoDataJud(
  cnj: string,
  tribunalSigla: string,
  uf: string | null,
): Promise<DataJudResultado> {
  const apiKey = process.env.DATAJUD_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'DATAJUD_API_KEY não configurada' };
  }

  const endpoint = getTribunalDataJudEndpoint(tribunalSigla);
  if (!endpoint) {
    return { ok: false, error: `Tribunal ${tribunalSigla} não mapeado para DataJud` };
  }

  const cnjDigits = cnj.replace(/\D/g, '');
  const cacheKey = `${endpoint}:${cnjDigits}`;

  // Verifica cache
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ok: true, data: cached.data, cached: true };
  }

  const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${endpoint}/_search`;
  const body = {
    query: { match: { numeroProcesso: cnjDigits } },
    size: 1,
  };

  try {
    // Timeout manual + 3 tentativas com backoff
    let res: Response | undefined;
    let lastErr = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `APIKey ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) break;
        lastErr = `HTTP ${res.status}`;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : 'Erro de rede';
      }
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
    if (!res) {
      return { ok: false, error: `Falha após 3 tentativas: ${lastErr}` };
    }

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `DataJud ${res.status}: ${text.slice(0, 200)}` };
    }

    const json = (await res.json()) as { hits?: { hits?: Array<{ _source?: Record<string, unknown> }> } };
    const hit = json.hits?.hits?.[0];
    if (!hit) {
      return { ok: false, error: 'Processo não encontrado no DataJud (pode ser sigiloso ou não existir)' };
    }

    const data = mapDataJudHit(hit, cnjDigits, tribunalSigla, uf);
    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });

    return { ok: true, data, cached: false };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro de rede' };
  }
}

/**
 * Busca detalhes completos de um processo no DataJud via ID interno.
 * Retorna informações que o _search NÃO inclui (partes, advogados, valor).
 *
 * Primeiro faça `consultarProcessoDataJud(cnj, ...)` pra obter o `datajudId`,
 * depois chame esta função.
 */
export async function consultarProcessoDetalhesDataJud(
  datajudId: string,
  tribunalSigla: string,
  uf: string | null,
): Promise<DataJudResultado> {
  const apiKey = process.env.DATAJUD_API_KEY;
  if (!apiKey) return { ok: false, error: 'DATAJUD_API_KEY não configurada' };

  const endpoint = TRIBUNAIS_ENDPOINT[tribunalSigla];
  if (!endpoint) return { ok: false, error: `Tribunal ${tribunalSigla} não mapeado` };

  const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${endpoint}/_search/${encodeURIComponent(datajudId)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `APIKey ${apiKey}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `DataJud ${res.status}: ${text.slice(0, 200)}` };
    }

    const hit = (await res.json()) as { _id?: string; _source?: Record<string, unknown> };
    if (!hit._source) {
      return { ok: false, error: 'Detalhes não encontrados para este processo' };
    }

    const s = hit._source;
    const partesRaw = (s.partes as Array<{
      nome?: string;
      tipo?: string;
      cpf?: string;
      cnpj?: string;
    }>) ?? [];

    const cnjFromHit = (s.numeroProcesso as string) ?? '';

    const partes = {
      autor: partesRaw.filter((p) => (p.tipo ?? '').toLowerCase().includes('autor')).map((p) => ({
        nome: p.nome ?? '',
        cpfCnpj: p.cnpj ?? p.cpf,
        tipo: (p.cnpj ? 'PJ' : 'PF') as 'PF' | 'PJ',
      })),
      reu: partesRaw
        .filter((p) => (p.tipo ?? '').toLowerCase().includes('réu') || (p.tipo ?? '').toLowerCase().includes('reu'))
        .map((p) => ({
          nome: p.nome ?? '',
          cpfCnpj: p.cnpj ?? p.cpf,
          tipo: (p.cnpj ? 'PJ' : 'PF') as 'PF' | 'PJ',
        })),
      outros: partesRaw
        .filter((p) => {
          const t = (p.tipo ?? '').toLowerCase();
          return !t.includes('autor') && !t.includes('réu') && !t.includes('reu');
        })
        .map((p) => ({ nome: p.nome ?? '', tipo: p.tipo ?? '' })),
    };

    // Atualiza cache com dados completos
    const cacheKey = `${endpoint}:${cnjFromHit}`;
    const cached = cache.get(cacheKey);
    const baseData = (cached?.data ?? mapDataJudHit(
      hit as { _id?: string; _source?: Record<string, unknown>; _score?: number },
      cnjFromHit,
      tribunalSigla,
      uf,
    ));
    const dataCompleta: DataJudProcesso = { ...baseData, partes };
    cache.set(cacheKey, { data: dataCompleta, expiresAt: Date.now() + CACHE_TTL_MS });

    return { ok: true, data: dataCompleta, cached: false };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro de rede' };
  }
}

/**
 * Mapeia classe DataJud → área jurídica Juris-Flow.
 */
export function mapearClasseParaAreaJuridica(nomeClasse: string): string | null {
  const n = nomeClasse.toLowerCase();
  if (n.includes('penal') || n.includes('criminal')) return 'CRIMINAL';
  if (n.includes('trabalhista')) return 'TRABALHISTA';
  if (n.includes('família') || n.includes('familia') || n.includes('órfão') || n.includes('curatela')) return 'FAMILIA';
  if (n.includes('tributário') || n.includes('tributario') || n.includes('execução fiscal')) return 'TRIBUTARIO';
  if (n.includes('previdenciário') || n.includes('previdenciario')) return 'PREVIDENCIARIO';
  if (n.includes('consumidor') || n.includes('cdc')) return 'CONSUMIDOR';
  if (n.includes('empresarial') || n.includes('recuperação') || n.includes('falência')) return 'EMPRESARIAL';
  if (n.includes('administrativo') || n.includes('improbidade')) return 'ADMINISTRATIVO';
  if (n.includes('imobiliário') || n.includes('imobiliario')) return 'IMOBILIARIO';
  if (n.includes('cumprimento') || n.includes('execução') || n.includes('execucao')) return 'CIVEL';
  return 'CIVEL';
}
