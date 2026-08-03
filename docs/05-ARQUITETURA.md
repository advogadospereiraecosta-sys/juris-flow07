# JURIS-FLOW — Arquitetura Técnica

> Stack: Next.js 14 (App Router) + tRPC + Prisma + Supabase + Claude API + Asaas.

---

## Diagrama de Alto Nível

```
                       ┌────────────┐
                       │   Cliente  │ (Browser PWA / Mobile v2)
                       └──────┬─────┘
                              │ HTTPS (TLS 1.3)
                              │ Vercel Edge CDN
                              ↓
        ┌──────────────────────────────────────────────────┐
        │           Next.js 14 App Router (Vercel)         │
        │                                                  │
        │   ┌────────────────────────────────────────────┐│
        │   │ React Server Components + TipTap Editor    ││
        │   │ shadcn/ui + Tailwind + Framer Motion       ││
        │   └──────────────────┬─────────────────────────┘│
        │                      │                          │
        │   ┌──────────────────┼──────────────────────┐   │
        │   │                  ↓                      │   │
        │   │  tRPC + Zod (typed end-to-end)          │   │
        │   │  NextAuth (Auth.js v5)                  │   │
        │   │  Server Actions + Route Handlers        │   │
        │   └──────────────────┬──────────────────────┘   │
        └───────────────────────┼──────────────────────────┘
                                │
        ┌───────────────────────┼────────────────────────────┐
        │                       ↓                            │
        │  Inngest (workflows async)                          │
        │  - Sync DataJud / DJEN                              │
        │  - Geração IA peças (queue long)                    │
        │  - Cálculos pesados (alimentos, FGTS)               │
        │  - Régua cobrança (cron)                           │
        └──────────┬─────────────────────────────┬────────────┘
                   │                             │
        ┌──────────▼──────────┐       ┌──────────▼──────────┐
        │  Supabase PostgreSQL│       │   Vercel Functions  │
        │  + PGVector         │       │   (Edge / Node)     │
        │  + RLS multi-tenant │       │                     │
        │  + Realtime         │       │   - Auth (NextAuth) │
        └──────────┬──────────┘       │   - OAuth providers │
                   │                  │   - Webhooks        │
                   │                  └──────────┬──────────┘
                   │                             │
        ┌──────────▼────────────────────┐ ┌──────▼───────────────┐
        │    Storage Tier                │ │   Integrações         │
        │                                │ │                       │
        │  Supabase Storage              │ │  Anthropic Claude API │
        │  - Avatares (≤ 2MB)            │ │  OpenAI Embeddings    │
        │                                │ │  (RAG da Jurisprudência)
        │  Cloudflare R2                 │ │                       │
        │  - Peças PDF/DOCX              │ │  DataJud API (CNJ)    │
        │  - Anexos processos            │ │  DJEN API (CNJ)       │
        │  - Backups                     │ │                       │
        └────────────────────────────────┘ │  Asaas (pagamentos)   │
                                          │                       │
                                          │  Resend (email)       │
                                          │  Z-API (WhatsApp)     │
                                          │                       │
                                          │  PostHog + Plausible  │
                                          │  (analytics LGPD)     │
                                          │                       │
                                          │  Sentry (errors)      │
                                          └───────────────────────┘
```

---

## Estrutura de Pastas

