# JURIS-FLOW — Roadmap de Implementação

> 9 sprints de 2 semanas. Meta: MVP público em 18 semanas (4-5 meses).

---

## Time Inicial

| Função | Qtd |
|---|---|
| Engenheiro Full-Stack Sênior (Next.js) | 2 |
| Engenheiro Backend (DataJud, IA) | 1 |
| Designer UX/UI (sênior) | 1 |
| PM (Ana) | 1 |
| Growth/Marketing | 1 |

**Custo mensal:** ~R$ 95k (CLT) ou ~R$ 60k (PJ)

---

## Estrutura do Roadmap

### Sprints de 2 semanas
- Planning no começo (segunda)
- Daily 15min
- Review + Retro sexta da 2ª semana
- Demo na sexta da 2ª semana (com stakeholders)

### Definition of Done
- Code merged + PR reviewed
- Type checks passing
- Lint passing
- Tests written (where business-critical)
- QA manual + smoke
- Deployed to staging
- Documentation updated

---

## SPRINT 0 — Fundação (Pré-MVP)

**Duração:** Semanas -2 a 0 (4 semanas)
**Status:** fazer ANTES do MVP

### Semana -2: Setup
- [ ] Repo Monorepo (Turborepo) com `apps/web`, `apps/worker`, `packages/db`, `packages/ui`, `packages/ai`
- [ ] Next.js 14 + TypeScript + Tailwind 4 + shadcn/ui inicializado
- [ ] Supabase project criado (PostgreSQL 16 + RLS + PGVector)
- [ ] Vercel project criado + CI GitHub Actions
- [ ] Inngest account + dev environment
- [ ] Domínio juris-flow.com.br + DNS
- [ ] NextAuth v5 + OAuth providers (Google, GitHub dev)
- [ ] Logging (Pino) + Sentry
- [ ] CI básico: typecheck, lint, test

### Semana -1: Design System
- [ ] Tokens (cores, tipo, espaçamento)
- [ ] Componentes base: Button, Card, Input, Badge, Dialog, Drawer
- [ ] Layout shell (Sidebar + Topbar)
- [ ] 5 páginas básicas (Login, Signup, Dashboard vazio)
- [ ] Storybook rodando

### Semana 0: Schema DB + Auth
- [ ] Prisma schema completa (10 entidades core)
- [ ] Migrations + seed (1 tenant demo + 5 users)
- [ ] Auth flow: signup, login, logout, MFA TOTP
- [ ] Tenant context (multi-tenant isolation)
- [ ] Audit log + LGPD consent

**Entregável S0:** App autenticável, schema DB, deploy CI/CD.

---

## SPRINT 1 — CRM Clientes + Layout Base (MVP parte 1)

**Duração:** Semanas 1-2 (10 dias úteis)

### Épicos
- **E1.1** — Signup + Onboarding (5 steps)
- **E1.2** — Dashboard mínimo (cards KPI + lista próximas tarefas)
- **E1.3** — CRUD completo de Pessoas (PF/PJ)
- **E1.4** — CRUD completo de Clientes

### Tasks
- [ ] Signup com email/senha + Google OAuth
- [ ] Wizard onboarding 5 steps (perfil, OAB, áreas, casos típicos, trial)
- [ ] Layout (Sidebar, Topbar, Avatar, Notifications)
- [ ] Dashboard: 4 KPI cards + widget "tarefas pendentes"
- [ ] Tabela de clientes com filtros
- [ ] Drawer de detalhe do cliente
- [ ] Form cliente (React Hook Form + Zod)
- [ ] LGPD: exportar dados, request deletar
- [ ] Audit log em CRUD
- [ ] Empty states + loading skeletons
- [ ] Toast system (sonner)

### Validação
- Consegue cadastrar 10 clientes sem erro
- Filtros funcionam
- RLS bloqueia acesso cross-tenant
- LGPD export retorna todos os dados do titular

### Definition of Ready Sprint 2
- Tipos de caso, peças-modelo e inquéritos integrados ao cliente

---

## SPRINT 2 — Processos + DataJud (MVP parte 2)

