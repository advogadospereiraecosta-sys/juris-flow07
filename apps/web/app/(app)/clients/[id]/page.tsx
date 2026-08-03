import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import {
  Card, CardContent, CardHeader, CardTitle, Badge, LinkButton, Button,
} from '@juris-flow/ui';
import {
  ArrowLeft, User, Building2, Mail, Phone, MapPin,
  Briefcase, Tag, Calendar, FileText, Download, Trash2, FolderOpen,
} from 'lucide-react';

export const metadata = { title: 'Cliente — Juris-Flow' };

import { DocumentsButton } from '@/components/documents/documents-button';

type Address = {
  cep?: string; logradouro?: string; numero?: string; complemento?: string;
  bairro?: string; cidade?: string; uf?: string;
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'muted' | 'default' }> = {
  ACTIVE: { label: 'Ativo', variant: 'success' },
  INACTIVE: { label: 'Inativo', variant: 'warning' },
  FORMER: { label: 'Ex-cliente', variant: 'muted' },
};

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) notFound();

  // Aceita tanto o ID do Client quanto o ID da Person (legado)
  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId },
    include: {
      person: true,
    },
  });

  let resolved = client;
  if (!client) {
    const person = await prisma.person.findFirst({
      where: { id: params.id, tenantId },
      include: { client: { include: { person: true } } },
    });
    if (person?.client) resolved = { ...person.client, person: person.client.person };
  }
  if (!resolved) notFound();

  const c = resolved as typeof resolved & { person: { address: Address | null } };
  const person = c.person;
  const name = person.fullName ?? person.legalName ?? '—';
  const statusCfg = STATUS_CONFIG[c.status] ?? { label: c.status, variant: 'default' as const };
  const address = (person.address ?? {}) as Address;

  // Processos vinculados a este cliente
  const cases = await prisma.case.findMany({
    where: { tenantId, clientId: person.id, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    take: 10,
    select: {
      id: true, title: true, status: true, legalArea: true, updatedAt: true, cnjNumber: true,
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <LinkButton href="/clients" size="sm" variant="ghost" className="mt-1 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </LinkButton>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vara-900 text-vara-300 text-base font-semibold">
              {name[0]?.toUpperCase() ?? '?'}
            </div>
            <h1 className="vf-display-md text-2xl font-bold text-ink-50">{name}</h1>
            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
            <Badge variant="muted" className="text-[10px]">{person.kind}</Badge>
          </div>
          {person.tradeName && (
            <p className="text-sm text-ink-400 mt-1 ml-13">Nome fantasia: {person.tradeName}</p>
          )}
        </div>
        <div className="flex gap-2">
          <DocumentsButton
            drivePath={`Clientes/${name.replace(/[/\\]/g, ' ')}`}
            scopeLabel={name}
            variant="primary"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Processos */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-vara-400" />
                Processos ({cases.length})
              </CardTitle>
              <LinkButton href={`/processos/new?clientId=${c.id}`} size="sm" variant="ghost" className="text-xs">
                Novo processo
              </LinkButton>
            </CardHeader>
            <CardContent>
              {cases.length === 0 ? (
                <p className="text-xs text-ink-500 text-center py-4">
                  Nenhum processo vinculado. Crie um caso para este cliente.
                </p>
              ) : (
                <ul className="space-y-2">
                  {cases.map((cs) => (
                    <li key={cs.id}>
                      <Link href={`/processos/${cs.id}`} className="block rounded-md border border-ink-800 p-3 hover:border-ink-600 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink-100 truncate">{cs.title}</p>
                            <p className="text-xs text-ink-500 mt-0.5">
                              <Badge variant="muted" className="text-[10px] mr-2">{cs.legalArea}</Badge>
                              {cs.cnjNumber && <span className="font-mono">{cs.cnjNumber}</span>}
                            </p>
                          </div>
                          <span className="text-[10px] text-ink-500 shrink-0">
                            {format(new Date(cs.updatedAt), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Observações */}
          {person.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-vara-400" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-ink-200 whitespace-pre-wrap">{person.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {person.tags && person.tags.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="h-3.5 w-3.5 text-ink-500" />
                  {person.tags.map((t) => (
                    <span key={t} className="text-xs bg-ink-800 text-ink-300 px-2 py-1 rounded">{t}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Identificação */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-ink-100">Identificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {person.cpf && (
                <InfoRow label="CPF" value={formatCpfCnpj(person.cpf, 'cpf')} monospace />
              )}
              {person.cnpj && (
                <InfoRow label="CNPJ" value={formatCpfCnpj(person.cnpj, 'cnpj')} monospace />
              )}
              {person.stateRegistration && (
                <InfoRow label="IE" value={person.stateRegistration} monospace />
              )}
              {person.birthDate && (
                <InfoRow label="Nascimento" value={format(new Date(person.birthDate), 'dd/MM/yyyy', { locale: ptBR })} />
              )}
              <InfoRow label="Cadastrado em" value={format(new Date(person.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
              {c.contractedAt && (
                <InfoRow label="Cliente desde" value={format(new Date(c.contractedAt), 'dd/MM/yyyy', { locale: ptBR })} />
              )}
            </CardContent>
          </Card>

          {/* Contato */}
          {(person.email || person.phone || person.whatsapp) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-ink-100">Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {person.email && (
                  <a href={`mailto:${person.email}`} className="flex items-center gap-2 text-ink-200 hover:text-vara-300">
                    <Mail className="h-3.5 w-3.5 text-ink-500" />
                    {person.email}
                  </a>
                )}
                {person.phone && (
                  <a href={`tel:${person.phone}`} className="flex items-center gap-2 text-ink-200 hover:text-vara-300">
                    <Phone className="h-3.5 w-3.5 text-ink-500" />
                    {person.phone}
                  </a>
                )}
                {person.whatsapp && (
                  <a
                    href={`https://wa.me/55${person.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-ink-200 hover:text-improcede-300"
                  >
                    <Phone className="h-3.5 w-3.5 text-improcede-400" />
                    WhatsApp: {person.whatsapp}
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Endereço */}
          {(address.logradouro || address.cep) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-ink-400" />
                  Endereço
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-ink-200">
                {address.logradouro && (
                  <p>
                    {address.logradouro}{address.numero ? `, ${address.numero}` : ''}
                    {address.complemento ? ` — ${address.complemento}` : ''}
                  </p>
                )}
                {address.bairro && <p className="text-ink-400">{address.bairro}</p>}
                <p className="text-ink-400">
                  {address.cidade ?? ''}{address.uf ? `/${address.uf}` : ''}
                  {address.cep ? ` · CEP ${address.cep}` : ''}
                </p>
              </CardContent>
            </Card>
          )}

          {/* LGPD */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <p className="text-[10px] text-ink-500 uppercase tracking-wider font-medium">LGPD</p>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Download className="h-3.5 w-3.5 mr-1" />
                Exportar dados (Art. 18, V)
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-prazo-400 border-prazo-700">
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Anonimizar (Art. 18, VI)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, monospace }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-ink-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-ink-200 ${monospace ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}

function formatCpfCnpj(value: string, kind: 'cpf' | 'cnpj'): string {
  const d = value.replace(/\D/g, '');
  if (kind === 'cpf' && d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (kind === 'cnpj' && d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}