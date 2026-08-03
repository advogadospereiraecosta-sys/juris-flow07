import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { Card, CardContent, CardHeader, CardTitle, Badge, LinkButton } from '@juris-flow/ui';
import {
  ArrowLeft, Mail, Phone, Calendar, DollarSign, Tag, FileText,
  CheckCircle2, XCircle, UserCheck, ExternalLink,
} from 'lucide-react';
import { ConvertLeadButton } from '@/components/leads/convert-lead-button';

export const metadata = { title: 'Lead — Juris-Flow' };

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'muted' | 'default' | 'danger' | 'info' }> = {
  NEW: { label: 'Novo', variant: 'muted' },
  CONTACTED: { label: 'Em contato', variant: 'info' },
  QUALIFIED: { label: 'Qualificado', variant: 'default' },
  PROPOSAL: { label: 'Proposta', variant: 'warning' },
  NEGOTIATION: { label: 'Negociação', variant: 'warning' },
  WON: { label: 'Ganho', variant: 'success' },
  LOST: { label: 'Perdido', variant: 'muted' },
  NO_SHOW: { label: 'Não compareceu', variant: 'danger' },
};

const SOURCE_LABEL: Record<string, string> = {
  ORGANIC: 'Orgânico',
  REFERRAL: 'Indicação',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  GOOGLE_ADS: 'Google Ads',
  LINKEDIN: 'LinkedIn',
  YOUTUBE: 'YouTube',
  EVENT: 'Evento',
  OTHER: 'Outro',
};

const LEGAL_AREA_LABEL: Record<string, string> = {
  CIVEL: 'Cível', TRABALHISTA: 'Trabalhista', CRIMINAL: 'Criminal',
  FAMILIA: 'Família', TRIBUTARIO: 'Tributário', PREVIDENCIARIO: 'Previdenciário',
  EMPRESARIAL: 'Empresarial', CONSUMIDOR: 'Consumidor',
  ADMINISTRATIVO: 'Administrativo', IMOBILIARIO: 'Imobiliário', OUTRO: 'Outro',
};

function formatCents(cents: bigint | number | null | undefined): string {
  if (cents == null || cents === 0) return '—';
  const n = typeof cents === 'bigint' ? Number(cents) : cents;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n / 100);
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) notFound();

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
    include: { responsibleUser: { select: { id: true, fullName: true, email: true } } },
  });
  if (!lead) notFound();

  const statusCfg = STATUS_CONFIG[lead.status] ?? { label: lead.status, variant: 'default' as const };
  const nextAction = lead.nextActionAt ? new Date(lead.nextActionAt) : null;
  const nextOverdue = nextAction && isPast(nextAction) && lead.status !== 'WON';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <LinkButton href="/leads" size="sm" variant="ghost" className="mt-1 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </LinkButton>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="vf-display-md text-2xl font-bold text-ink-50">{lead.fullName}</h1>
            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
            <span className="text-xs text-ink-500">
              {lead.probability}% probabilidade
            </span>
          </div>
          <p className="text-sm text-ink-400 mt-1">
            Lead capturado via <strong className="text-ink-200">{SOURCE_LABEL[lead.source] ?? lead.source}</strong>
            {' · há '}
            {formatDistanceToNow(new Date(lead.createdAt), { locale: ptBR, addSuffix: true })}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {lead.status !== 'WON' && (
            <ConvertLeadButton leadId={lead.id} />
          )}
          {lead.convertedClientId && (
            <LinkButton href={`/clients/${lead.convertedClientId}`} size="sm" variant="primary">
              <UserCheck className="h-4 w-4 mr-1" />
              Ver cliente
              <ExternalLink className="h-3 w-3 ml-1" />
            </LinkButton>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Próxima ação destacada */}
          {nextAction && (
            <div className={`rounded-md border px-4 py-3 text-sm flex items-start gap-3 ${nextOverdue ? 'border-rede-700 bg-rede-950/40' : 'border-improcede-700/40 bg-improcede-950/30'}`}>
              <Calendar className={`h-4 w-4 mt-0.5 shrink-0 ${nextOverdue ? 'text-rede-400' : 'text-improcede-400'}`} />
              <div>
                <p className={`font-medium ${nextOverdue ? 'text-rede-200' : 'text-improcede-200'}`}>
                  {nextOverdue ? '⚠ PRÓXIMA AÇÃO ATRASADA' : 'Próxima ação'}
                </p>
                <p className="text-ink-300 text-xs mt-0.5">
                  <strong>{lead.nextAction ?? '—'}</strong>
                  {' · '}
                  {format(nextAction, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          )}

          {/* Observações */}
          {lead.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-vara-400" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-ink-200 whitespace-pre-wrap">{lead.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="h-3.5 w-3.5 text-ink-500" />
                  {lead.tags.map((t) => (
                    <span key={t} className="text-xs bg-ink-800 text-ink-300 px-2 py-1 rounded">{t}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Conversão info */}
          {lead.convertedAt && lead.convertedClientId && (
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-improcede-400" />
                <div className="flex-1">
                  <p className="text-sm text-improcede-200 font-medium">Lead convertido em cliente</p>
                  <p className="text-xs text-ink-500">
                    Em {format(new Date(lead.convertedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Contato */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-ink-100">Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-ink-200 hover:text-vara-300">
                  <Mail className="h-3.5 w-3.5 text-ink-500" />
                  {lead.email}
                </a>
              )}
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-ink-200 hover:text-vara-300">
                  <Phone className="h-3.5 w-3.5 text-ink-500" />
                  {lead.phone}
                </a>
              )}
              {lead.whatsapp && (
                <a
                  href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-ink-200 hover:text-improcede-300"
                >
                  <Phone className="h-3.5 w-3.5 text-improcede-400" />
                  WhatsApp: {lead.whatsapp}
                </a>
              )}
              {!lead.email && !lead.phone && (
                <p className="text-ink-500 text-xs">—</p>
              )}
            </CardContent>
          </Card>

          {/* Caso */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-ink-100">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {lead.legalArea && (
                <InfoRow label="Área jurídica" value={LEGAL_AREA_LABEL[lead.legalArea] ?? lead.legalArea} />
              )}
              <InfoRow label="Valor estimado" value={formatCents(lead.estimatedValueCents)} />
              <InfoRow label="Probabilidade" value={`${lead.probability}%`} />
              <InfoRow label="Origem" value={SOURCE_LABEL[lead.source] ?? lead.source} />
              {lead.responsibleUser && (
                <InfoRow label="Responsável" value={lead.responsibleUser.fullName} />
              )}
              <InfoRow label="Criado em" value={format(new Date(lead.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-ink-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-ink-200">{value}</p>
    </div>
  );
}