**Duração:** Semanas 3-4

### Épicos
- **E2.1** — Cadastro de processos (manual + por CNJ)
- **E2.2** — Integração DataJud (sincronização inicial)
- **E2.3** — Timeline de andamentos
- **E2.4** — Lista de processos com filtros avançados

### Tasks
- [ ] Endpoint `POST /cases` (manual)
- [ ] Endpoint `POST /cases/by-cnj` (puxa DataJud + cria)
- [ ] Tabela de processos + filtros
- [ ] Detalhe do processo (header + sidebar info + tabs)
- [ ] Timeline de andamentos manual
- [ ] Cron `sync-datajud` (24h polling por tenant)
- [ ] Inngest `datajud/full-sync` ao cadastrar novo
- [ ] Vinculação processo ↔ cliente automática (via nome)
- [ ] Tags, área, fase, status
- [ ] Workers pool DataJud com rate-limit

### DataJud
- Mock primeiro (DataJud tem rate-limit e exige chave)
- Implementar retry com exponential backoff
- Cache em Redis (5min TTL)

### Validação
- Cadastra processo por CNJ e sistema puxa em < 3s
- Sincronização noturna atualiza status

---

## SPRINT 3 — Tarefas + Agenda (MVP parte 3)

**Duração:** Semanas 5-6

### Épicos
- **E3.1** — Kanban tarefas
- **E3.2** — Agenda (calendário mês/semana/dia)
- **E3.3** — Notificações in-app
- **E3.4** — Email reminder básico

### Tasks
- [ ] Modelo `tasks` com full CRUD
- [ ] Drag-and-drop Kanban (5 colunas)
- [ ] Toggle Kanban/Lista
- [ ] Filtros: prioridade, responsável, caso, tag
- [ ] Eventos calendário (audiences, prazos, tarefas)
- [ ] Visualização mês/semana/dia
- [ ] Notificações in-app persistidas em DB
- [ ] Bell icon + popover de não-lidas
- [ ] Settings de notificações por tipo

### Validação
- 50 tarefas em kanban com drag fluido
- Calendário renderiza 50 eventos sem lag

---

## SPRINT 4 — IA Peças V1 (MVP parte 4) — **MARCO**

**Duração:** Semanas 7-8

### Épicos
- **E4.1** — Catálogo de peças (15 prioritárias)
- **E4.2** — Geração de peça com streaming
- **E4.3** — Editor TipTap
- **E4.4** — Export PDF/DOCX

### Tasks
- [ ] Catálogo com 15 peças: inicial, contestação, réplica, apelação, contrarrazões, agravo, embargos declaração, contestação trabalhista, reclamação, recurso ordinário TRAB, habeas corpus, resposta acusação, procuração, contrato honorários, notificação
- [ ] Cada peça: schema Zod + system prompt + few-shot examples
- [ ] Pipeline: form → RAG → Claude → streaming
- [ ] Editor TipTap com toolbar
- [ ] Inline AI: "reescrever este parágrafo"
- [ ] Export DOCX + PDF (via react-pdf)
- [ ] Versionamento (a cada save)
- [ ] Sistema de credits (metering)
- [ ] Limite por plano (FREE: 2/mês, ESSENTIAL: 20/mês, PRO: ∞)

### Validação
- Paga integração cível gerada em < 40s
- Citações verificadas no banner
- Export PDF mantém formatação

---

## SPRINT 5 — Calculadoras + DJEN V1

**Duração:** Semanas 9-10

### Épicos
- **E5.1** — Calculadoras V1 (4 peças-chave)
- **E5.2** — DJEN Push (webhook CNJ)
- **E5.3** — Inbox de publicações

### Tasks
- [ ] Calculadora TRCT (com motivo rescisão)
- [ ] Calculadora Atualização SELIC
- [ ] Calculadora Pensão Alimentícia (binômio)
- [ ] Calculadora Prescrição
- [ ] Sistema de formulários com auto-detect
- [ ] Export PDF (memória cálculo)
- [ ] DJEN: configurar webhooks da API oficial CNJ
- [ ] Inbox de publicações (today, unread, fatal)
- [ ] AI Triage de publicações (resumo + tipo + prazo)
- [ ] Match por nº processo + OAB
- [ ] Vincular publicação ao processo

