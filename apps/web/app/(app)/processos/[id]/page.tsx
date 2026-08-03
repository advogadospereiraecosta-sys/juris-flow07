import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format, isPast, isToday as isTodayFn } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, LinkButton, Input, Button } from '@juris-flow/ui';
import {
  ArrowLeft, Gavel, User, Building2, Calendar,
  AlertTriangle, CheckSquare, ChevronRight, FileText,
  FolderOpen, Users, ScrollText,
} from 'lucide-react';
import { addMovementAction } from '@/lib/actions/cases';
import { updateTaskAction } from '@/lib/actions/tasks';
import { DocumentsButton } from '@/components/documents/documents-button';
import { DatajudSyncButton } from '@/components/processes/datajud-sync-button';

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: 'Processo — Juris-Flow' };
}

const AREA_LABELS: Record<string, string> = {
  CIVEL: 'Cível', TRABALHISTA: 'Trabalhista', CRIMINAL: 'Criminal',
  FAMILIA: 'Família', TRIBUTARIO: 'Tributário', PREVIDENCIARIO: 'Previdenciário',
  EMPRESARIAL: 'Empresarial', CONSUMIDOR: 'Consumidor',
  ADMINISTRATIVO: 'Administrativo', IMOBILIARIO: 'Imobiliário', OUTRO: 'Outro',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'muted' | 'default' }> = {
  ACTIVE: { label: 'Ativo', variant: 'success' },
  SUSPENDED: { label: 'Suspenso', variant: 'warning' },
  JUDGED: { label: 'Julgado', variant: 'default' },
  ARCHIVED: { label: 'Arquivado', variant: 'muted' },
  SETTLED: { label: 'Acordado', variant: 'default' },
  EXECUTED: { label: 'Executado', variant: 'default' },
  APPEALED: { label: 'Recursal', variant: 'warning' },
};

const PRIORITY_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'muted' }> = {
  LOW: { label: 'Baixa', variant: 'muted' },
  MEDIUM: { label: 'Média', variant: 'muted' },
  HIGH: { label: 'Alta', variant: 'warning' },
  URGENT: { label: 'Urgente', variant: 'danger' },
};

const TASK_STATUS_CONFIG: Record<string, { label: string; variant: 'muted' | 'default' | 'warning' | 'success' | 'danger' }> = {
  TODO: { label: 'A fazer', variant: 'muted' },
  DOING: { label: 'Em progresso', variant: 'default' },
  BLOCKED: { label: 'Bloqueado', variant: 'danger' },
  DONE: { label: 'Concluído', variant: 'success' },
  CANCELLED: { label: 'Cancelada', variant: 'muted' },
};

