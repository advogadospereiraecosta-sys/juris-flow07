import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { Card, CardContent, Badge, LinkButton } from '@juris-flow/ui';
import { Plus, FileText, Loader2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const metadata = { title: 'Peças — Juris-Flow' };

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

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; variant: 'success' | 'warning' | 'muted' | 'default' | 'danger' | 'info' }> = {
  DRAFT: { label: 'Rascunho', icon: <FileText className="h-3 w-3" />, variant: 'muted' },
  GENERATING: { label: 'Gerando', icon: <Loader2 className="h-3 w-3 animate-spin" />, variant: 'info' },
  COMPLETED: { label: 'Concluída', icon: <CheckCircle2 className="h-3 w-3" />, variant: 'success' },
  FAILED: { label: 'Falhou', icon: <AlertTriangle className="h-3 w-3" />, variant: 'danger' },
  CANCELLED: { label: 'Cancelada', icon: <AlertTriangle className="h-3 w-3" />, variant: 'muted' },
};

export default async function PecasPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId;

  const pieces = tenantId
    ? await prisma.pieceGeneration.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          case: { select: { id: true, title: true } },
        },
      })
    : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = pieces;
  const total = pieces.length;
  const completed = pieces.filter((p) => p.status === 'COMPLETED').length;
  const generating = pieces.filter((p) => p.status === 'GENERATING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="vf-display-md text-2xl font-bold text-ink-50">Peças com IA</h1>
          <p className="vf-caption text-ink-400 mt-0.5">
            {total} peça{total !== 1 ? 's' : ''} · {completed} concluída(s)
            {generating > 0 && ` · ${generating} gerando agora`}
          </p>
        </div>
        <LinkButton href="/pecas/nova" size="sm" rightIcon={<Plus className="h-4 w-4" />}>
          Gerar peça
        </LinkButton>
      </div>

      {/* Disclaimer */}
      <div className="rounded-md border border-prazo-700/40 bg-prazo-950/20 px-4 py-3 text-xs text-prazo-300 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Peças geradas por IA <strong>precisam ser revisadas por advogado habilitado</strong> antes do protocolo.
          O Juris-Flow é ferramenta de produtividade; a responsabilidade pelo conteúdo é do operador.
        </span>
      </div>

      {/* Lista */}
      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="h-12 w-12 text-ink-700 mb-4" />
            <p className="text-ink-400 font-medium">Nenhuma peça gerada ainda</p>
            <p className="text-ink-500 text-sm mt-1">
              Comece com uma petição inicial, contestação ou recurso de apelação.
            </p>
            <LinkButton href="/pecas/nova" size="sm" variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-1" /> Gerar primeira peça
            </LinkButton>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((p) => {
            const statusCfg = STATUS_CONFIG[p.status] ?? { label: p.status, icon: <FileText className="h-3 w-3" />, variant: 'default' as const };
            return (
              <Link key={p.id} href={`/pecas/${p.id}`}>
                <Card className="hover:border-ink-600 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-semibold text-ink-100">
                            {TYPE_LABEL[p.type] ?? p.type}
                          </h3>
                          <Badge variant={statusCfg.variant} className="text-[10px] gap-1">
                            {statusCfg.icon}
                            {statusCfg.label}
                          </Badge>
                          <Badge variant="muted" className="text-[10px]">{p.model.replace('CLAUDE_', '')}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-400">
                          {p.case && (
                            <span>Processo: <span className="text-ink-300">{p.case.title}</span></span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(p.createdAt), { locale: ptBR, addSuffix: true })}
                          </span>
                          {p.inputTokens && p.outputTokens && (
                            <span>
                              {p.inputTokens.toLocaleString('pt-BR')} → {p.outputTokens.toLocaleString('pt-BR')} tokens
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}