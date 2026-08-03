import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { Card, CardContent, Badge, LinkButton, Input } from '@juris-flow/ui';
import { Search, Plus, Gavel, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const metadata = { title: 'Processos — Juris-Flow' };

type SearchParams = {
  q?: string;
  status?: string;
  legalArea?: string;
  page?: string;
};

const LEGAL_AREA_LABELS: Record<string, string> = {
  CIVEL: 'Cível',
  TRABALHISTA: 'Trabalhista',
  CRIMINAL: 'Criminal',
  FAMILIA: 'Família',
  TRIBUTARIO: 'Tributário',
  PREVIDENCIARIO: 'Previdenciário',
  EMPRESARIAL: 'Empresarial',
  CONSUMIDOR: 'Consumidor',
  ADMINISTRATIVO: 'Administrativo',
  IMOBILIARIO: 'Imobiliário',
  OUTRO: 'Outro',
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

export default async function ProcessosPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const tenantId = session?.user.tenantId;
  const PAGE_SIZE = 20;
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const q = (searchParams.q ?? '').trim();
  const status = searchParams.status ?? '';
  const legalArea = searchParams.legalArea ?? '';

  const where = tenantId
    ? {
        tenantId,
        deletedAt: null,
        ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' as const } }, { cnjNumber: { contains: q } }, { opposingPartyName: { contains: q, mode: 'insensitive' as const } }] } : {}),
        ...(status ? { status: status as 'ACTIVE' | 'SUSPENDED' | 'JUDGED' | 'ARCHIVED' | 'SETTLED' | 'EXECUTED' | 'APPEALED' } : {}),
        ...(legalArea ? { legalArea: legalArea as 'CIVEL' | 'TRABALHISTA' | 'CRIMINAL' | 'FAMILIA' | 'TRIBUTARIO' | 'PREVIDENCIARIO' | 'EMPRESARIAL' | 'CONSUMIDOR' | 'ADMINISTRATIVO' | 'IMOBILIARIO' | 'OUTRO' } : {}),
      }
    : ({ id: 'impossible' } as never);

  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { client: true },
    }),
    prisma.case.count({ where }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = cases;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="vf-display-md text-2xl font-bold text-ink-50">Processos</h1>
          <p className="vf-caption text-ink-400 mt-0.5">
            {total} processo{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
          </p>
        </div>
        <LinkButton href="/processos/new" size="sm" rightIcon={<Plus className="h-4 w-4" />}>
          Novo processo
        </LinkButton>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <form className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              <Input name="q" defaultValue={q} placeholder="Buscar por título, número CNJ, parte contrária..." className="pl-9" />
            </div>
            <select
              name="status"
              defaultValue={status}
              className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-200 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select
              name="legalArea"
              defaultValue={legalArea}
              className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-200 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
            >
              <option value="">Todas as áreas</option>
              {Object.entries(LEGAL_AREA_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button type="submit" className="rounded-md bg-vara-700 px-4 py-2 text-sm font-medium text-ink-50 hover:bg-vara-600">
              Filtrar
            </button>
            {(q || status || legalArea) && (
              <Link href="/processos" className="flex items-center px-3 py-2 text-sm text-ink-400 hover:text-ink-200">
                Limpar
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Lista */}
      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Gavel className="h-12 w-12 text-ink-700 mb-4" />
            <p className="text-ink-400 font-medium">Nenhum processo encontrado</p>
            <p className="text-ink-500 text-sm mt-1">
              {q ? `Nenhum resultado para "${q}"` : 'Cadastre seu primeiro processo'}
            </p>
            <LinkButton href="/processos/new" size="sm" variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-1" /> Novo processo
            </LinkButton>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((c) => {
            const statusCfg = STATUS_CONFIG[c.status] ?? { label: c.status, variant: 'default' as const };
            const client = c.client as { person: { fullName?: string | null; legalName?: string | null } } | null;
            const clientName = client?.person?.fullName ?? client?.person?.legalName ?? null;
            const areaLabel = LEGAL_AREA_LABELS[c.legalArea] ?? c.legalArea;

            return (
              <Link key={c.id} href={`/processos/${c.id}`} className="block">
                <Card className="hover:border-ink-600 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-ink-50 truncate">{c.title}</h3>
                          {c.cnjNumber && (
                            <span className="text-[10px] font-mono text-ink-500 bg-ink-800 px-1.5 py-0.5 rounded shrink-0">
                              {c.cnjNumber}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
                          {clientName && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium text-ink-300">{clientName}</span>
                            </span>
                          )}
                          {c.court && (
                            <span>{c.court}{c.courtUnit ? ` · ${c.courtUnit}` : ''}{c.district ? ` · ${c.district}` : ''}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Gavel className="h-3 w-3" />
                            {areaLabel}
                          </span>
                          {c.filingDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(c.filingDate), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge variant={statusCfg.variant} className="text-[10px]">{statusCfg.label}</Badge>
                        {c.tags?.length > 0 && (
                          <div className="flex gap-1">
                            {c.tags.slice(0, 2).map((t: string) => (
                              <span key={t} className="text-[10px] bg-ink-800 text-ink-400 px-1.5 py-0.5 rounded">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-ink-400">
          <p>Página {page} de {totalPages} · {total} resultados</p>
          <div className="flex gap-2">
            {page > 1 && (
              <LinkButton
                href={`/processos?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...(legalArea ? { legalArea } : {}), page: String(page - 1) }).toString()}`}
                size="sm" variant="outline"
              >
                Anterior
              </LinkButton>
            )}
            {page < totalPages && (
              <LinkButton
                href={`/processos?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...(legalArea ? { legalArea } : {}), page: String(page + 1) }).toString()}`}
                size="sm" variant="outline"
              >
                Próxima
              </LinkButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
