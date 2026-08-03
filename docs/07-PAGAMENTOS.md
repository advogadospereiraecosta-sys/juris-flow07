# JURIS-FLOW — Billing, Pagamentos e Cobranças

> Asaas como gateway. PIX, boleto e cartão. Recorrência. Régua automática.

---

## Por que Asaas?

| Razão | Detalhe |
|---|---|
| **PIX-first** | Webhook em tempo real, confirmação instantânea |
| **Boleto bancário** | 100% cobrança registrada |
| **Cartão recorrente** | Visa, Master, Elo, Hipercard |
| **Nota fiscal automática** | Quando cliente pede |
| **Custo** | R$ 0,99 por transação (sem mensalidade) |
| **API REST madura** | Docs claras |
| **Antifraude** | Integrado |
| **Webhooks** | Eventos assíncronos |
| **Suporte BR** | PT-BR, horário comercial Brasil |

**Alternativas consideradas:** Stripe (faltava PIX nativo, mais caro), Iugu (similar mas menos confiável), Pagar.me (bom mas exige homologação mais complexa).

---

## Modelo de Cobrança

### Planos

```ts
const PLANS = {
  FREE: {
    name: 'Free',
    monthlyCents: 0,
    yearlyCents: 0,
    features: {
      processes: 5,
      leads: 10,
      clients: 10,
      piecesPerMonth: 2,
      djenMonitor: false,
      teamMembers: 1,
      storageGB: 0.5,
    },
  },
  ESSENTIAL: {
    name: 'Essencial',
    monthlyCents: 6900,    // R$ 69
    yearlyCents: 66_240,   // R$ 662,40 (20% off)
    features: {
      processes: Infinity,
      leads: Infinity,
      clients: Infinity,
      piecesPerMonth: 20,
      djenMonitor: true,
      calculators: ['TRCT', 'UPDATE_SELIC', 'UPDATE_IPCA', 'FOOD'],
      teamMembers: 1,
      storageGB: 5,
      aiModel: 'sonnet',
    },
  },
  PRO: {
    name: 'Pro',
    monthlyCents: 14_900,  // R$ 149
    yearlyCents: 142_800,  // R$ 1.428
    features: {
      processes: Infinity,
      leads: Infinity,
      clients: Infinity,
      piecesPerMonth: Infinity,
      djenMonitor: true,
      calculators: 'all',
      teamMembers: 3,
      storageGB: 20,
      aiModel: 'sonnet',
      whiteLabel: true,
      whatsappAlerts: true,
    },
  },
  ELITE: {
    name: 'Elite',
    monthlyCents: 32_900,  // R$ 329
    yearlyCents: 315_840,  // R$ 3.158
    features: {
      processes: Infinity,
      leads: Infinity,
      clients: Infinity,
      piecesPerMonth: Infinity,
      djenMonitor: true,
      calculators: 'all',
      teamMembers: 10,
      storageGB: 100,
      aiModel: 'opus',
      whiteLabel: true,
      whatsappAlerts: true,
      prioritySupport: true,
      api: true,
      voiceTranscription: true,
    },
  },
};
```

### Onboarding Flow

```
1. User sign up → tenant criado (FREE)
2. User testa 14 dias PRO (trial)
3. Trial encerrando (D-3): email reminder
4. Trial encerrando (D-0): prompt para escolher plano
5. Usuário escolhe plano → Asaas checkout
6. Pagamento confirmado via webhook → tenant.status = 'ACTIVE'
7. Paga anual: 20% desconto
```

---

## Implementação Asaas

### Criação de Cliente

```ts
// lib/payments/asaas.ts
import axios from 'axios';

const asaas = axios.create({
  baseURL: process.env.ASAAS_API_URL,
  headers: {
    access_token: process.env.ASAAS_API_KEY,
    'Content-Type': 'application/json',
  },
});

export async function createCustomer(tenant: Tenant): Promise<string> {
  // Verificar se já existe
  if (tenant.asaasCustomerId) return tenant.asaasCustomerId;

  const response = await asaas.post('/v3/customers', {
    name: tenant.name,
    email: tenant.email,
    mobilePhone: tenant.phone,
    cpfCnpj: tenant.document,
    postalCode: tenant.address?.cep,
    address: tenant.address?.logradouro,
    addressNumber: tenant.address?.numero,
    province: tenant.address?.bairro,
    city: tenant.address?.cidade,
    state: tenant.address?.uf,
    externalReference: tenant.id,
  });

  await db.tenants.update({
    where: { id: tenant.id },
    data: { asaasCustomerId: response.data.id }
  });

  return response.data.id;
}
```

### Criação de Assinatura

