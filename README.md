# ⚖️ Juris-Flow

> **O software jurídico brasileiro que entende do Direito — não só de softwares.**
> _Advogado no tempo. Cliente no centro._

---

## 🎯 Status: Sprint 0 — Fundação

**Entregue neste sprint:** monorepo · design system · auth · schema DB · layout base · landing page · CI/CD.
**Próximo sprint (S1):** Clientes + Dashboard populado.

---

## 📁 Estrutura do Monorepo

```
juris-flow/
├── apps/
│   └── web/                           # Next.js 14 — landing + app autenticado
│       ├── app/
│       │   ├── (app)/                 # Rotas autenticadas (Sidebar + Topbar)
│       │   ├── (public)/              # Landing, pricing
│       │   ├── api/auth/              # NextAuth handlers
│       │   ├── api/signup/            # Cadastro (cria Tenant + User)
│       │   ├── login/
│       │   ├── signup/
│       │   ├── privacidade/           # Política de privacidade (LGPD)
│       │   └── page.tsx               # Landing page
│       ├── lib/auth.ts                # Config NextAuth v5
│       ├── middleware.ts              # Edge auth guard
│       └── tailwind.config.ts
├── packages/
│   ├── ai/                            # Anthropic SDK + roteador de modelos
│   │   ├── client.ts                  # Singleton Anthropic + pricing
│   │   ├── router.ts                  # Roteamento por tipo de peça
│   │   └── generate.ts                # Streaming de peças
│   ├── auth/                          # RBAC + helpers de senha
│   │   ├── password.ts                # bcrypt + política de senha
│   │   └── rbac.ts                    # Matriz de capabilities
│   ├── config/                        # Validação Zod de env vars
│   ├── db/                            # Prisma
│   │   ├── prisma/schema.prisma       # 5 entidades core + auth + LGPD
│   │   └── src/seed.ts                # Seed para dev
│   ├── types/                         # Tipos compartilhados (vazio nesta sprint)
│   └── ui/                            # Componentes shadcn-style
│       ├── button · card · badge · avatar · input · logo
│       └── lib/utils.ts               # cn() helper
└── docs/                              # Documentação completa
    ├── 00-PRODUTO.md                  # PRD
    ├── 01-SCHEMA.md                   # Schema DB completo (15+ entidades)
    ├── 02-MODULOS.md                  # 15 módulos detalhados
    ├── 03-PECAS-CATALOG.md            # 47 peças jurídicas
    ├── 04-DESIGN-SYSTEM.md            # Tokens, paleta, componentes
    ├── 05-ARQUITETURA.md              # Stack + 8 ADRs
    ├── 06-IA.md                       # Stack IA + RAG
    ├── 07-PAGAMENTOS.md               # Asaas + réguas
    ├── 08-GTM.md                      # Marketing + vendas
    └── 09-ROADMAP.md                  # 9 sprints
```

---

## 🚀 Quick Start

### 0. Pré-requisitos

```bash
node --version  # >= 20
npm --version   # >= 10
```

### 1. Instalar dependências

```bash
cd "C:/Users/davi9/projects/juris-flow"
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite .env e preencha ao menos:
#   DATABASE_URL
#   DIRECT_URL
#   AUTH_SECRET  (gere com: openssl rand -base64 32)
#   ANTHROPIC_API_KEY
```

### 3. Setup Supabase (ou Postgres local)

