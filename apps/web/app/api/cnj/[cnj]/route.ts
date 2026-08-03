import { NextResponse } from 'next/server';
import { parseCNJ, formatCNJ } from '@/lib/integrations/cnj-parser';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cnj/[cnj]
 *
 * Devolve metadados extraídos do número CNJ:
 * - tribunal (sigla)
 * - ramo de justiça
 * - estado (UF)
 * - comarca ou subseção
 *
 * Para puxar dados reais do processo (classe, partes, valor,
 * movimentações), use o DataJud via action `consultarProcessoDataJudAction`.
 */
export async function GET(
  _req: Request,
  { params }: { params: { cnj: string } },
) {
  const cnj = params.cnj;
  const digits = cnj.replace(/\D/g, '');

  if (digits.length !== 20) {
    return NextResponse.json(
      { error: `CNJ deve ter 20 dígitos (recebido: ${digits.length})` },
      { status: 400 },
    );
  }

  const info = parseCNJ(digits);
  if (!info) {
    return NextResponse.json(
      { error: 'Não foi possível identificar o tribunal a partir deste CNJ' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    cnj: digits,
    formatted: formatCNJ(digits),
    tribunal: info.tribunal,
    ramo: info.ramo,
    uf: info.uf ?? null,
    segmento: info.segmento ?? null,
  });
}