### Validação
- TRCT confere com cálculo de escritório
- Publicação DJEN chega em < 5 min do oficial
- Match por OAB funciona (monitor cadastrado)

---

## SPRINT 6 — Polimento + ASAAS + Beta Privado

**Duração:** Semanas 11-12

### Épicos
- **E6.1** — Billing Asaas
- **E6.2** — UX polish
- **E6.3** — Beta privado (50 advogados)
- **E6.4** — Documentação + LGPD

### Tasks
- [ ] Asaas integration: signup Pro, plano anual, webhook
- [ ] UI pricing + checkout
- [ ] Régua cobrança interna (trial → pago)
- [ ] Auditoria LGPD completa
- [ ] Privacy Policy + Terms
- [ ] Carregamento inicial e tempo de resposta < 1s
- [ ] Bug bash + fixes
- [ ] Beta privado: 50 advogados convidados via OAB networks

### Validação
- Beta ativos: 50+ advogados usando diariamente
- NPS dos betas > 40
- 10+ bugs críticos corrigidos

---

## SPRINT 7 — Launch Público + Marketing Site

**Duração:** Semanas 13-14

### Épicos
- **E7.1** — Landing page + pricing page
- **E7.2** — Blog MDX
- **E7.3** — Calculadoras gratuitas (lead magnets)
- **E7.4** — Email nurture
- **E7.5** — Ad campaigns

### Tasks
- [ ] LP juris-flow.com.br com mockup + social proof
- [ ] Pricing page com toggle mensal/anual
- [ ] Blog com 10 posts iniciais
- [ ] 4 calculadoras online gratuitas (sem signup)
- [ ] Sistema de captura lead (Loops)
- [ ] Email welcome + nurture 14 dias
- [ ] Pixel Meta + Google Ads
- [ ] Sitemap + SEO básico
- [ ] Open Graph images dinâmicos

### Validação
- LP testada com 100 visitas: conv. signup > 3%

---

## SPRINT 8 — Elite Features + Refinamento

**Duração:** Semanas 15-16

### Épicos
- **E8.1** — Multi-usuário (RBAC)
- **E8.2** — Mobile PWA funcional
- **E8.3** — Compliance & Performance
- **E8.4** — Integração Google Calendar

### Tasks
- [ ] RBAC: OWNER, PARTNER, LAWYER, ASSISTANT, READONLY
- [ ] Multi-usuário com convite email
- [ ] PWA: installable + offline básico
- [ ] Otimização performance (LCP, INP)
- [ ] LGPD export + delete completo
- [ ] Backup automated (R2)
- [ ] OAuth Google Calendar
- [ ] Bug fixes do beta

---

## SPRINT 9 — Expansão de Peças + Calculadoras

**Duração:** Semanas 17-18

### Épicos
- **E9.1** — +32 peças (até 47 totais)
- **E9.2** — +12 calculadoras
- **E9.3** — Press release + PR

### Tasks
- [ ] Adicionar 32 peças novas cobrindo todas as áreas
- [ ] Adicionar 12 calculadoras
- [ ] Templates públicos (30 templates prontos)
- [ ] Press release para OAB News, ConJur
- [ ] Webinar de lançamento público

### MARCO FINAL: ProductHunt + comunicação OAB nacional

---

## Pós-MVP — Roadmap Ongoing

### Mês 5-6: GA + Growth
- Growth loops ativos (indicação, content marketing)
- Paid ads escalando
- NPS > 60
- 500 MAU

### Mês 7-9: Refinamento
- AI Revisor (Pro+)
- Multi-modal (PDF + imagem)
- Mobile nativo (iOS, Android)
- Integração WhatsApp oficial
- Backup auto + restore

### Mês 10-12: Expansão
- Marketplace (templates autorais)
- API pública (Elite)
- Webhooks
- White-label para grandes bancas
- Expansão para Portugal

---

## Métricas por Sprint

