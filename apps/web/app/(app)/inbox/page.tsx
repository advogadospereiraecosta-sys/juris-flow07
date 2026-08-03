import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Bell, ScrollText, Search, Plus, Filter, ExternalLink, ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import { differenceInDays, format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NewPublicationModal } from '@/components/publications/new-publication-modal';
import { PublicationCard } from '@/components/publications/publication-card';
import { MonitorManager } from '@/components/publications/monitor-manager';
import { RegrasManager } from '@/components/publications/rules-manager';

export const metadata = { title: 'Publicações — Juris-Flow' };

type TabId = 'publicacoes' | 'monitoramento' | 'regras';

const TABS: { id: TabId; label: string; icon: typeof Bell }[] = [
  { id: 'publicacoes', label: 'Publicações', icon: Bell },
  { id: 'monitoramento', label: 'Monitoramento de OAB', icon: ScrollText },
  { id: 'regras', label: 'Regras Automáticas', icon: Filter },
];

const PERIODS = [
  { value: 'HOJE', label: 'Hoje' },
  { value: 'SEMANA', label: 'Esta semana' },
  { value: 'MES', label: 'Este mês' },
  { value: 'TODAS', label: 'Todas' },
] as const;

type SearchParams = {
  tab?: string;
  status?: string;
  period?: string;
  q?: string;
};

