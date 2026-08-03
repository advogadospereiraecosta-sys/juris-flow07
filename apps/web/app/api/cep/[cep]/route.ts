import { NextResponse } from 'next/server';

/**
 * Proxy server-side para ViaCEP.
 * Auto-preenche logradouro, bairro, cidade e UF a partir do CEP.
 * Endpoint público (ViaCEP é API aberta).
 */

type ViaCEPResponse = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
};

export async function GET(_req: Request, { params }: { params: { cep: string } }) {
  const cleaned = params.cep.replace(/\D/g, '');
  if (cleaned.length !== 8) {
    return NextResponse.json({ error: 'CEP deve ter 8 dígitos' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Erro ao consultar CEP' }, { status: 502 });
    }

    const data = (await res.json()) as ViaCEPResponse;
    if (data.erro) {
      return NextResponse.json({ error: 'CEP não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      cep: data.cep,
      logradouro: data.logradouro,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.localidade,
      uf: data.uf,
    });
  } catch (e) {
    console.error('[GET /api/cep]', e);
    return NextResponse.json({ error: 'Erro de rede ao consultar CEP' }, { status: 503 });
  }
}