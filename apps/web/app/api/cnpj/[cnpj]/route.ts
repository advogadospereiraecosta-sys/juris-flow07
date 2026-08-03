import { NextResponse } from 'next/server';

/**
 * Proxy server-side para BrasilAPI CNPJ lookup.
 *
 * Por que existe? Para evitar expor a URL da API no cliente e
 * centralizar o mapeamento de campos. BrasilAPI é pública,
 * então este endpoint também é público (mas com rate limit
 * implícito via Next.js fetch cache).
 */

type BrasilAPICompany = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  descricao_situacao_cadastral: string;
  cnae_fiscal_descricao: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  uf: string;
  municipio: string;
};

export async function GET(_req: Request, { params }: { params: { cnpj: string } }) {
  const cleaned = params.cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) {
    return NextResponse.json({ error: 'CNPJ deve ter 14 dígitos' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleaned}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Juris-Flow/1.0)',
      },
      // Cache 24h — CNPJ muda pouco
      next: { revalidate: 86400 },
    });

    if (res.status === 404) {
      return NextResponse.json({ error: 'CNPJ não encontrado na Receita Federal' }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'Erro ao consultar CNPJ' }, { status: 502 });
    }

    const data = (await res.json()) as BrasilAPICompany;

    return NextResponse.json({
      legalName: data.razao_social,
      tradeName: data.nome_fantasia || null,
      address: {
        cep: data.cep,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento || undefined,
        bairro: data.bairro,
        cidade: data.municipio,
        uf: data.uf,
      },
      status: data.descricao_situacao_cadastral,
      cnae: data.cnae_fiscal_descricao,
    });
  } catch (e) {
    console.error('[GET /api/cnpj]', e);
    return NextResponse.json({ error: 'Erro de rede ao consultar CNPJ' }, { status: 503 });
  }
}