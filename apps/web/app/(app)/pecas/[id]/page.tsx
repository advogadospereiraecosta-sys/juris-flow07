import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { LinkButton } from '@juris-flow/ui';
import { ArrowLeft, User, Gavel, Calendar, Layers } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieceViewer } from '@/components/pieces/piece-viewer';

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: 'Peça — Juris-Flow' };
}

const TYPE_LABEL: Record<string, string> = {
  PETICAO_INICIAL_CIVEL: 'Petição Inicial Cível',
  CONTESTACAO_CIVEL: 'Contestação Cível',
  APELACAO_CIVEL: 'Recurso de Apelação',
  HABEAS_CORPUS: 'Habeas Corpus',
  MANDADO_SEGURANCA: 'Mandado de Segurança',
  RECURSO_ORDINARIO: 'Recurso Ordinário',
  AGRAVO_INSTRUMENTO: 'Agravo de Instrumento',
  EMBARGOS_DECLARACAO: 'Embargos de Declaração',
  CONTRATO_HONORARIOS: 'Contrato de Honorários',
  PROCURACAO: 'Procuração',
  OUTRO: 'Outro',
};

// UUID v1-5 com hex (8-4-4-4-12)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PecaDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) notFound();

  // Garante que o id é UUID válido antes de consultar o Prisma
  if (!UUID_RE.test(params.id)) notFound();

  const piece = await prisma.pieceGeneration.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
    include: {
      case: { select: { id: true, title: true, cnjNumber: true } },
      template: { select: { id: true, name: true } },
      user: { select: { id: true, fullName: true, email: true } },
    },
  });
  if (!piece) notFound();

  const initial = {
    id: piece.id,
    status: piece.status as 'DRAFT' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
    outputText: piece.outputText,
    errorMessage: piece.errorMessage,
    inputTokens: piece.inputTokens,
    outputTokens: piece.outputTokens,
    costCents: piece.costCents,
    updatedAt: piece.updatedAt.toISOString(),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <LinkButton href="/pecas" size="sm" variant="ghost" className="mt-1 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </LinkButton>
        <div className="flex-1">
          <h1 className="vf-display-md text-xl font-bold text-ink-50">
            {TYPE_LABEL[piece.type] ?? piece.type}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-ink-400">
            {piece.case && (
              <Link href={`/processos/${piece.case.id}`} className="flex items-center gap-1 text-ink-200 hover:text-vara-300">
                <Gavel className="h-3.5 w-3.5" />
                {piece.case.title}
                {piece.case.cnjNumber && <span className="font-mono text-[10px] text-ink-500">{piece.case.cnjNumber}</span>}
              </Link>
            )}
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {piece.user.fullName}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDistanceToNow(new Date(piece.createdAt), { locale: ptBR, addSuffix: true })}
            </span>
            <span className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              {piece.model.replace('CLAUDE_', '')} · temp {piece.temperature}
            </span>
          </div>
        </div>
      </div>

      <PieceViewer pieceId={piece.id} initial={initial} type={piece.type} />
    </div>
  );
}