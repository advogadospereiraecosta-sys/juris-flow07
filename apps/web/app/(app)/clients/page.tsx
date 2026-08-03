import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { Card, CardContent, Badge, LinkButton, Input } from '@juris-flow/ui';
import { Users, Plus, Search, User, Building2, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const metadata = { title: 'Clientes — Juris-Flow' };

type SearchParams = { q?: string; status?: string; page?: string };

export default async function ClientsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const tenantId = session?.user.tenantId;
  const PAGE_SIZE = 20;
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const q = (searchParams.q ?? '').trim();
  const status = searchParams.status ?? '';

  const whereClause = tenantId
    ? {
        tenantId,
        ...(status ? { status: status as 'ACTIVE' | 'INACTIVE' | 'FORMER' } : {}),
      }
    : ({ id: 'impossible' } as never);

  // Build search separately to avoid type explosion
  const searchOr = q
    ? [
        { person: { fullName: { contains: q, mode: 'insensitive' } } },
        { person: { legalName: { contains: q, mode: 'insensitive' } } },
        { person: { email: { contains: q, mode: 'insensitive' } } },
        { person: { cpf: { contains: q } } },
        { person: { cnpj: { contains: q } } },
      ] as const
    : undefined;

  const whereFull = searchOr ? { ...whereClause, OR: searchOr } : whereClause;

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where: whereFull as Parameters<typeof prisma.client.findMany>[0] extends { where?: infer W } ? W : never,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { person: true },
    }),
    prisma.client.count({ where: whereClause }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = clients;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="vf-display-md text-2xl font-bold text-ink-50">Clientes</h1>
          <p className="vf-caption text-ink-400 mt-0.5">
            {total} cliente{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}
          </p>
        </div>
        <LinkButton href="/clients/new" size="sm" rightIcon={<Plus className="h-4 w-4" />}>
          Novo cliente
        </LinkButton>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <form className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              <Input name="q" defaultValue={q} placeholder="Buscar por nome, CPF/CNPJ, e-mail..." className="pl-9" />
            </div>
            <select
              name="status"
              defaultValue={status}
              className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-200 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
            >
              <option value="">Todos os status</option>
              <option value="ACTIVE">Ativos</option>
              <option value="INACTIVE">Inativos</option>
              <option value="FORMER">Ex-clientes</option>
            </select>
            <button
              type="submit"
              className="rounded-md bg-vara-700 px-4 py-2 text-sm font-medium text-ink-50 transition-colors hover:bg-vara-600"
            >
              Filtrar
            </button>
            {q || status ? (
              <Link href="/clients" className="flex items-center px-3 py-2 text-sm text-ink-400 hover:text-ink-200">
                Limpar
              </Link>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="h-12 w-12 text-ink-700 mb-4" />
              <p className="text-ink-400 font-medium">Nenhum cliente encontrado</p>
              <p className="text-ink-500 text-sm mt-1">
                {q ? `Nenhum resultado para "${q}"` : 'Comece cadastrando seu primeiro cliente'}
              </p>
              <LinkButton href="/clients/new" size="sm" variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-1" /> Cadastrar cliente
              </LinkButton>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-800 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-ink-400 uppercase tracking-wider">Nome</th>
                    <th className="px-4 py-3 text-xs font-medium text-ink-400 uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-3 text-xs font-medium text-ink-400 uppercase tracking-wider">Contato</th>
                    <th className="px-4 py-3 text-xs font-medium text-ink-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-medium text-ink-400 uppercase tracking-wider">Cadastro</th>
                    <th className="px-4 py-3 text-xs font-medium text-ink-400 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800">
                  {rows.map((cl) => {
                    const p = cl.person as { fullName?: string; legalName?: string; cpf?: string; cnpj?: string; email?: string; phone?: string; kind?: string; createdAt?: Date } | undefined;
                    const name = p?.fullName ?? p?.legalName ?? '—';
                    return (
                      <tr key={cl.id} className="hover:bg-ink-900/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vara-900 text-vara-300 text-xs font-semibold">
                              {name[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <Link href={`/clients/${cl.id}`} className="font-medium text-ink-50 hover:text-vara-300 block">
                                {name}
                              </Link>
                              <p className="text-xs text-ink-500">
                                {p?.cpf
                                  ? `CPF ${p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}`
                                  : p?.cnpj
                                  ? `CNPJ ${p.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}`
                                  : '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-ink-300">
                            {p?.kind === 'PF' ? (
                              <><User className="h-4 w-4 text-ink-500" /><span className="text-xs">PF</span></>
                            ) : (
                              <><Building2 className="h-4 w-4 text-ink-500" /><span className="text-xs">PJ</span></>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {p?.email && (
                              <p className="flex items-center gap-1.5 text-xs text-ink-300">
                                <Mail className="h-3 w-3 text-ink-500" />{p.email}
                              </p>
                            )}
                            {p?.phone && (
                              <p className="flex items-center gap-1.5 text-xs text-ink-300">
                                <Phone className="h-3 w-3 text-ink-500" />{p.phone}
                              </p>
                            )}
                            {!p?.email && !p?.phone && <span className="text-xs text-ink-600">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3"><ClientStatusBadge status={cl.status} /></td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-ink-400">
                            {p?.createdAt ? format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <LinkButton href={`/clients/${cl.id}`} size="sm" variant="ghost" className="text-xs">Ver</LinkButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-ink-400">
          <p>Página {page} de {totalPages} · {total} resultados</p>
          <div className="flex gap-2">
            {page > 1 && (
              <LinkButton
                href={`/clients?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), page: String(page - 1) }).toString()}`}
                size="sm" variant="outline"
              >
                Anterior
              </LinkButton>
            )}
            {page < totalPages && (
              <LinkButton
                href={`/clients?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), page: String(page + 1) }).toString()}`}
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

function ClientStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'success' | 'warning' | 'muted' | 'default' }> = {
    ACTIVE: { label: 'Ativo', variant: 'success' },
    INACTIVE: { label: 'Inativo', variant: 'warning' },
    FORMER: { label: 'Ex-cliente', variant: 'muted' },
  };
  const cfg = map[status] ?? { label: status, variant: 'default' as const };
  return <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>;
}