```
juris-flow/
├── apps/
│   ├── web/                          # Next.js principal
│   │   ├── app/
│   │   │   ├── (marketing)/          # Landing, pricing, blog
│   │   │   │   ├── page.tsx
│   │   │   │   ├── pricing/
│   │   │   │   ├── about/
│   │   │   │   └── ...
│   │   │   ├── (auth)/               # login, signup, mfa
│   │   │   │   ├── login/
│   │   │   │   ├── signup/
│   │   │   │   └── mfa/
│   │   │   ├── (app)/                # Painel (autenticado)
│   │   │   │   ├── layout.tsx        # Sidebar + Topbar
│   │   │   │   ├── dashboard/        # M01
│   │   │   │   ├── clients/          # M02
│   │   │   │   │   ├── page.tsx      # Lista
│   │   │   │   │   └── [id]/         # Detalhe
│   │   │   │   ├── leads/            # M03
│   │   │   │   ├── cases/            # M04
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── [id]/
│   │   │   │   │   └── new/
│   │   │   │   ├── tasks/            # M05
│   │   │   │   ├── pieces/           # M06
│   │   │   │   │   ├── catalog/
│   │   │   │   │   └── [id]/
│   │   │   │   ├── calculators/      # M07
│   │   │   │   ├── inbox/            # M08 (Publicações/DJEN)
│   │   │   │   ├── templates/        # M09
│   │   │   │   ├── jurisprudence/    # M10
│   │   │   │   ├── finance/          # M11
│   │   │   │   └── settings/         # M12
│   │   │   ├── api/
│   │   │   │   ├── trpc/             # tRPC handler
│   │   │   │   ├── auth/[...nextauth]/
│   │   │   │   ├── webhooks/
│   │   │   │   │   ├── asaas/
│   │   │   │   │   ├── datajud/
│   │   │   │   │   └── djen/
│   │   │   │   ├── cron/             # Scheduled jobs (Vercel Cron)
│   │   │   │   └── stream/           # SSE endpoints
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn primitive
│   │   │   ├── common/               # business components
│   │   │   │   ├── CaseCard.tsx
│   │   │   │   ├── DeadlineTable.tsx
│   │   │   │   └── ...
│   │   │   ├── forms/                # React Hook Form + Zod
│   │   │   ├── editor/               # TipTap extensions
│   │   │   └── ai/                   # Chat IA, streaming, etc
│   │   ├── lib/
│   │   │   ├── trpc/
│   │   │   ├── auth/
│   │   │   ├── db.ts                 # Prisma client
│   │   │   ├── ai/
│   │   │   │   ├── claude.ts
│   │   │   │   ├── rag.ts
│   │   │   │   └── pieces/           # peça-specific logic
│   │   │   ├── tribunals/
│   │   │   │   ├── datajud.ts
│   │   │   │   └── djen.ts
│   │   │   ├── payments/
│   │   │   │   └── asaas.ts
│   │   │   ├── notifications/
│   │   │   ├── lgpd/
│   │   │   ├── utils/
│   │   │   └── config.ts
│   │   ├── server/                  # Server-side code
│   │   │   ├── routers/              # tRPC routers
│   │   │   │   ├── _app.ts
│   │   │   │   ├── cases.ts
│   │   │   │   ├── clients.ts
│   │   │   │   ├── pieces.ts
│   │   │   │   ├── publications.ts
│   │   │   │   └── ...
│   │   │   ├── services/             # business logic
│   │   │   │   ├── case.service.ts
│   │   │   │   ├── piece.service.ts
│   │   │   │   └── djen.service.ts
│   │   │   ├── workflows/            # Inngest functions
│   │   │   │   ├── piece-generation.ts
│   │   │   │   ├── djen-poll.ts
│   │   │   │   └── datajud-sync.ts
│   │   │   ├── middleware.ts         # Auth + tenant context
│   │   │   └── trpc-context.ts
│   │   ├── schemas/                  # Zod schemas
│   │   │   ├── case.schema.ts
│   │   │   ├── piece.schema.ts
│   │   │   └── ...
│   │   ├── stores/                   # Zustand stores
│   │   ├── hooks/                    # custom hooks
│   │   ├── styles/
│   │   │   └── globals.css
│   │   └── public/
│   ├── worker/                        # Inngest worker (separado)
│   │   └── functions/...
│   └── storybook/                    # Storybook do design system
├── packages/
│   ├── db/                           # Prisma schema + migrations
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   ├── ai/                           # Claude SDK wrapper
│   │   └── src/
│   ├── auth/                         # Auth helpers
│   ├── config/                       # Env validation (t3-env)
│   ├── ui/                           # Shared UI components
│   └── types/                        # Shared TS types
├── docs/
│   ├── 00-PRODUTO.md
│   ├── 01-SCHEMA.md
│   ├── 02-MODULOS.md
│   ├── 03-PECAS-CATALOG.md
│   ├── 04-DESIGN-SYSTEM.md
│   ├── 05-ARQUITETURA.md  (este)
│   ├── 06-IA.md
│   ├── 07-PAGAMENTOS.md
│   ├── 08-GTM.md
│   └── 09-ROADMAP.md
├── .github/
│   └── workflows/                    # CI/CD
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## Stack Resumido

| Camada | Tech |
|---|---|
| Framework | Next.js 14 (App Router, RSC) |
| Linguagem | TypeScript strict |
| UI | React 19 + Tailwind 4 + shadcn/ui |
| Forms | React Hook Form + Zod |
| Validação | Zod |
| API | tRPC v11 |
| Auth | NextAuth v5 (Auth.js) + Lucia opcional |
| DB | Supabase PostgreSQL 16 |
| ORM | Prisma |
| Vector DB | PGVector (Supabase) |
| Storage | Supabase Storage + Cloudflare R2 |
| Cache | Upstash Redis |
| Search | PG full-text + Meilisearch (v2) |
| Files | Cloudflare R2 |
| Email | Resend |
| SMS | Twilio |
| WhatsApp | Z-API (oficial Meta API em v2) |
| Pagamentos | Asaas |
| IA | Anthropic Claude API + Voyage AI embeddings |
| Mobile (v2) | React Native + Expo |
| Error tracking | Sentry |
| Analytics | PostHog + Plausible |
| Monitoring | OpenTelemetry + Grafana Cloud |
| CI/CD | GitHub Actions |
| Hosting | Vercel |
| Long jobs | Inngest |
| Workflows | Inngest |

---

## Modelo de Camadas

### 1. Frontend (apps/web)

- **Server Components** para tudo que seja leitura (zero JS ao cliente onde não precisa)
- **Client Components** para: editor TipTap, formulários, drag-and-drop, charts, SSE consumers
- **Padrão Suspense**: cada rota principal tem `loading.tsx`
- **Metadata API**: SEO via metadata
- **OG images**: `@vercel/og` para social share

### 2. Camada de Apresentação (Camada 3)

- **Server Actions** para mutações simples (form post)
- **tRPC** para mutações que precisam de validação complexa, cache, optimistic update
- **SSE** para streams (geração IA, push notifications)

### 3. Camada de Domínio (apps/web/server/services)

Regras de negócio isoladas de transport (tRPC/HTTP). Services são testáveis sem mock de HTTP.

```ts
// server/services/case.service.ts
export class CaseService {
  static async create(tenantId: string, input: CreateCaseInput, userId: string) {
    // 1. Validar input (Zod)
    // 2. Verificar permissão (RBAC)
    // 3. Persistir (Prisma)
    // 4. Disparar side effects (Inngest event)
    // 5. Audit log
    // 6. Retornar
  }
}
```

### 4. Camada de Dados (Prisma + Supabase)

- Prisma client singleton com tenant context
- **RLS** no DB como camada extra (defense in depth)
- Migrations versionadas (Prisma Migrate)

### 5. Camada de Integração (packages/ai, packages/payments, packages/tribunals)

Wrappers tipados e testáveis das APIs externas.

---

## Roteamento e Autenticação

### Middleware
```ts
// middleware.ts
import { auth } from "@/lib/auth";