const PARTY_ROLE_LABELS: Record<string, string> = {
  AUTOR: 'Autor',
  REU: 'Réu',
  LITISCONSORTE: 'Litisconsorte',
  ASSISTENTE: 'Assistente',
  TERCEIRO: 'Terceiro',
  OPOENTE: 'Opoente',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TABS = [
  { id: 'resumo', label: 'Resumo', icon: ScrollText },
  { id: 'movimentos', label: 'Movimentos', icon: Calendar },
  { id: 'partes', label: 'Partes', icon: Users },
  { id: 'documentos', label: 'Documentos', icon: FolderOpen },
  { id: 'pecas', label: 'Peças', icon: FileText },
  { id: 'tarefas', label: 'Tarefas', icon: CheckSquare },
] as const;

type TabId = (typeof TABS)[number]['id'];

function getTabId(searchParams: { tab?: string }): TabId {
  const t = searchParams.tab as TabId;
  return TABS.some((tab) => tab.id === t) ? t : 'resumo';
}

export default async function ProcessoDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;

  if (!tenantId) notFound();
  if (!UUID_RE.test(params.id)) notFound();

  const [caseData, personData] = await Promise.all([
    prisma.case.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: {
        movements: { orderBy: { occurredAt: 'desc' }, take: 200 },
        tasks: { where: { deletedAt: null }, orderBy: [{ status: 'asc' }, { dueDate: 'asc' }] },
        pieceGenerations: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            type: true,
            model: true,
            status: true,
            createdAt: true,
          },
        },
      },
    }),
    // Person não está relacionada via Prisma include, então busco direto
    (async () => {
      const cli = await prisma.case.findFirst({
        where: { id: params.id, tenantId, deletedAt: null },
        select: { clientId: true },
      });
      if (!cli?.clientId) return null;
      return prisma.person.findUnique({
        where: { id: cli.clientId },
        select: {
          fullName: true,
          legalName: true,
        },
      });
    })(),
  ]);
  const c = caseData as any;
  const person = personData;

  if (!c) notFound();

  const clientName = (person as any)?.fullName ?? (person as any)?.legalName ?? null;
  const areaLabel = AREA_LABELS[c.legalArea] ?? c.legalArea;
  const statusCfg = (STATUS_CONFIG as any)[c.status] ?? { label: c.status, variant: 'default' as const };
  const tab = getTabId(searchParams);

  const urgentDeadline = c.movements
    .filter((m: { isFatal: boolean; deadlineEndsAt: Date | null }) => m.isFatal && m.deadlineEndsAt)
    .sort((a: { deadlineEndsAt: Date }, b: { deadlineEndsAt: Date }) =>
      new Date(a.deadlineEndsAt).getTime() - new Date(b.deadlineEndsAt).getTime()
    )[0];

  const overdueDeadline = urgentDeadline && isPast(new Date(urgentDeadline.deadlineEndsAt));
  const todayDeadline = urgentDeadline && isTodayFn(new Date(urgentDeadline.deadlineEndsAt));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <LinkButton href="/processos" size="sm" variant="ghost" className="mt-1 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </LinkButton>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="vf-display-md text-xl font-bold text-ink-50">{c.title}</h1>
              {c.cnjNumber && (
                <span className="font-mono text-xs bg-ink-800 text-ink-300 px-2 py-1 rounded">
                  {c.cnjNumber}
                </span>
              )}
              <Badge variant={statusCfg.variant} className="text-[10px]">{statusCfg.label}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-ink-400 flex-wrap">
              {clientName && (
                <span className="flex items-center gap-1 text-ink-300">
                  <User className="h-3.5 w-3.5" />
                  {clientName}
                </span>
              )}
              <span>·</span>
              <span className="flex items-center gap-1">
                <Gavel className="h-3.5 w-3.5" />{areaLabel}
              </span>
              {c.court && <span>· {c.court}{c.district ? `, ${c.district}` : ''}</span>}
              {c.movimentosCount > 0 && (
                <span>· {c.movimentosCount} movimentaç{c.movimentosCount === 1 ? 'ão' : 'ões'}</span>
              )}
            </div>
          </div>
        </div>
        <LinkButton href={`/processos/${c.id}/editar`} size="sm" variant="outline">
          Editar
        </LinkButton>
        <DatajudSyncButton caseId={c.id} cnj={c.cnjNumber} />
        <DocumentsButton
          drivePath={c.cnjNumber ? `Clientes/${clientName?.replace(/[/\\]/g, ' ') ?? 'sem-cliente'}/${c.cnjNumber}` : `Clientes/${clientName?.replace(/[/\\]/g, ' ') ?? 'sem-cliente'}/${c.id}`}
          scopeLabel={c.cnjNumber ?? `Processo ${c.id.slice(0, 8)}`}
        />
      </div>

      {/* Deadline alert (topo, sempre visível) */}
      {urgentDeadline && (
        <div className={`rounded-md border px-4 py-3 text-sm flex items-start gap-3 ${overdueDeadline ? 'border-rede-700 bg-rede-950/40' : todayDeadline ? 'border-prazo-700 bg-prazo-950/40' : 'border-improcede-700 bg-improcede-950/40'}`}>
          <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${overdueDeadline ? 'text-rede-400' : todayDeadline ? 'text-prazo-400' : 'text-improcede-400'}`} />
          <div>
            <p className={`font-medium ${overdueDeadline ? 'text-rede-200' : todayDeadline ? 'text-prazo-200' : 'text-improcede-200'}`}>
              {overdueDeadline ? '⚠ PRAZO VENCIDO' : todayDeadline ? '⏰ Prazo vence hoje' : '📋 Próximo prazo'}
            </p>
            <p className="text-ink-300 text-xs mt-0.5">
              {urgentDeadline.title} — vence{' '}
              {format(new Date(urgentDeadline.deadlineEndsAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
      )}

      {/* Tabs nav */}
      <nav className="border-b border-ink-800">
        <ul className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <li key={t.id}>
                <Link
                  href={`/processos/${c.id}?tab=${t.id}`}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors ${
                    active
                      ? 'border-vara-500 text-vara-300 font-medium'
                      : 'border-transparent text-ink-400 hover:text-ink-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                  {t.id === 'movimentos' && c.movimentosCount > 0 && (
                    <span className="text-[10px] bg-ink-800 text-ink-400 rounded-full px-1.5 py-0.5">
                      {c.movimentosCount}
                    </span>
                  )}
                  {t.id === 'pecas' && c.pieceGenerations.length > 0 && (
                    <span className="text-[10px] bg-ink-800 text-ink-400 rounded-full px-1.5 py-0.5">
                      {c.pieceGenerations.length}
                    </span>
                  )}
                  {t.id === 'tarefas' && c.tasks.length > 0 && (
                    <span className="text-[10px] bg-ink-800 text-ink-400 rounded-full px-1.5 py-0.5">
                      {c.tasks.length}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Tab content */}
      <div>{renderTab(tab, c, { areaLabel, clientName, partyRoleLabel: (c.clientPartyRole && PARTY_ROLE_LABELS[c.clientPartyRole as keyof typeof PARTY_ROLE_LABELS]) || null })}</div>
    </div>
  );

  // Helper de render — implementação abaixo
}

function renderTab(
  tab: TabId,
  c: any,
  ctx: { areaLabel: string; clientName: string | null; partyRoleLabel: string | null },
) {
  switch (tab) {
    case 'resumo':
      return <ResumoTab c={c} ctx={ctx} />;
    case 'movimentos':
      return <MovimentosTab c={c} />;
    case 'partes':
      return <PartesTab c={c} ctx={ctx} />;
    case 'documentos':
      return <DocumentosTab c={c} ctx={ctx} />;
    case 'pecas':
      return <PecasTab c={c} />;
    case 'tarefas':
      return <TarefasTab c={c} />;
  }
}

function ResumoTab({ c, ctx }: { c: any; ctx: { areaLabel: string; clientName: string | null; partyRoleLabel: string | null } }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        {/* Card cliente + polo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-ink-100">Cliente & Polo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {ctx.clientName && (
              <InfoRow
                label={ctx.partyRoleLabel ?? 'Cliente vinculado'}
                value={ctx.clientName}
              />
            )}
            {c.opposingPartyName && (
              <InfoRow label="Parte contrária" value={c.opposingPartyName} />
            )}
          </CardContent>
        </Card>

        {/* Próximas tarefas */}
        {c.tasks.length > 0 && (
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-vara-400" />
                Próximas tarefas
              </CardTitle>
              <LinkButton href={`/processos/${c.id}?tab=tarefas`} size="sm" variant="ghost" className="text-xs">
                Ver todas <ChevronRight className="h-3 w-3" />
              </LinkButton>
            </CardHeader>
            <CardContent className="space-y-2">
              {c.tasks.slice(0, 5).map((t: any) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar — dados */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-ink-100">Dados do Processo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {c.cnjNumber && <InfoRow label="Número CNJ" value={c.cnjNumber} monospace />}
            {c.legalArea && <InfoRow label="Área" value={ctx.areaLabel} />}
            {c.procedureType && <InfoRow label="Procedimento" value={c.procedureType} />}
            {c.filingDate && (
              <InfoRow label="Data de distribuição" value={format(new Date(c.filingDate), 'dd/MM/yyyy', { locale: ptBR })} />
            )}
            {c.court && <InfoRow label="Tribunal" value={c.court} />}
            {c.courtUnit && <InfoRow label="Vara" value={c.courtUnit} />}
            {c.district && <InfoRow label="Comarca" value={c.district} />}
            {c.state && <InfoRow label="UF" value={c.state} />}
            {c.caseValueCents && (
              <InfoRow
                label="Valor da causa"
                value={`R$ ${(Number(c.caseValueCents) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
            )}
          </CardContent>
        </Card>

        {(c.opposingPartyName || c.opposingPartyCpf || c.opposingPartyCnpj) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-ink-400" />
                Parte Contrária
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {c.opposingPartyName && <InfoRow label="Nome" value={c.opposingPartyName} />}
              {c.opposingPartyCpf && <InfoRow label="CPF" value={c.opposingPartyCpf} monospace />}
              {c.opposingPartyCnpj && <InfoRow label="CNPJ" value={c.opposingPartyCnpj} monospace />}
              {c.opposingLawyerName && <InfoRow label="Advogado" value={c.opposingLawyerName} />}
              {c.opposingLawyerOab && <InfoRow label="OAB" value={c.opposingLawyerOab} monospace />}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-ink-400" />
              Status da sincronização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow
              label="Última sincronização"
              value={c.datajudSyncedAt ? format(new Date(c.datajudSyncedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Nunca'}
            />
            <InfoRow label="Movimentos" value={String(c.movimentosCount ?? c.movements.length)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MovimentosTab({ c }: { c: any }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-vara-400" />
          Andamentos ({c.movements.length})
        </CardTitle>
        {c.cnjNumber && (
          <span className="text-[10px] text-ink-500">
            Buscar mais: clique em <strong>Sincronizar DataJud</strong> no topo
          </span>
        )}
      </CardHeader>
      <CardContent>
        <AddMovementForm caseId={c.id} />
        <div className="mt-4 space-y-3">
          {c.movements.length === 0 ? (
            <p className="text-xs text-ink-500 text-center py-4">Nenhum andamento registrado.</p>
          ) : (
            c.movements.map((m: any) => (
              <div key={m.id} className="relative pl-6 border-l border-ink-800 pb-3 last:pb-0">
                <div className="absolute left-0 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-ink-600" />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-ink-100">{m.title}</p>
                    {m.code && <span className="text-[10px] font-mono text-ink-500">{m.code}</span>}
                    <p className="text-xs text-ink-500 mt-0.5">
                      {format(new Date(m.occurredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {m.source && ` · ${m.source}`}
                      {' · seq. '}{m.sequence}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {m.source === 'DATAJUD' && (
                      <span className="text-[10px] text-blue-400 bg-blue-950/40 px-1.5 py-0.5 rounded">
                        DataJud
                      </span>
                    )}
                    {m.isFatal && (
                      <Badge variant="danger" className="text-[10px]">Prazo</Badge>
                    )}
                    {m.deadlineDays && m.deadlineEndsAt && (
                      <span className={`text-[10px] ${isPast(new Date(m.deadlineEndsAt)) ? 'text-rede-400' : 'text-ink-500'}`}>
                        {format(new Date(m.deadlineEndsAt), 'dd/MM')}
                      </span>
                    )}
                  </div>
                </div>
                {m.description && (
                  <p className="text-xs text-ink-400 mt-1">{m.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PartesTab({ c, ctx }: { c: any; ctx: any }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
            <User className="h-4 w-4 text-vara-400" />
            Polo {ctx.partyRoleLabel ?? 'Cliente'}
          </CardTitle>
          <CardDescription>Cliente do escritório neste processo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {ctx.clientName ? (
            <>
              <InfoRow label="Nome" value={ctx.clientName} />
              {personAttr(c.client, 'cpf') && <InfoRow label="CPF" value={personAttr(c.client, 'cpf')!} monospace />}
              {personAttr(c.client, 'cnpj') && <InfoRow label="CNPJ" value={personAttr(c.client, 'cnpj')!} monospace />}
              {personAttr(c.client, 'email') && <InfoRow label="Email" value={personAttr(c.client, 'email')!} />}
              {personAttr(c.client, 'phone') && <InfoRow label="Telefone" value={personAttr(c.client, 'phone')!} />}
            </>
          ) : (
            <p className="text-xs text-ink-500">Sem cliente vinculado.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-ink-400" />
            Polo oposto
          </CardTitle>
          <CardDescription>Parte contrária e advogado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {c.opposingPartyName ? (
            <>
              <InfoRow label="Nome" value={c.opposingPartyName} />
              {c.opposingPartyCpf && <InfoRow label="CPF" value={c.opposingPartyCpf} monospace />}
              {c.opposingPartyCnpj && <InfoRow label="CNPJ" value={c.opposingPartyCnpj} monospace />}
              {c.opposingLawyerName && <InfoRow label="Advogado" value={c.opposingLawyerName} />}
              {c.opposingLawyerOab && <InfoRow label="OAB" value={c.opposingLawyerOab} monospace />}
            </>
          ) : (
            <p className="text-xs text-ink-500">Sem parte contrária cadastrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentosTab({ c, ctx }: { c: any; ctx: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-vara-400" />
          Documentos do Google Drive
        </CardTitle>
        <CardDescription>
          Pasta <code className="text-xs">Juris-Flow/Clientes/{ctx.clientName ?? '...'}/{c.cnjNumber ?? c.id}</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-ink-400">
          Os documentos anexados a este processo ficam no Google Drive conectado ao escritório.
          Use o botão <strong>Documentos</strong> no topo para abrir a pasta.
        </p>
        <DocumentsButton
          drivePath={c.cnjNumber ? `Clientes/${ctx.clientName?.replace(/[/\\]/g, ' ') ?? 'sem-cliente'}/${c.cnjNumber}` : `Clientes/${ctx.clientName?.replace(/[/\\]/g, ' ') ?? 'sem-cliente'}/${c.id}`}
          scopeLabel={c.cnjNumber ?? `Processo ${c.id.slice(0, 8)}`}
        />
      </CardContent>
    </Card>
  );
}

function PecasTab({ c }: { c: any }) {
  if (c.pieceGenerations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-10 w-10 text-ink-700 mx-auto mb-3" />
          <p className="text-sm text-ink-300 font-medium">Nenhuma peça vinculada</p>
          <p className="text-xs text-ink-500 mt-1">
            Peças geradas pelo chat IA ou diretamente em /pecas aparecem aqui quando você vincular este processo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
          <FileText className="h-4 w-4 text-vara-400" />
          Peças geradas ({c.pieceGenerations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {c.pieceGenerations.map((p: any) => (
          <Link
            key={p.id}
            href={`/pecas/${p.id}`}
            className="flex items-center gap-3 rounded-md border border-ink-800 px-3 py-2 text-sm hover:bg-ink-900 transition-colors"
          >
            <FileText className="h-4 w-4 text-vara-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-ink-200 truncate">{p.type.replaceAll('_', ' ')}</p>
              <p className="text-[10px] text-ink-500">
                {p.model.replace('CLAUDE_', '')} · {format(new Date(p.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <Badge
              variant={p.status === 'COMPLETED' ? 'success' : p.status === 'FAILED' ? 'danger' : 'default'}
              className="text-[10px]"
            >
              {p.status === 'COMPLETED' ? 'Concluída' : p.status === 'GENERATING' ? 'Gerando' : 'Falhou'}
            </Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function TarefasTab({ c }: { c: any }) {
  if (c.tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckSquare className="h-10 w-10 text-ink-700 mx-auto mb-3" />
          <p className="text-sm text-ink-300 font-medium">Nenhuma tarefa vinculada</p>
          <p className="text-xs text-ink-500 mt-1">
            Crie tarefas no Kanban com este processo selecionado para aparecerem aqui.
          </p>
          <LinkButton href={`/tarefas?caseId=${c.id}`} size="sm" className="mt-4">
            Ir para tarefas
          </LinkButton>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-vara-400" />
          Tarefas ({c.tasks.length})
        </CardTitle>
        <LinkButton href={`/tarefas?caseId=${c.id}`} size="sm" variant="outline">
          Ver no Kanban
        </LinkButton>
      </CardHeader>
      <CardContent className="space-y-2">
        {c.tasks.map((t: any) => (
          <TaskRow key={t.id} task={t} />
        ))}
      </CardContent>
    </Card>
  );
}

function personAttr(client: any, key: string): string | null {
  return client?.person?.[key] ?? null;
}

function InfoRow({ label, value, monospace }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-ink-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-ink-200 ${monospace ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}

async function TaskRow({ task }: { task: any }) {
  const priorityCfg = PRIORITY_CONFIG[task.priority] ?? { label: task.priority, variant: 'default' as const };
  const statusCfg = TASK_STATUS_CONFIG[task.status] ?? { label: task.status, variant: 'default' as const };
  const isOverdue = task.dueDate && task.status !== 'DONE' && isPast(new Date(task.dueDate));

  return (
    <div className="flex items-center gap-3 rounded-md border border-ink-800 px-3 py-2 text-sm">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-ink-600 bg-ink-900 text-vara-600 focus:ring-vara-600"
        defaultChecked={task.status === 'DONE'}
        onChange={async () => {
          'use server';
          await updateTaskAction(task.id, { status: task.status === 'DONE' ? 'TODO' : 'DONE' });
        }}
      />
      <span className={`flex-1 text-ink-200 ${task.status === 'DONE' ? 'line-through text-ink-500' : ''}`}>
        {task.title}
      </span>
      {task.dueDate && (
        <span className={`text-[10px] ${isOverdue ? 'text-rede-400' : 'text-ink-500'}`}>
          {format(new Date(task.dueDate), 'dd/MM')}
        </span>
      )}
      <Badge variant={priorityCfg.variant} className="text-[10px]">{priorityCfg.label}</Badge>
      <Badge variant={statusCfg.variant} className="text-[10px]">{statusCfg.label}</Badge>
    </div>
  );
}

function AddMovementForm({ caseId }: { caseId: string }) {
  return (
    <form action={async (formData) => {
      'use server';
      await addMovementAction(caseId, {
        title: formData.get('title') as string,
        description: formData.get('description') as string || undefined,
        occurredAt: formData.get('occurredAt') as string,
        code: formData.get('code') as string || undefined,
        isFatal: formData.get('isFatal') === 'on',
        deadlineDays: formData.get('deadlineDays') ? parseInt(formData.get('deadlineDays') as string) : undefined,
        deadlineKind: formData.get('deadlineKind') as 'UTEIS' | 'CORRIDOS' || undefined,
      });
    }} className="space-y-2">
      <div className="flex gap-2">
        <Input name="title" placeholder="Título do andamento (ex: Petição protocolada)" required className="flex-1" />
        <Input name="occurredAt" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} required className="w-44" />
      </div>
      <div className="flex gap-2">
        <Input name="description" placeholder="Descrição (opcional)" className="flex-1" />
        <Input name="code" placeholder="Código (ex: 2040100)" className="w-28" />
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-ink-400 cursor-pointer">
          <input type="checkbox" name="isFatal" className="rounded border-ink-600 bg-ink-900 text-rede-600" />
          Marca prazo
        </label>
        <Input name="deadlineDays" type="number" min="1" placeholder="Dias" className="w-20" />
        <select name="deadlineKind" className="rounded-md border border-ink-700 bg-ink-900 px-2 py-2 text-xs text-ink-200">
          <option value="CORRIDOS">Corridos</option>
          <option value="UTEIS">Úteis</option>
        </select>
        <Button type="submit" size="sm">Adicionar</Button>
      </div>
    </form>
  );
}