| Sprint | MAU | Pagantes | MRR | NPS | Bugs críticos |
|---|---|---|---|---|---|
| S0 | 0 | 0 | 0 | — | — |
| S1 | 5 | 0 | 0 | — | — |
| S2 | 10 | 0 | 0 | — | — |
| S3 | 15 | 0 | 0 | — | — |
| S4 | 25 | 0 | 0 | — | — |
| S5 | 35 | 0 | 0 | — | — |
| S6 | 50 (beta) | 5 | R$ 350 | > 30 | < 5 |
| S7 | 200 | 20 | R$ 1.400 | > 40 | < 3 |
| S8 | 500 | 60 | R$ 6.000 | > 50 | < 2 |
| S9 | 1.000 | 150 | R$ 18.000 | > 55 | < 1 |
| **M12** | **8.000** | **1.200** | **R$ 200k** | **> 60** | **< 1** |

---

## Riscos e Mitigações

| Risco | Impacto | Prob | Mitigação |
|---|---|---|---|
| DataJud muda API | Alto | Média | Wrapper dedicado, contratos exemplo, monitor de mudanças |
| Claude alucina citações | Alto | Alta | Sistema verificação + UI warnings + por redação humana |
| Churn alto no mês 1 | Médio | Média | Onboarding killer + checklist 5 passos + suporte humanizado |
| Compliance OAB rígida | Médio | Baixa | Banner "revisão humana obrigatória" + verificador citações |
| Saturação mercado | Médio | Média | Diferencial IA deep + DJEN oficial + preço disruptivo |
| Custo IA cresce com volume | Médio | Alta | Routing por tier + cache agressivo + opção "preview" sem gerar |
| Equipe pequena (devops) | Médio | Média | Serverless (Vercel + Supabase + Inngest) → mínimo ops |

---

## Custos para rodar MVP

### Setup Inicial
- Domínio: R$ 80
- Apple/Google Developer Account (v2): R$ 200
- Logo + brand: R$ 5.000 (freelance designer)
- Boilerplates/licenças: R$ 2.000
- **Total setup:** ~R$ 7.000

### Mensal
| Item | Custo |
|---|---|
| Equipe 6 pessoas (PJ ou CLT) | R$ 95.000 |
| Vercel | R$ 100 |
| Supabase | R$ 130 |
| Anthropic API (100 MAU) | R$ 200 |
| Demais serviços | R$ 600 |
| Marketing ads (mês 1-3 zero, mês 4+) | variável |
| **Total Mensal fixo** | **~R$ 96.000** |

### Break-even
- MRR = Custo mensal
- Se ARPU = R$ 149, precisa ~645 pagantes
- Meta: Mês 8-9 (sprint 9 + 2 meses)

### ROI Esperado Ano 1
- Investimento: R$ 1M (incluindo equipe)
- ARR fim ano 1: ~R$ 2M
- Payback: ~6 meses pós-tração

---

## Comunicação & Cultura

### Daily
- Async written update no Slack (15min max)
- Standup segunda (síncrono) + sexta (síncrono)

### Weekly Demo
- Sexta 16h, 30min
- Mostra features prontas
- Convidados: betas, advogados convidados

### Monthly Review
- Última sexta do mês
- KPIs
- Roadmap adjustment
- Reconhecimento de time

### Cultural Pillars
- **Ship > perfect** — bias para ação
- **Cliente > feature** — se não ajuda cliente, não fazemos
- **Reversible > irreversible** — defaults seguros

---

## Definition of MVP Done (Sprint 9)

- [ ] 100 advogados conseguem cadastrar conta
- [ ] 50 advogados usando ativamente em 7 dias após cadastro
- [ ] NPS > 50
- [ ] 30 peças geradas/dia
- [ ] 200 publicações DJEN processadas/dia
- [ ] 50 cálculos realizados/dia
- [ ] Lighthouse Score > 95
- [ ] Uptime > 99.5%
- [ ] Zero perda de dado em 30 dias
- [ ] Billing Asaas 100% funcional
- [ ] LGPD audit passada
- [ ] Documentação mínima em public.docs