export default auth((req) => {
  // tenant context, role check, etc
});

export const config = {
  matcher: ["/((?!_next|api/auth|api/webhooks|favicon.ico).*)"],
};
```

### tRPC Context
```ts
// server/trpc-context.ts
export const createTRPCContext = async (req: NextRequest) => {
  const session = await auth();
  const tenantId = req.headers.get("x-tenant-id");

  if (!session?.user || !tenantId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return {
    db,                  // Prisma client com tenantScope
    session,
    tenantId,
    permissions: getPermissions(session.user.role),
  };
};
```

---

## Estratégia de Cache

```ts
// Camadas de invalidação
1. Next.js `revalidatePath` após mutação (server actions)
2. tRPC `superjson` + React Query (cache cliente)
3. Upstash Redis para queries pesadas (relatórios)
4. ISR + tag-based revalidation no Vercel

// Padrão
const trpc = createTRPCReact<AppRouter>();

trpc.cases.list.useQuery(
  { status: "ACTIVE" },
  {
    staleTime: 30_000,     // 30s
    cacheTime: 5 * 60_000, // 5min
    refetchOnWindowFocus: true,
  }
);
```

---

## Fluxo de uma Mutação (gerar peça com IA)

```
[UI] User preenche schema + clica "Gerar"
   ↓
[Next.js Client] trpc.pieces.generate.mutate(...)
   ↓
[tRPC Router] procedures/pieces.ts
   ├─ 1. Zod validate
   ├─ 2. permission check
   ├─ 3. verifiers: usuário tem créditos? inputs completos?
   └─ 4. dispatch Inngest event `piece/generate.requested`
   ↓
[tRPC] retorna { pieceId }
   ↓
[UI] useEffect(() => connect SSE on /api/stream/piece/[pieceId])
   ↓
[Inngest Worker (worker.functions.piece.generate)]
   ├─ Step 1: piece = atualizar para "GENERATING"
   ├─ Step 2: rag.search(case, type)
   ├─ Step 3: anthropic.messages.stream({...})
   ├─ Step 4a: chunk → SSE publish
   ├─ Step 4b: chunk → acumular em DB
   ├─ Step 5: salvar final
   └─ Step 6: notification dispatch
   ↓
[SSE] frontend recebe chunks → render streaming
   ↓
[UI] Editor abre com a peça pronta
```

---

## Logs Estruturados

```ts
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: ["password", "*.senha", "*.cpf", "*.cnpj"],
  serializers: {
    userId: (u) => u,
    tenantId: (t) => t,
  },
});

