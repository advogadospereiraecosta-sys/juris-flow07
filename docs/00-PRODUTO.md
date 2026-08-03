# JURIS-FLOW — Visão Geral do Produto

## Tagline
**"Advogado no tempo. Cliente no centro."**

Subtagline: "O software jurídico brasileiro com IA que entende do Direito — não só de softwares."

---

## 1. Problema

Advogados autônomos e pequenos escritórios (1 a 10 advogados) no Brasil sofrem com:

1. **Tempo perdido em tarefas mecânicas** — 4 a 6 horas/semana digitando petições que poderiam ser geradas por IA.
2. **Risco de prazo fatal** — DJEN publica 24h/dia; sem alerta, o advogado perde prazo.
3. **Cálculos imprecisos** — atualização monetária, TRCT, pensão alimentícia: cada um é armadilha.
4. **CRM precário** — leads que entram e somem; sem funil de conversão estruturado.
5. **Custo elevado** — ferramentas como Lawin One, Astrea, Projuris custam R$ 200-500/usuário.

## 2. Solução

**Juris-Flow** unifica em um único SaaS:

- **CRM jurídico** com pipeline Kanban e funil de conversão
- **Gestão de processos** com sync DataJud (CNJ)
- **Gerador de peças** com IA (40+ tipos prontos)
- **Calculadoras** jurídicas fundamentadas (TRCT, atualização, alimentos, prescrição)
- **Monitor DJEN** oficial (API CNJ Res 455/2022) com alertas em tempo real
- **Tarefas e agenda** em Kanban com lembretes automáticos
- **Onboarding + Honorários** com geração automática de contrato + procuração + LGPD

## 3. Mercado

- **TAM Brasil:** ~1,3 milhão de advogados ativos (OAB, 2025)
- **Público-alvo inicial:** autônomos + pequenos escritórios (~600 mil)
- **Concorrentes diretos:** Lawin One, Astrea, Projuris, ADVBOX, Legal One
- **Diferencial Juris-Flow:** IA jurídica brasileira mais profunda, monitoramento oficial DJEN, preço 40% menor

## 4. Modelo de Negócio

### Pricing

| Plano | Preço/mês | Usuários | Features |
|---|---|---|---|
| **Free** | R$ 0 | 1 | Até 5 processos, 3 leads, 2 peças/IA/mês, sem DJEN |
| **Essencial** | R$ 69 | 1 | Ilimitado processos/leads, 20 peças IA/mês, 1 calculadora, **DJEN incluído** |
| **Pro** ⭐ | R$ 149 | até 3 | Tudo Essencial + peças IA ilimitadas, todas calculadoras, multi-usuário, marca branca |
| **Elite** | R$ 329 | até 10 | Tudo Pro + IA Opus, suporte prioridade, API, integrações tribunais premium |

**Annual com 20% off.** Cancelamento direto no painel.

### Unit Economics

- CAC alvo: R$ 80 (via marketing de conteúdo + ADS OAB)
- LTV alvo: R$ 1.788 (Pro: R$ 149 × 12)
- Payback: ~6 meses
- Churn alvo mês 1: < 8%
- Churn alvo mês 12: < 3%

## 5. Stack Técnico

```
Frontend: Next.js 14 (App Router) + React 19 + Tailwind 4 + shadcn/ui + TanStack Query
Backend: Next.js Route Handlers + tRPC + Zod
DB: Supabase PostgreSQL + Prisma + PGVector
Auth: NextAuth (Auth.js v5) + OAuth OAB + MFA TOTP
IA: Anthropic Claude API (Opus, Sonnet, Haiku) — conforme skill
Pagamentos: Asaas (PIX, boleto, cartão recorrente)
Tribunais: DataJud API (CNJ Res 331/2020) + DJEN API (Res 455/2022)
Storage: Cloudflare R2 (peças em DOCX/PDF) + Supabase Storage (avatares)
Email/WhatsApp: Resend + Z-API ou Twilio
Analytics: PostHog + Plausible (LGPD-safe)
Error: Sentry + OpenTelemetry
Jobs: Inngest (workflow async — sync DataJud, geração IA)
Deploy: Vercel (frontend + edge) + Railway (workers IA pesados)
```

## 6. Compliance

- **LGPD:** Privacy by Design, DPO interno, RIPD por feature
- **OAB:** Conformidade com Código de Ética (não promete resultado, sempre revisão humana)
- **LGPD art. 46-47:** Criptografia em repouso (AES-256) e trânsito (TLS 1.3)
- **MFA:** Obrigatório para advogados; opcional para assistentes
- **Backup:** 3-2-1 rule, restore test mensal
- **Certificação:** Buscar ISO 27001 até mês 18

## 7. Roadmap de Lançamento

| Marco | Data | O que |
|---|---|---|
| **Beta privado** | Mês 3 | 50 advogados convidados (rede OAB) |
| **Lançamento público** | Mês 5 | LP no-ar, Produto Hunt BR, ads OAB |
| **Break-even** | Mês 10 | 500 pagantes |
| **Seed** | Mês 12 | R$ 2M para escalar ads + contratar 2 devs |
| **Series A** | Mês 24 | 5k pagantes, R$ 8M ARR, entrar em SP/RJ |

## 8. Métricas de Sucesso (KPIs)

| Métrica | Meta Mês 6 | Meta Mês 12 |
|---|---|---|
| **MAU** | 1.500 | 8.000 |
| **Pagantes** | 200 | 1.200 |
| **ARR** | R$ 240k | R$ 1,6M |
| **NPS** | > 50 | > 60 |
| **Churn mensal** | < 5% | < 3% |
| **Peças geradas/dia** | 800 | 5.000 |
| **Alertas DJEN/dia** | 3.000 | 18.000 |

## 9. Por que Juris-Flow vence

1. **IA jurídica brasileira mais profunda** — não é wrapper de ChatGPT; temos 40+ peças com fundamentação técnica + calculadoras com binômio alimentar + monitoramento oficial
2. **Preço disruptivo** — 40% abaixo da média do mercado
3. **DJEN nativo** — única plataforma com push oficial em tempo real (CNJ Res 455/2022)
4. **Onboarding completo** — gera contrato, procuração, LGPD em 5 minutos
5. **LGPD-first** — único com certificação em privacidade desde o MVP
