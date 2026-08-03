import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '@juris-flow/ui';
import { CreditCard, Clock, AlertTriangle, Check } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const metadata = { title: 'Plano & Cobrança — Juris-Flow' };

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: 'R$ 0',
    period: '/mês',
    features: [
      'Até 5 clientes',
      'Até 5 peças com IA/mês',
      'Kanban de tarefas',
      '1 usuário por escritório',
    ],
    cta: 'Você está aqui',
    highlight: false,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 'R$ 149',
    period: '/mês',
    features: [
      'Clientes ilimitados',
      '50 peças com IA/mês (Claude Opus)',
      'Processos e tarefas ilimitados',
      'Documentos via Google Drive',
      'Até 5 usuários por escritório',
      'Suporte prioritário',
    ],
    cta: 'Em breve',
    highlight: true,
  },
  {
    id: 'ELITE',
    name: 'Elite',
    price: 'R$ 499',
    period: '/mês',
    features: [
      'Tudo do Pro',
      'Peças com IA ilimitadas',
      'RAG de jurisprudência customizada',
      'DB dedicado (LGPD premium)',
      'Usuários ilimitados',
      'Onboarding assistido',
    ],
    cta: 'Em breve',
    highlight: false,
  },
] as const;

export default async function BillingPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: true,
      planStatus: true,
      trialEndsAt: true,
      asaasCustomerId: true,
      asaasSubscriptionId: true,
    },
  });

  const daysLeft = tenant?.trialEndsAt
    ? Math.max(0, Math.ceil((tenant.trialEndsAt.getTime() - Date.now()) / 86400000))
    : 0;

  const statusLabel: Record<string, { label: string; variant: 'success' | 'warning' | 'muted' | 'danger' | 'default' }> = {
    TRIALING: { label: 'Em trial', variant: 'warning' },
    ACTIVE: { label: 'Ativo', variant: 'success' },
    PAST_DUE: { label: 'Pagamento atrasado', variant: 'danger' },
    CANCELLED: { label: 'Cancelado', variant: 'muted' },
    UNPAID: { label: 'Não pago', variant: 'danger' },
  };
  const statusCfg = tenant ? (statusLabel[tenant.planStatus] ?? { label: tenant.planStatus, variant: 'default' as const }) : null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="vf-display-md text-2xl font-bold text-ink-50">Plano & Cobrança</h1>
        <p className="vf-caption text-ink-400 mt-0.5">
          Gerencie a assinatura do Juris-Flow do seu escritório.
        </p>
      </div>

      {/* Status atual */}
      {tenant && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-vara-400" />
              Assinatura atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-ink-500 uppercase tracking-wider">Plano</p>
                <p className="text-lg font-semibold text-ink-100 mt-0.5">{tenant.plan}</p>
              </div>
              <div>
                <p className="text-xs text-ink-500 uppercase tracking-wider">Status</p>
                <div className="mt-1">
                  {statusCfg && <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>}
                </div>
              </div>
              <div>
                <p className="text-xs text-ink-500 uppercase tracking-wider">Trial termina</p>
                <p className="text-sm text-ink-200 mt-0.5 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {tenant.trialEndsAt ? format(tenant.trialEndsAt, 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                </p>
                {daysLeft > 0 && (
                  <p className="text-[10px] text-ink-500 mt-0.5">
                    ({daysLeft} dias restantes)
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-ink-500 uppercase tracking-wider">Asaas</p>
                <p className="text-sm text-ink-200 mt-0.5 font-mono text-[10px]">
                  {tenant.asaasCustomerId ?? '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aviso Billing Asaas */}
      <div className="rounded-md border border-prazo-700/40 bg-prazo-950/20 px-4 py-3 text-sm text-prazo-200 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Billing completo em breve</p>
          <p className="text-xs text-prazo-300/80 mt-0.5">
            Estamos integrando com Asaas (PIX + Boleto + Cartão). Por enquanto você está no plano Free com trial de 14 dias.
          </p>
        </div>
      </div>

      {/* Planos */}
      <div>
        <h2 className="text-base font-semibold text-ink-100 mb-3">Planos disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = tenant?.plan === plan.id;
            return (
              <Card key={plan.id} className={plan.highlight ? 'border-vara-600 ring-1 ring-vara-600/30' : undefined}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    {plan.highlight && <Badge variant="info">Recomendado</Badge>}
                  </div>
                  <CardDescription>
                    <span className="text-2xl font-bold text-ink-50">{plan.price}</span>
                    <span className="text-ink-500 text-sm">{plan.period}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-xs text-ink-300">
                        <Check className="h-3.5 w-3.5 text-improcede-400 mt-0.5 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={isCurrent || plan.cta !== 'Em breve'}
                    className={`w-full rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isCurrent
                        ? 'bg-ink-700 text-ink-400 cursor-default'
                        : plan.cta === 'Em breve'
                        ? 'bg-ink-800 text-ink-500 cursor-not-allowed'
                        : 'bg-vara-700 text-ink-50 hover:bg-vara-600'
                    }`}
                  >
                    {isCurrent ? 'Plano atual' : plan.cta}
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}