// Service
logger.info({
  action: "case.created",
  tenantId,
  userId,
  caseId,
  duration_ms: 123,
});
```

---

## Decisões Arquiteturais (ADRs)

### ADR-001: Por que Next.js App Router?
- Server Components reduzem JS enviado
- Route Handlers substituem backend separado
- Streaming nativo
- Deploy = 1 vez na Vercel

### ADR-002: Por que tRPC e não REST/GraphQL?
- Type-safety end-to-end sem codegen
- Integração React Query automática
- Server Actions complementam para form simples
- GraphQL seria overkill para escopo

### ADR-003: Por que Prisma + RLS?
- Prisma DX é incomparável
- RLS no DB é defesa secundária se app é bypassado
- Trade-off: ligeira duplicação de regras de acesso (aceito)

### ADR-004: Por que Supabase e não Railway + Postgres?
- Supabase tem Realtime (WebSocket pub/sub) que vai ser útil
- Auth de Supabase seria alternativa (mas escolhemos NextAuth)
- Storage nativo (avatares, anexos pequenos)
- RLS tem GUI própria
- **Trade-off:** vendor lock-in parcial

### ADR-005: Por que Inngest e não BullMQ/Temporal?
- Inngest é serverless-first (não precisa de worker dedicado)
- DX forte para retries + observability
- Trigger por events (não precise de polling)
- Custo escala com uso (não fixo)
- Workers ficam leves e Inngest escala

### ADR-006: Por que Asaas e não Stripe Brasil-only?
- Asaas é PIX-first (Brasil precisa disso)
- Boleto + cartão recorrente
- Nota fiscal automática
- Custo fixo baixo (R$ 0,99/transação)
- Stripe seria complemento para global (não hoje)

### ADR-007: Por que Claude (Anthropic) e não OpenAI?
- Skills da Ana já usam Claude
- Claude Opus 4.7 é superior em raciocínio jurídico extenso
- Context window 1M (para casos muito longos)
- XML tags nativas (ideal para structured output em peças)
- Pricing transparente

### ADR-008: Por que PostgreSQL full-text e não ElasticSearch?
- Vitess hostil na Brasil (LGPD, custo)
- Postgres com `tsvector` + `pg_trgm` atende 90% dos casos
- Meilisearch pode ser adicionado em v2 se necessário (busca em jurisprudência)

---

## Segurança

### Princípios
- **Defense in depth** — JWT + NextAuth + Middleware + RLS
- **Least privilege** — RBAC granular, equipe só vê o que precisa
- **Cryptography** — TLS everywhere, AES-256 em repouso, BYOK para plano Elite

### OWASP Top 10 — Mitigações
| Risco | Mitigação |
|---|---|
| Injection | Zod em todos os inputs, parameterized queries (Prisma) |
| Broken Auth | NextAuth v5 + MFA obrigatório + OAuth |
| Sensitive Data Exposure | Encryption at rest, LGPD audit log |
| XXE | Não processamos XML, mas sempre `parseAsString` |
| Broken Access Control | RBAC + RLS + ownership check em services |
| Security Misconfig | Headers via middleware (CSP, HSTS, X-Content-Type) |
| XSS | React escapa por padrão; sanitize se usar TipTap HTML |
| Insecure Deserialization | Zod valida todo JSON |
| Vulnerable Components | Renovate + Dependabot + npm audit CI |
| Insufficient Logging | Sentry + OpenTelemetry + audit_logs DB |

### LGPD Compliance
- Privacy by Design desde o MVP
- Consentimento explícito (não pré-aceito)
- Direito de acesso, correção, portabilidade, esquecimento
- DPO interno (Ana)
- RIPD por feature sensível

---

## Performance

### Core Web Vitals (alvos)
- **LCP** < 1.5s (server-rendered)
- **INP** < 100ms (otimistic UI + transições leves)
- **CLS** < 0.05 (skeleton + image dimensions)

### Bundle Size
- Route por chunk; não compartilhar deps grandes em rotas separadas
- shadcn/ui tree-shake
- TipTap modular import
- Dynamic import de editor pesado

### Edge / CDN
- Vercel Edge Network
- Cloudflare R2 + CDN para arquivos
- Cloudfront pro futuro se necessário

### Serverless Considerations
- Cold start < 1s (rotas quentes, optimize)
- Inngest para tarefas > 5s (não na request principal)

---

## Custos da Infra (estimativa 100 tenants)

| Componente | Custo/mês |
|---|---|
| Vercel Pro | $20 (~R$ 100) |
| Supabase Pro | $25 (~R$ 125) |
| Cloudflare R2 | ~$5 (~R$ 25) |
| Upstash Redis | $10 (~R$ 50) |
| Resend | $20 (~R$ 100) |
| Z-API | R$ 250 |
| Inngest | $20 (~R$ 100) |
| Anthropic API | ~R$ 800 (100 tenants × 30 peças × R$ 0,30 = R$ 900) |
| OpenAI Embeddings | ~R$ 80 |
| PostHog | $0 (free tier) |
| Sentry | $0 (free tier) |
| Plausible | R$ 50 |
| **Total** | **~R$ 1.680/mês** |

A 500 tenants: ~R$ 8k/mês em infra. Margem brutal a partir de 200 pagantes.

---

## Próximas Etapas

1. Configurar `apps/web` Next.js 14
2. Configurar Supabase + aplicar migrations
3. Implementar Auth (NextAuth)
4. Implementar layout base + design tokens
5. Implementar CRUD Clientes
6. Implementar Processos com DataJud
7. Implementar Peças com IA
8. Beta com 50 advogados