```ts
export async function createSubscription(
  tenantId: string,
  plan: Plan,
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO',
  creditCard?: CreditCardData
): Promise<{ subscriptionId: string }> {
  const tenant = await db.tenants.findUniqueOrThrow({ where: { id: tenantId } });
  const customerId = await createCustomer(tenant);

  const planPrice = billingType === 'CREDIT_CARD' ? plan.monthlyCents : plan.yearlyCents;
  const cycle = billingType === 'CREDIT_CARD' ? 'MONTHLY' : 'YEARLY';

  const response = await asaas.post('/v3/subscriptions', {
    customer: customerId,
    billingType,
    value: planPrice / 100,
    nextDueDate: getNextDueDate(),
    cycle,
    description: `Juris-Flow ${plan.name}`,
    externalReference: tenantId,
  });

  // Se cartão, criar payment dentro
  if (billingType === 'CREDIT_CARD' && creditCard) {
    await asaas.post(`/v3/subscriptions/${response.data.id}/payments`, {
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value: planPrice / 100,
      dueDate: getNextDueDate(),
      creditCard: {
        holderName: creditCard.holderName,
        number: creditCard.number,
        expiryMonth: creditCard.expiryMonth,
        expiryYear: creditCard.expiryYear,
        ccv: creditCard.ccv,
      },
      creditCardHolderInfo: {
        name: tenant.name,
        email: tenant.email,
        cpfCnpj: tenant.document,
        postalCode: tenant.address?.cep,
        addressNumber: tenant.address?.numero,
        mobilePhone: tenant.phone,
      },
    });
  }

  await db.tenants.update({
    where: { id: tenantId },
    data: {
      plan: plan.id,
      asaasSubscriptionId: response.data.id,
      plan_status: 'ACTIVE',
    }
  });

  return { subscriptionId: response.data.id };
}
```

### Webhook Handler

```ts
// app/api/webhooks/asaas/route.ts
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Validate signature
  const signature = req.headers.get('asaas-access-token');
  if (!verifyAsaasSignature(body, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = body.event;
  const payment = body.payment;

  switch (event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
      await handlePaymentConfirmed(payment);
      break;
    case 'PAYMENT_OVERDUE':
      await handlePaymentOverdue(payment);
      break;
    case 'PAYMENT_DELETED':
    case 'PAYMENT_REFUNDED':
      await handlePaymentRefunded(payment);
      break;
    case 'SUBSCRIPTION_DELETED':
      await handleSubscriptionCancelled(body.subscription);
      break;
    case 'SUBSCRIPTION_UPDATED':
      await handleSubscriptionUpdated(body.subscription);
      break;
  }

  return new Response('ok');
}

async function handlePaymentConfirmed(payment: any) {
  await db.invoices.update({
    where: { asaas_id: payment.id },
    data: {
      status: 'PAID',
      paid_at: new Date(payment.paymentDate),
      asaas_status: payment.status,
    }
  });

  const invoice = await db.invoices.findUnique({
    where: { asaas_id: payment.id },
    include: { tenant: true }
  });

  if (!invoice) return;

  // Renovar subscription
  await db.subscriptions.update({
    where: { tenantId: invoice.tenantId },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: addDuration(new Date(), invoice.cycle),
    }
  });

  // Reset usage counters
  await db.usageRecords.deleteMany({
    where: {
      tenantId: invoice.tenantId,
      period: getCurrentPeriod()
    }
  });

  // Notificar user
  await notifyUser(invoice.tenant.ownerEmail, {
    type: 'INVOICE_PAID',
    title: 'Pagamento confirmado',
    body: `Recebemos R$ ${payment.value}. Seu plano ${invoice.planName} está ativo.`,
  });
}

async function handlePaymentOverdue(payment: any) {
  const invoice = await db.invoices.findUnique({
    where: { asaas_id: payment.id }
  });

  if (!invoice) return;

  await db.invoices.update({
    where: { id: invoice.id },
    data: { status: 'OVERDUE' }
  });

  // Iniciar régua de cobrança (Inngest schedule)
  await inngest.send({
    name: 'billing/overdue.started',
    data: { invoiceId: invoice.id }
  });

  // Notificar user
  await notifyUser(invoice.tenant.ownerEmail, {
    type: 'INVOICE_OVERDUE',
    title: 'Pagamento em atraso',
    body: `Sua fatura de R$ ${payment.value} venceu hoje. Atualize seu método de pagamento.`,
    link: '/settings/billing',
    priority: 'HIGH',
  });
}
```

---

## Régua de Cobrança — Tenant não pagou Juris-Flow