export default async function InboxPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const userId = session?.user?.id;
  if (!tenantId) redirect('/login');

  const tab: TabId = (TABS.some((t) => t.id === searchParams.tab) ? searchParams.tab : 'publicacoes') as TabId;
  const period: 'HOJE' | 'SEMANA' | 'MES' | 'TODAS' = (
    PERIODS.some((p) => p.value === searchParams.period) ? searchParams.period : 'MES'
  ) as 'HOJE' | 'SEMANA' | 'MES' | 'TODAS';
  const search = (searchParams.q ?? '').trim();
  const statusFilter = searchParams.status ?? 'all';

  // Carrega publicações + monitors + settings + stats em paralelo
  const [publications, monitorCount, monitorLimit, counts, monitors, settings] = await Promise.all([
    loadPublications(tenantId, { period, search, status: statusFilter }),
    prisma.monitor.count({ where: { tenantId, active: true } }),
    getMonitorLimit(tenantId),
    loadCounts(tenantId),
    prisma.monitor.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        kind: true,
        value: true,
        court: true,
        active: true,
        createdAt: true,
      },
    }),
    prisma.tenantSetting.upsert({
      where: { tenantId },
      create: { tenantId },
      update: {},
    }),
  ]);

  // Publicações com prazo fatal próximo
  const upcomingDeadlines = publications
    .filter((p) => p.deadlineAt && !isPast(new Date(p.deadlineAt)))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="vf-display-md text-2xl font-bold text-ink-50 flex items-center gap-2">
            <Bell className="h-6 w-6 text-vara-400" />
            Publicações
          </h1>
          <p className="vf-caption text-ink-400 mt-1">
            Como calcular prazos? O sistema usa a regra do Salto Triplo (Lei 14.195/2021): publicação → início no primeiro dia útil → conta N dias úteis, excluindo feriados e recesso forense.
          </p>
        </div>
      </div>

      {/* Cards de prazos fatais próximos */}
      {upcomingDeadlines.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-ink-200 flex items-center gap-2">
            <Clock className="h-4 w-4 text-prazo-400" />
            Prazos Fatais Próximos
          </h2>
          <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-5">
            {upcomingDeadlines.map((p) => {
              const days = differenceInDays(new Date(p.deadlineAt!), new Date());
              const isHoje = isToday(new Date(p.deadlineAt!));
              const isVencido = isPast(new Date(p.deadlineAt!));
              return (
                <div
                  key={p.id}
                  className={`rounded-md border px-3 py-2 ${
                    isVencido || isHoje
                      ? 'border-rede-700 bg-rede-950/40'
                      : 'border-prazo-700/40 bg-prazo-950/20'
                  }`}
                >
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-400">
                    {isHoje ? '⚠ Vence hoje' : days === 1 ? '1 dia restante' : `${days} dias restantes`}
                  </div>
                  <p className="text-xs text-ink-200 mt-1 font-mono truncate">
                    {p.cnj ?? p.partyNames[0]?.slice(0, 20) ?? 'Sem CNJ'}
                  </p>
                  <p className="text-[10px] text-ink-500 mt-0.5">
                    {format(new Date(p.deadlineAt!), 'dd/MM', { locale: ptBR })} •{' '}
                    {(p.deadlineDays ?? 0)}d
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Distribuição automática em tarefas — info */}
      {publications.length > 0 && (
        <div className="text-xs text-ink-400">
          De {publications.length} publicaç{publications.length === 1 ? 'ão' : 'ões'},{' '}
          <span className="text-vara-300 font-medium">{counts.liked}</span> viraram tarefa.
          As demais precisam de intervenção manual.
        </div>
      )}

      {/* Tabs */}
      <nav className="border-b border-ink-800">
        <ul className="flex items-center gap-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <li key={t.id}>
                <Link
                  href={`/inbox?tab=${t.id}${active ? '' : `&period=${period}&q=${search}&status=${statusFilter}`}`}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors ${
                    active
                      ? 'border-vara-500 text-vara-300 font-medium'
                      : 'border-transparent text-ink-400 hover:text-ink-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                  {t.id === 'monitoramento' && (
                    <span className="text-[10px] bg-ink-800 text-ink-400 rounded-full px-1.5 py-0.5">
                      {monitorCount}/{monitorLimit}
                    </span>
                  )}
                  {t.id === 'publicacoes' && counts.unlinked > 0 && (
                    <span className="text-[10px] bg-prazo-900 text-prazo-200 rounded-full px-1.5 py-0.5">
                      {counts.unlinked}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Conteúdo por tab */}
      {tab === 'publicacoes' && (
        <PublicacoesTab
          publications={publications}
          period={period}
          search={search}
          statusFilter={statusFilter}
        />
      )}
      {tab === 'monitoramento' && (
        <MonitorManager
          initialMonitors={monitors.map((m) => ({
            id: m.id,
            kind: m.kind as 'OAB' | 'CNPJ' | 'PARTY_NAME',
            value: m.value,
            court: m.court,
            active: m.active,
            createdAt: m.createdAt,
          }))}
          limit={monitorLimit}
        />
      )}
      {tab === 'regras' && <RegrasManager initialSettings={{
        autoAssignToResponsible: settings.autoAssignToResponsible,
        notifyOnNewPublication: settings.notifyOnNewPublication,
        emailDigestFrequency: settings.emailDigestFrequency as 'NEVER' | 'DAILY' | 'WEEKLY',
      }} />}
    </div>
  );
}

function PublicacoesTab({
  publications,
  period,
  search,
  statusFilter,
}: {
  publications: any[];
  period: 'HOJE' | 'SEMANA' | 'MES' | 'TODAS';
  search: string;
  statusFilter: string;
}) {
  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <form method="get" className="flex-1 min-w-[200px] flex gap-2">
          <input type="hidden" name="tab" value="publicacoes" />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input
              name="q"
              defaultValue={search}
              placeholder="Buscar por nome, processo, OAB, CNJ..."
              className="w-full rounded-md border border-ink-700 bg-ink-900 pl-9 pr-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none"
            />
          </div>
        </form>

        <form method="get" className="flex gap-2">
          <input type="hidden" name="tab" value="publicacoes" />
          <input type="hidden" name="q" value={search} />
          <select
            name="status"
            defaultValue={statusFilter}
            className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-200"
          >
            <option value="all">Todos status</option>
            <option value="NEW">Nova</option>
            <option value="LINKED">Vinculada</option>
            <option value="CREATED">Caso criado</option>
            <option value="IGNORED">Ignorada</option>
          </select>
          <button type="submit" className="rounded-md border border-ink-700 bg-ink-800 px-3 py-2 text-sm text-ink-200 hover:bg-ink-700">
            Filtrar
          </button>
        </form>

        <form method="get" className="flex gap-1 rounded-md border border-ink-700 bg-ink-900 p-1">
          <input type="hidden" name="tab" value="publicacoes" />
          <input type="hidden" name="q" value={search} />
          <input type="hidden" name="status" value={statusFilter} />
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="submit"
              name="period"
              value={p.value}
              className={`px-2 py-1 rounded text-xs ${
                period === p.value
                  ? 'bg-vara-700 text-ink-50'
                  : 'text-ink-400 hover:text-ink-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </form>

        <NewPublicationModal />
      </div>

      {/* Lista */}
      {publications.length === 0 ? (
        <div className="rounded-lg border border-ink-800 bg-ink-900/30 py-16 text-center">
          <Bell className="h-10 w-10 text-ink-700 mx-auto mb-3" />
          <p className="text-sm text-ink-300 font-medium">Nenhuma publicação ainda</p>
          <p className="text-xs text-ink-500 mt-1 max-w-md mx-auto">
            Clique em <strong>Nova publicação</strong> para colar texto do diário oficial.
            O sistema detecta automaticamente CNJ, OAB, partes e calcula o prazo fatal.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {publications.map((p) => (
            <PublicationCard key={p.id} publication={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function MonitoramentoTab({
  monitorLimit,
  userId,
}: {
  monitorLimit: number;
  userId: string | undefined;
}) {
  // Stub removido — substituído por <MonitorManager />
  return null;
}

function RegrasTab() {
  // Stub removido — substituído por <RegrasManager />
  return null;
}

// Carrega publicações com filtros
async function loadPublications(tenantId: string, filters: { period: 'HOJE' | 'SEMANA' | 'MES' | 'TODAS'; search: string; status: string }) {
  const where: any = { tenantId };

  if (filters.status !== 'all') where.status = filters.status;

  const now = new Date();
  if (filters.period === 'HOJE') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    where.publishedAt = { gte: start };
  } else if (filters.period === 'SEMANA') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    where.publishedAt = { gte: start };
  } else if (filters.period === 'MES') {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    where.publishedAt = { gte: start };
  }

  if (filters.search) {
    const cleanSearch = filters.search.replace(/\D/g, '');
    where.OR = [
      { partyNames: { has: filters.search } },
      ...(cleanSearch.length >= 11 ? [{ cnj: { contains: cleanSearch } }] : []),
      ...(cleanSearch.length > 0 ? [{ oab: { contains: cleanSearch } }] : []),
      { rawText: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return prisma.publication.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      rawText: true,
      source: true,
      diary: true,
      court: true,
      publishedAt: true,
      oab: true,
      oabState: true,
      partyNames: true,
      cnj: true,
      status: true,
      deadlineAt: true,
      deadlineDays: true,
      caseId: true,
      taskId: true,
      createdAt: true,
      case: { select: { id: true, title: true } },
    },
  });
}

async function loadCounts(tenantId: string) {
  const [liked, unlinked] = await Promise.all([
    prisma.publication.count({ where: { tenantId, status: { in: ['LINKED', 'CREATED'] } } }),
    prisma.publication.count({ where: { tenantId, status: 'NEW' } }),
  ]);
  return { liked, unlinked };
}

async function getMonitorLimit(tenantId: string): Promise<number> {
  // Plano Free: 1, Pro: 10, Elite: 50
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  if (tenant?.plan === 'ELITE') return 50;
  if (tenant?.plan === 'PRO') return 10;
  return 1;
}
