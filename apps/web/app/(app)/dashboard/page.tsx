import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, LinkButton } from '@juris-flow/ui';
import {
  Briefcase,
  Users,
  CheckSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Quote,
  Gavel,
  Scale,
  Calendar,
  Lightbulb,
  FileText,
  UserCheck,
} from 'lucide-react';
import { format, isPast, isToday as isTodayFn, isTomorrow as isTomorrowFn, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getDailyQuote } from '@/lib/quotes';

export const metadata = { title: 'Início — Juris-Flow' };

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'muted' | 'default' }> = {
  ACTIVE: { label: 'Ativo', variant: 'success' },
  SUSPENDED: { label: 'Suspenso', variant: 'warning' },
  JUDGED: { label: 'Julgado', variant: 'default' },
  ARCHIVED: { label: 'Arquivado', variant: 'muted' },
  SETTLED: { label: 'Acordado', variant: 'default' },
  EXECUTED: { label: 'Executado', variant: 'default' },
  APPEALED: { label: 'Recursal', variant: 'warning' },
};

const TASK_STATUS_CONFIG: Record<string, { label: string; variant: 'muted' | 'default' | 'warning' | 'success' }> = {
  TODO: { label: 'A fazer', variant: 'muted' },
  DOING: { label: 'Em progresso', variant: 'default' },
  BLOCKED: { label: 'Bloqueada', variant: 'warning' },
  DONE: { label: 'Concluída', variant: 'success' },
  CANCELLED: { label: 'Cancelada', variant: 'muted' },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function deadlineLabel(deadline: Date) {
  const days = differenceInDays(deadline, new Date());
  if (days < 0) return `Vencido há ${Math.abs(days)} ${Math.abs(days) === 1 ? 'dia' : 'dias'}`;
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  return `Vence em ${days} dias`;
}

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user.name?.split(' ')[0] || session?.user.email?.split('@')[0] || 'Doutor(a)';
  const tenantId = session?.user?.tenantId;
  const quote = getDailyQuote();

  if (!tenantId) return null;

  // Carrega tudo em paralelo
  const [
    activeCases,
    recentLeads,
    pendingTasks,
    fatalDeadlines,
    upcomingDeadlines,
    overdueTasks,
    recentCases,
    recentClients,
    recentLeadsList,
    tribunalStats,
    justiceTypeStats,
    totalClients,
  ] = await Promise.all([
    prisma.case.count({ where: { tenantId, status: 'ACTIVE', deletedAt: null } }),
    prisma.lead.count({ where: { tenantId, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    prisma.task.count({ where: { tenantId, status: { in: ['TODO', 'DOING', 'BLOCKED'] }, deletedAt: null } }),
    prisma.caseMovement.count({ where: { tenantId, isFatal: true, deadlineEndsAt: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) } } }),
    prisma.caseMovement.findMany({
      where: {
        tenantId,
        isFatal: true,
        deadlineEndsAt: { gte: new Date(), lte: new Date(Date.now() + 30 * 86400000) },
      },
      orderBy: { deadlineEndsAt: 'asc' },
      take: 5,
      include: { /* via relation if needed */ },
    }),
    prisma.task.findMany({
      where: {
        tenantId,
        status: { in: ['TODO', 'DOING', 'BLOCKED'] },
        deletedAt: null,
        OR: [
          { dueDate: { lte: new Date(Date.now() + 86400000) } }, // vencendo hoje/amanhã
        ],
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    }),
    prisma.case.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.client.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { person: true },
    }),
    prisma.lead.findMany({
      where: { tenantId, deletedAt: null, status: { not: 'WON' } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, fullName: true, email: true, phone: true, status: true, legalArea: true },
    }),
    prisma.case.groupBy({
      by: ['court'],
      where: { tenantId, deletedAt: null, court: { not: null } },
      _count: { court: true },
      orderBy: { _count: { court: 'desc' } },
      take: 5,
    }) as unknown as { court: string; _count: { court: number } }[],
    prisma.case.groupBy({
      by: ['legalArea'],
      where: { tenantId, deletedAt: null },
      _count: { legalArea: true },
      orderBy: { _count: { legalArea: 'desc' } },
      take: 5,
    }) as unknown as { legalArea: string; _count: { legalArea: number } }[],
    prisma.client.count({ where: { tenantId, status: 'ACTIVE' } }),
  ]);

  // Busca as cases dos deadlines e recentCases para mostrar título + cliente
  const caseIdsForDeadlines = upcomingDeadlines.filter((d) => d.caseId).map((d) => d.caseId!);
  const deadlineCases = await prisma.case.findMany({
    where: { id: { in: caseIdsForDeadlines } },
    select: { id: true, title: true, cnjNumber: true },
  });
  const recentCaseIds = recentCases.map((c) => c.id);
  // recentClientsByCase: busca client+person separado (Prisma não suporta triplo nível de include)
  const recentClientRecords = await prisma.client.findMany({
    where: { id: { in: recentCases.map((c) => c.id).filter((id): id is string => id !== undefined) } },
    select: { id: true, personId: true },
  });
  // Também não pode ser — Client não tem Client.id == Case.id. Pega o client por personId do recentCases? Não — Case tem clientId direto.
  // Vou simplificar: mostrar só o título do processo no card de processos recentes (sem cliente)
  const recentCaseClientMap = new Map<string, { fullName: string | null; legalName: string | null }>();

  // Para mostrar cliente nos processos recentes, preciso buscar via caseId direto
  const recentCaseClientIds = recentCases
    .map((c) => c.clientId)
    .filter((id): id is string => id !== null);
  if (recentCaseClientIds.length > 0) {
    const clientsFromCases = await prisma.client.findMany({
      where: { id: { in: recentCaseClientIds } },
      select: { id: true, personId: true },
    });
    const personIds = clientsFromCases.map((c) => c.personId);
    const persons = personIds.length > 0
      ? await prisma.person.findMany({
          where: { id: { in: personIds } },
          select: { id: true, fullName: true, legalName: true },
        })
      : [];
    const personMap = new Map(persons.map((p) => [p.id, p]));
    const clientToPerson = new Map(clientsFromCases.map((c) => [c.id, personMap.get(c.personId)]));
    for (const c of recentCases) {
      if (c.clientId) {
        const person = clientToPerson.get(c.clientId);
        if (person) recentCaseClientMap.set(c.id, person);
      }
    }
  }
  const caseMap = new Map(deadlineCases.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      {/* Greeting + frase em destaque */}
      <header className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="vf-display-md text-3xl font-bold">
              {greeting()}, {firstName}.
            </h1>
            <p className="vf-caption mt-1 text-ink-400">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              {' · '}
              {totalClients} cliente{totalClients !== 1 ? 's' : ''} ativo
              {totalClients !== 1 ? 's' : ''} no escritório
            </p>
          </div>
        </div>

        {/* Frase do dia — destaque horizontal */}
        <div className="relative overflow-hidden rounded-lg border border-vara-700/40 bg-gradient-to-br from-vara-950/40 via-ink-900/40 to-ink-900/40 px-5 py-4">
          <Quote className="absolute -top-2 -left-2 h-16 w-16 text-vara-700/20" />
          <div className="relative flex items-start gap-3">
            <Quote className="h-5 w-5 text-vara-400 mt-1 shrink-0" />
            <div className="flex-1">
              <p className="text-base italic text-ink-100 leading-snug">"{quote.quote}"</p>
              <p className="text-xs text-vara-300 mt-1.5 font-medium">— {quote.author}</p>
            </div>
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider text-ink-500 shrink-0 mt-1">
              Frase do dia
            </span>
          </div>
        </div>
      </header>

      {/* KPIs horizontais — grandes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BigKpi
          icon={<Briefcase />}
          label="Processos ativos"
          value={activeCases}
          color="vara"
        />
        <BigKpi
          icon={<CheckSquare />}
          label="Tarefas pendentes"
          value={pendingTasks}
          color="prazo"
        />
        <BigKpi
          icon={<Clock />}
          label="Prazos fatais (7d)"
          value={fatalDeadlines}
          color="urgente"
          highlight={fatalDeadlines > 0}
        />
        <BigKpi
          icon={<TrendingUp />}
          label="Leads novos (7d)"
          value={recentLeads}
          color="ciente"
        />
      </div>

      {/* Bloco principal: prazos urgentes + tarefas vencendo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos prazos */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
              <Gavel className="h-4 w-4 text-prazo-400" />
              Próximos prazos fatais
            </CardTitle>
            <Badge variant="warning" className="text-[10px]">{fatalDeadlines}</Badge>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <EmptyHint
                icon={<Lightbulb className="h-4 w-4" />}
                title="Sem prazos no horizonte"
                hint="Prazos fatais aparecem aqui automaticamente quando você adiciona movimentações"
              />
            ) : (
              <ul className="space-y-2">
                {upcomingDeadlines.map((d) => {
                  const c = d.caseId ? caseMap.get(d.caseId) : null;
                  const deadline = new Date(d.deadlineEndsAt!);
                  const isOverdue = isPast(deadline);
                  const isToday = isTodayFn(deadline);
                  const isTomorrow = isTomorrowFn(deadline);
                  return (
                    <Link
                      key={d.id}
                      href={c ? `/processos/${c.id}` : '#'}
                      className={`flex items-start gap-3 rounded-md border p-3 hover:border-ink-600 transition-colors ${
                        isOverdue ? 'border-rede-700 bg-rede-950/20' :
                        isToday ? 'border-prazo-700 bg-prazo-950/20' :
                        isTomorrow ? 'border-prazo-700/50 bg-prazo-950/10' :
                        'border-ink-800'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-100 truncate">{d.title}</p>
                        <p className="text-xs text-ink-500 mt-0.5 truncate">
                          {c?.title ?? 'Processo desconhecido'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-[10px] font-medium ${
                          isOverdue ? 'text-rede-400' : isToday ? 'text-prazo-300' : 'text-ink-400'
                        }`}>
                          {deadlineLabel(deadline)}
                        </p>
                        <p className="text-[10px] text-ink-500 mt-0.5">
                          {format(deadline, "dd 'de' MMM", { locale: ptBR })}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Tarefas vencendo */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-prazo-400" />
              Tarefas próximas do prazo
            </CardTitle>
            <LinkButton href="/tarefas" size="sm" variant="ghost" className="text-[10px]">
              Ver todas <ArrowRight className="h-3 w-3" />
            </LinkButton>
          </CardHeader>
          <CardContent>
            {overdueTasks.length === 0 ? (
              <EmptyHint
                icon={<Lightbulb className="h-4 w-4" />}
                title="Sem tarefas urgentes"
                hint="Tarefas com prazo nas próximas 24h aparecem aqui"
              />
            ) : (
              <ul className="space-y-2">
                {overdueTasks.map((t) => {
                  const statusCfg = TASK_STATUS_CONFIG[t.status] ?? { label: t.status, variant: 'muted' as const };
                  const dueDate = t.dueDate ? new Date(t.dueDate) : null;
                  const isOverdue = dueDate && isPast(dueDate);
                  return (
                    <li key={t.id} className="flex items-start gap-3 rounded-md border border-ink-800 p-3 hover:border-ink-600 transition-colors">
                      <input
                        type="checkbox"
                        disabled
                        className="mt-1 h-4 w-4 rounded border-ink-600 bg-ink-900 text-vara-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isOverdue ? 'text-rede-300' : 'text-ink-100'}`}>{t.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={statusCfg.variant} className="text-[10px]">{statusCfg.label}</Badge>
                          {dueDate && (
                            <span className={`text-[10px] ${isOverdue ? 'text-rede-400 font-medium' : 'text-ink-500'}`}>
                              <Calendar className="inline h-3 w-3 mr-0.5" />
                              {format(dueDate, "dd 'de' MMM", { locale: ptBR })}
                              {isOverdue && ' ⚠'}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos analíticos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TribunalChart stats={tribunalStats} total={activeCases} />
        <JusticeTypeChart stats={justiceTypeStats} total={activeCases} />
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction href="/clients/new" icon={<UserCheck />} label="Novo cliente" hint="PF ou PJ com auto-fill de CNPJ/CEP" />
        <QuickAction href="/pecas/nova" icon={<FileText />} label="Gerar peça" hint="Petição, contestação ou recurso" />
        <QuickAction href="/processos" icon={<Briefcase />} label="Ver processos" hint={`${activeCases} ativo${activeCases !== 1 ? 's' : ''}`} />
        <QuickAction href="/leads" icon={<TrendingUp />} label="Pipeline de leads" hint={`${recentLeads} novo${recentLeads !== 1 ? 's' : ''} (7d)`} />
      </div>

      {/* Listas secundárias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Processos recentes</CardTitle>
              <CardDescription>Últimas atualizações da carteira</CardDescription>
            </div>
            <LinkButton href="/processos" size="sm" variant="ghost">Ver todos <ArrowRight className="h-4 w-4" /></LinkButton>
          </CardHeader>
          <CardContent>
            {recentCases.length === 0 ? (
              <EmptyHint title="Nenhum processo ainda" hint="Cadastre seu primeiro caso" />
            ) : (
              <ul className="space-y-2">
                {recentCases.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 rounded-md border border-ink-800 p-3 hover:border-ink-700">
                    <div className="flex-1 min-w-0">
                      <Link href={`/processos/${c.id}`} className="text-sm font-medium text-ink-50 hover:text-vara-300 truncate block">
                        {c.title}
                      </Link>
                      <p className="text-xs text-ink-500 mt-0.5">
                        {(() => {
                          const p = recentCaseClientMap.get(c.id);
                          return p?.fullName ?? p?.legalName ?? 'sem cliente';
                        })()}
                      </p>
                    </div>
                    <Badge variant={STATUS_CONFIG[c.status]?.variant ?? 'default'} className="text-[10px]">
                      {STATUS_CONFIG[c.status]?.label ?? c.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Clientes recentes</CardTitle>
              <CardDescription>Últimos cadastros</CardDescription>
            </div>
            <LinkButton href="/clients" size="sm" variant="ghost">Ver todos <ArrowRight className="h-4 w-4" /></LinkButton>
          </CardHeader>
          <CardContent>
            {recentClients.length === 0 ? (
              <EmptyHint title="Sem clientes" hint="Cadastre seu primeiro cliente" />
            ) : (
              <ul className="space-y-2">
                {recentClients.map((cl) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const p = cl.person as { fullName?: string | null; legalName?: string | null; email?: string | null; kind?: string };
                  const personName = p?.fullName ?? p?.legalName ?? '?';
                  return (
                    <li key={cl.id} className="flex items-center gap-3 rounded-md border border-ink-800 p-3 hover:border-ink-700">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vara-900 text-vara-300 text-xs font-semibold">
                        {(personName[0] ?? '?').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/clients/${cl.id}`} className="text-sm font-medium text-ink-50 hover:text-vara-300 truncate block">
                          {personName}
                        </Link>
                        <p className="text-xs text-ink-500">{p?.email ?? '—'}</p>
                      </div>
                      <Badge variant="muted" className="text-[10px] shrink-0">{p?.kind ?? '—'}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leads */}
      {recentLeadsList.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-vara-400" />
                Leads recentes
              </CardTitle>
              <CardDescription>Últimos leads capturados</CardDescription>
            </div>
            <LinkButton href="/leads" size="sm" variant="ghost">Ver pipeline <ArrowRight className="h-4 w-4" /></LinkButton>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {recentLeadsList.map((l) => (
                <li key={l.id}>
                  <Link href={`/leads/${l.id}`} className="flex items-center justify-between gap-3 rounded-md border border-ink-800 p-3 hover:border-ink-700">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-100 truncate">{l.fullName}</p>
                      <p className="text-xs text-ink-500 mt-0.5">{l.email ?? l.phone ?? 'sem contato'}</p>
                    </div>
                    <Badge variant="muted" className="text-[10px]">{l.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BigKpi({
  icon, label, value, color, highlight,
}: { icon: React.ReactNode; label: string; value: number; color: 'vara' | 'prazo' | 'urgente' | 'ciente'; highlight?: boolean }) {
  const colorClass: Record<typeof color, string> = {
    vara: 'text-vara-400 bg-vara-950/40 border-vara-700/30',
    prazo: 'text-ciente-400 bg-ciente-950/40 border-ciente-700/30',
    urgente: 'text-rede-300 bg-rede-950/40 border-rede-700/30',
    ciente: 'text-improcede-400 bg-improcede-950/40 border-improcede-700/30',
  } as const;
  return (
    <div className={`rounded-lg border p-4 ${highlight ? colorClass[color] : 'border-ink-800 bg-ink-900/30'}`}>
      <div className="flex items-center justify-between">
        <div className={`rounded-md p-2 ${highlight ? colorClass[color].split(' ').slice(1, 3).join(' ') : 'bg-ink-800'}`}>
          {icon}
        </div>
        {highlight && value > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rede-600 text-[10px] font-bold text-white animate-pulse">
            !
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-3xl font-bold text-ink-50">{value}</div>
        <div className="text-xs text-ink-400 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label, hint }: { href: string; icon: React.ReactNode; label: string; hint?: string }) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-ink-800 bg-gradient-to-br from-ink-900/60 to-ink-900/30 p-4 hover:border-vara-600 hover:from-vara-950/30 hover:to-ink-900/40 transition-all flex flex-col items-start gap-2.5"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-vara-950/50 text-vara-300 group-hover:bg-vara-900 group-hover:text-vara-200 transition-colors">
          {icon}
        </div>
        <ArrowRight className="h-4 w-4 text-ink-500 group-hover:text-vara-400 transition-colors" />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink-100">{label}</p>
        {hint && <p className="text-[11px] text-ink-500 mt-0.5">{hint}</p>}
      </div>
    </Link>
  );
}

function EmptyHint({ icon, title, hint }: { icon?: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      {icon && <div className="mb-2 text-ink-600">{icon}</div>}
      <p className="text-sm text-ink-400">{title}</p>
      <p className="text-xs text-ink-600 mt-1 max-w-xs">{hint}</p>
    </div>
  );
}

function TribunalChart({ stats, total }: { stats: { court: string; _count: { court: number } }[]; total: number }) {
  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
            <Scale className="h-4 w-4 text-ciente-400" />
            Distribuição por Tribunal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyHint title="Sem dados" hint="Cadastre processos para ver a distribuição" />
        </CardContent>
      </Card>
    );
  }
  const max = Math.max(...stats.map((s) => s._count.court));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
          <Scale className="h-4 w-4 text-ciente-400" />
          Distribuição por Tribunal
        </CardTitle>
        <CardDescription>Top {stats.length} tribunais da carteira</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {stats.map((s) => {
            const pct = (s._count.court / Math.max(max, 1)) * 100;
            const sharePct = total > 0 ? Math.round((s._count.court / total) * 100) : 0;
            return (
              <div key={s.court}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-ink-200 font-mono">{s.court}</span>
                  <span className="text-ink-500">{s._count.court} ({sharePct}%)</span>
                </div>
                <div className="h-1.5 bg-ink-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-vara-600 to-vara-400 rounded"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function JusticeTypeChart({ stats, total }: { stats: { legalArea: string; _count: { legalArea: number } }[]; total: number }) {
  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
            <Gavel className="h-4 w-4 text-prazo-400" />
            Distribuição por Área
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyHint title="Sem dados" hint="Adicione processos com área jurídica" />
        </CardContent>
      </Card>
    );
  }
  const AREA_LABEL: Record<string, string> = {
    CIVEL: 'Cível', TRABALHISTA: 'Trabalhista', CRIMINAL: 'Criminal', FAMILIA: 'Família',
    TRIBUTARIO: 'Tributário', PREVIDENCIARIO: 'Previdenciário', EMPRESARIAL: 'Empresarial',
    CONSUMIDOR: 'Consumidor', ADMINISTRATIVO: 'Administrativo', IMOBILIARIO: 'Imobiliário',
    OUTRO: 'Outro',
  };
  const totalCount = stats.reduce((sum, s) => sum + s._count.legalArea, 0);
  // Cores em gradiente pra cada área (cores diferentes por posição)
  const colorPalette = ['from-vara-500 to-vara-300', 'from-ciente-500 to-ciente-300', 'from-improcede-500 to-improcede-300', 'from-prazo-500 to-prazo-300', 'from-ink-500 to-ink-300'];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
          <Gavel className="h-4 w-4 text-prazo-400" />
          Distribuição por Área
        </CardTitle>
        <CardDescription>{totalCount} processos distribuídos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-stretch h-4 rounded overflow-hidden bg-ink-800 mb-3">
          {stats.map((s, idx) => {
            const pct = (s._count.legalArea / totalCount) * 100;
            const colors = colorPalette[idx % colorPalette.length];
            return (
              <div
                key={s.legalArea}
                className={`bg-gradient-to-r ${colors} transition-all`}
                style={{ width: `${pct}%` }}
                title={`${AREA_LABEL[s.legalArea] ?? s.legalArea}: ${s._count.legalArea}`}
              />
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          {stats.map((s, idx) => {
            const pct = totalCount > 0 ? Math.round((s._count.legalArea / totalCount) * 100) : 0;
            const colors = colorPalette[idx % colorPalette.length];
            return (
              <div key={s.legalArea} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded bg-gradient-to-br ${colors}`} />
                <span className="text-ink-300 truncate">{AREA_LABEL[s.legalArea] ?? s.legalArea}</span>
                <span className="text-ink-500 ml-auto">{pct}%</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}