1. Crie projeto em [supabase.com](https://supabase.com)
2. Vá em **Settings → Database**
3. Copie **Connection string (pooling)** para `DATABASE_URL`
4. Copie **Connection string (direct)** para `DIRECT_URL`
5. Habilite a extensão `vector` em **Database → Extensions**

### 4. Rodar migrations + seed

```bash
npm run db:generate
npm run db:migrate    # cria tabelas
npm run db:seed       # popula com dados de demo
```

### 5. Subir dev server

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

**Credenciais seed (já criadas pelo `db:seed`):**
- Owner: `[email protected]` · senha `Tamp@221122`
- Assistente: `[email protected]` · senha `Tamp@221122`

---

## 🧪 Verificações locais (CI)

```bash
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run format         # Prettier
```

---

## 🔐 Segurança & LGPD

### Implementado no Sprint 0
- ✅ Multi-tenant isolation (tenantId em todas as tabelas de negócio)
- ✅ Senha com bcrypt (12 rounds) + política mínima (8 chars, maiúsc/minúsc/número)
- ✅ JWT com `tenantId` + `role` no token
- ✅ LGPD consent gravado em `lgpd_consents` no signup
- ✅ Audit log em `audit_logs` para ações sensíveis
- ✅ Soft delete (`deletedAt`)
- ✅ Página `/privacidade` (art. 9º LGPD)
- ✅ Middleware edge para forçar login em rotas protegidas
- ✅ Rate limiting previsto (futuro: Upstash Redis)

### Próximos passos (Sprint 1+)
- [ ] MFA obrigatório para advogados (Google Authenticator)
- [ ] LGPD export/deleção por titular (art. 18)
- [ ] RLS no Supabase como camada adicional
- [ ] Criptografia de campos sensíveis (CPF/CNPJ)

---

## 📦 Stack Tecnológico

| Camada | Tech |
|---|---|
| Framework | **Next.js 14** (App Router) + **React 19** + TypeScript strict |
| UI | **Tailwind 3** + shadcn-style (componentes próprios em `packages/ui`) |
| Auth | **NextAuth v5** (Auth.js) com Credentials + Google OAuth |
| Banco | **PostgreSQL 16** (Supabase) + **Prisma** + PGVector |
| Forms | React Hook Form + Zod |
| Validação env | Zod (via `@juris-flow/config`) |
| IA | **Anthropic Claude** (Opus 4.8 / Sonnet 5 / Haiku 4.5) com streaming |
| Pagamentos | **Asaas** (Sprint 6) |
| Email | **Resend** |
| Storage | **Cloudflare R2** |
| Hospedagem | **Vercel** (free tier → pro 100) |
| CI | GitHub Actions |
| Observabilidade | Sentry + PostHog + Plausible (LGPD-safe) |

---

## 🗺️ Roadmap (do MVP ao público)

| Sprint | Foco | Status |
|---|---|---|
| **S0** | Fundação (monorepo, auth, schema, layout) | ✅ **CONCLUÍDO** |
| **S1** | Clientes + Dashboard populado | ⏳ próximo |
| **S2** | Processos + integração DataJud | ⏳ |
| **S3** | Tarefas + Agenda | ⏳ |
| **S4** | IA Peças V1 (15 peças prioritárias) | ⏳ |
| **S5** | Calculadoras + Monitor DJEN | ⏳ |
| **S6** | Beta privado + Asaas | ⏳ |
| **S7** | Launch público + marketing | ⏳ |
| **S8** | Multi-usuário (RBAC completo) | ⏳ |
| **S9** | +32 peças + PR + Press release | ⏳ |

Veja [docs/09-ROADMAP.md](docs/09-ROADMAP.md) para detalhes completos.

---

## 🧱 Decisões Arquiteturais Chave

| ADR | Decisão |
|---|---|
| 001 | Next.js App Router (RSC + Route Handlers) |
| 002 | tRPC para API interna tipada |
| 003 | Prisma + RLS no DB (defense-in-depth) |
| 004 | Supabase (realtime + storage + RLS nativos) |
| 005 | Inngest para workflows async (Sprint 4+) |
| 006 | Asaas BR-first (PIX + Boleto + Cartão) |
| 007 | Anthropic Claude (Opus/Sonnet/Haiku por caso de uso) |
| 008 | Postgres full-text + Meilisearch (Sprint 5+) |

Veja [docs/05-ARQUITETURA.md](docs/05-ARQUITETURA.md) para ADRs completos.

---

## 📝 Notas de Compliance

### OAB
- Toda peça gerada por IA **terá** banner "Documento gerado por IA. Revisão humana obrigatória." (Código de Ética art. 1º).
- IA é treinada para **não prometer resultado** nem fazer juízo moral do juiz.
- Citações são verificadas antes de a peça finalizar (Sprint 4).

### LGPD
- Privacy-by-Design desde o MVP.
- Consentimento explícito no signup (art. 7º V).
- DPO interno: Ana Pereira.
- PII em repouso encriptado em produção (Sprint 3+).
- Retenção: 5 anos após encerramento (Provimento OAB 188/2018).

---

## 🤝 Contribuindo

Por enquanto: single dev (Ana). Time escalará a partir de Seed funding (Mês 12).

Convenção de commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).

---

## 📄 Licença

Proprietário — Juris-Flow © 2026. Todos os direitos reservados.

---

## 🎯 Próximos Passos Imediatos

1. **Provisionar Supabase** (criar projeto, copiar URLs)
2. **Rodar `npm install`**
3. **Criar `.env`** com credenciais
4. **Rodar migrations + seed**
5. **Subir `npm run dev`** e verificar localhost:3000
6. **Logar com `[email protected]` / `Tamp@221122`** e explorar o dashboard
7. **Iniciar Sprint 1** (Clientes + CRM)