```ts
// Inngest workflow
export const billingOverdue = inngest.createFunction(
  { id: 'billing-overdue', name: 'Régua Cobrança Tenant' },
  { event: 'billing/overdue.started' },
  async ({ event, step }) => {
    const { invoiceId } = event.data;

    await step.sleep('wait-d3', '3d');
    await step.run('d3-email', () =>
      sendEmail({
        to: invoice.tenant.ownerEmail,
        subject: '⚠️ Sua assinatura Juris-Flow está em atraso',
        template: 'billing/d3-payment-failed',
        data: { invoice, planName: 'Pro' }
      })
    );

    await step.sleep('wait-d7', '4d');
    await step.run('d7-final-notice', () =>
      sendEmail({
        to: invoice.tenant.ownerEmail,
        subject: 'Última chamada: regularize sua assinatura',
        template: 'billing/d7-final-notice',
      })
    );

    await step.sleep('wait-d10', '3d');
    await step.run('d10-suspend', async () => {
      // Bloquear funcionalidades pagas
      await db.tenants.update({
        where: { id: invoice.tenantId },
        data: { plan: 'FREE', plan_status: 'PAST_DUE' }
      });
    });

    await step.run('d10-notify', () =>
      sendEmail({
        to: invoice.tenant.ownerEmail,
        subject: 'Sua conta Juris-Flow foi suspensa',
        template: 'billing/d10-suspended',
      })
    );

    await step.sleep('wait-d20', '10d');
    await step.run('d20-cancel', async () => {
      // Cancelar acesso
      await db.tenants.update({
        where: { id: invoice.tenantId },
        data: { plan: 'FREE', plan_status: 'UNPAID' }
      });
      await db.users.updateMany({
        where: { tenantId: invoice.tenantId },
        data: { /* suspender sessões */ }
      });
    });
  }
);
```

---

## Honora Cobrança — Escritório cobra cliente (interno)

### Fluxo

```
1. Advogado cadastra honorário R$ 5.000 no cliente
2. Dispara ação (trigger) por evento:
   - assinatura do contrato
   - ganho de causa
   - mês vencido (recorrente)
3. Sistema cria invoice automaticamente
4. Asaas gera cobrança (PIX/boleto/cartão)
5. Cliente recebe via email/WhatsApp
6. Pagamento → baixa automática
7. Inadimplência → régua de cobrança própria
```

### Régua de Cobrança ao Cliente

```
D+1  → Email amigável: "Olá, [Cliente]. Sua fatura está em aberto."
D+7  → WhatsApp formal: "Sua fatura nº X de R$ Y venceu há 7 dias..."
D+15 → Notificação cartorial via API (modelo PR/RJ)
D+30 → Email + ligar: "Sua fatura está há 30 dias..."
D+45 → Email: "Última tentativa. Em 15 dias suspendemos serviços."
D+60 → Suspensão dos serviços com aviso prévio 5d
D+75 → Ação judicial (gera petição via skill cobranca-honorarios)
```

---

## Free Tier Limits

```ts
function checkLimit(tenantId: string, metric: string) {
  const plan = getPlan(tenant.asaas_plan);
  const usage = getCurrentUsage(tenantId, metric);

  return {
    allowed: usage < plan.features[metric],
    current: usage,
    limit: plan.features[metric],
    period_end: getPeriodEnd(),
    upgrade_url: '/settings/billing'
  };
}

// No tRPC middleware:
procedure.use(async ({ ctx, next }) => {
  if (input.pieceType) {
    const limit = checkLimit(ctx.tenantId, 'piecesPerMonth');
    if (!limit.allowed) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Limite mensal atingido (${limit.current}/${limit.limit}). Faça upgrade.`,
        cause: { upgradeUrl: limit.upgrade_url }
      });
    }
  }
  return next();
});
```

---

## Emissão de Nota Fiscal

Asaas gera NFS-e automaticamente:
- Após cada pagamento confirmado
- Email com PDF anexo
- Disponível no portal Asaas do cliente
- Download programático via `GET /v3/invoices/{id}`

---

## Stripe vs Asaas para o futuro

Se Juris-Flow expandir para outros países (PT-PT, ES-LATAM), avaliar Stripe. Hoje fica em Asaas por:

1. PIX é mandatório no Brasil (95% dos advogados usam)
2. Boleto é cultura (cartão morre em pequenas cidades)
3. Nota fiscal automática é obrigatória
4. Custo menor que Stripe BR

---

## Cobranças Internas do Escritório (Honorários)

### UI

```
/finance (módulo)
├── Honorários
│   ├── /contracts (lista de contratos)
│   ├── /contracts/new
│   └── /contracts/[id]
├── Faturas
│   ├── /invoices (lista)
│   ├── /invoices/new
│   └── /invoices/[id]
├── Despesas
│   ├── /expenses (por caso, por categoria)
│   └── /expenses/[id]
├── Relatórios
│   ├── Aging de faturas
│   ├── Receita por mês
│   ├── Receita por área
│   ├── LTV por cliente
│   └── Taxa de inadimplência
└── Configuração Asaas
    ├── API Key (OAuth)
    ├── Conta padrão
    └── Status da integração
```

### Integração com Asaas — Escritório

- Escritório cadastra suas credenciais Asaas (OAuth flow) e usa **a própria** conta dele
- Juris-Flow apenas **opera** — não toca o dinheiro
- Separação clara: Juris-Flow cobra assinatura da plataforma; escritório cobra seus honorários pela mesma plataforma
- Compliance: Juris-Flow NÃO é sub-sociedade de cobrança, apenas oferece tooling
