# JURIS-FLOW — Catálogo de Peças com IA

> 47 peças prontas. Cada uma com: tipo, fundamentação legal, variáveis de entrada, modelo de IA, custo médio, tempo de geração.

---

## CÍVEL ESTRATÉGICO

### 01 — Petição Inicial Cível
- **Modelo:** Sonnet 4.5 (high reasoning)
- **Schema Zod:** partes (PF/PJ), fato, direito (teses), pedidos (lista), valor, prova pré-constituída, tutela (urgência/evidência), comarca
- **Custo médio:** R$ 0,40
- **Tempo:** 25-40s
- **Fundamentação:** CPC 318-321, CDC conforme aplicável
- **Jurisprudência injetada:** súmulas + 3 acórdãos recentes da área
- **Tom:** persuasivo, organizado em tópicos (tópico frasal)
- **Skill equivalente interna:** `peticao-inicial-civel` + `contestacao-civel` (réplica)

### 02 — Contestação
- **Modelo:** Sonnet 4.5
- **Schema:** preliminares (CPC 337 — 14 hipóteses checkbox), impugnação ESPECÍFICA (CPC 341), mérito, reconvenção (CPC 343)
- **Custo médio:** R$ 0,60 (peça longa)
- **Tempo:** 30-60s

### 03 — Réplica
- **Modelo:** Sonnet 4.5
- **Schema:** refutar preliminares, refutar argumentação
- **Custo:** R$ 0,45

### 04 — Apelação
- **Modelo:** Sonnet 4.5
- **Schema:** fundamentos sentença, error in procedendo, error in judicando, pedido
- **Skill interna:** `apelacao-civel`

### 05 — Contrarrazões de Apelação
- **Modelo:** Sonnet 4.5
- **Schema:** preliminar (não conhecimento), refutação ponto-a-ponto

### 06 — Agravo de Instrumento
- **Modelo:** Sonnet 4.5
- **Schema:** decisão atacada, fundamento do recurso, pedido efeito suspensivo
- **Skill interna:** `agravo-instrumento`

### 07 — Agravo Interno
- **Modelo:** Sonnet 4.5
- **Schema:** decisão monocrática, refutação, pedido colegiado

### 08 — Embargos de Declaração
- **Modelo:** Sonnet 4.5
- **Schema:** omissão, contradição, obscuridade, obscuridade
- **Skill:** `embargos-de-declaracao`

### 09 — Cumprimento de Sentença
- **Modelo:** Sonnet 4.5 (alta raciocínio)
- **Schema:** título executivo, valor devido (com cálculo), SISBAJUD pedido, intimação prévia 15d
- **Skill:** `cumprimento-sentenca`

### 10 — Impugnação ao Cumprimento
- **Modelo:** Sonnet 4.5
- **Schema:** matéria defesa CPC 525 §1º, excesso cálculo
- **Skill:** `impugnacao-cumprimento-sentenca`

### 11 — Recurso Especial
- **Modelo:** Opus 4.7 (matéria de tribunal superior exige máxima qualidade)
- **Schema:** prequestionamento, violação art. art., divergência, repercussão
- **Skill:** `recurso-especial-criminal` (variação cível)

### 12 — Recurso Extraordinário
- **Modelo:** Opus 4.7
- **Schema:** CF art., repercussão geral, opposing

### 13 — Embargos Infringentes
- **Modelo:** Sonnet 4.5
- **Schema:** voto vencido, tese

---

## TRABALHISTA

### 14 — Reclamação Trabalhista
- **Modelo:** Sonnet 4.5
- **Schema:** pedido LÍQUIDO (CLT 840 §1º — Lei 13.467), verbas, médias, cálculo
- **Skill:** `reclamacao-trabalhista-inicial`
- **Cálculo integrado** com calculadora TRCT automaticamente

### 15 — Contestação Trabalhista
- **Modelo:** Sonnet 4.5
- **Schema:** preliminares, impugnação específica, pasta funcional (5 anos)
- **Skill:** `defesa-trabalhista-empregador`

### 16 — Recurso Ordinário Trabalhista
- **Modelo:** Sonnet 4.5
- **Schema:** sentença, error, pedido

### 17 — Recurso de Revista Trabalhista
- **Modelo:** Opus 4.7
- **Schema:** TST OJ/Súmula, transcendência (Lei 13.467)

### 18 — Agravo de Petição Trabalhista
- **Modelo:** Sonnet 4.5

### 19 — Agravo de Instrumento Trabalhista
- **Modelo:** Sonnet 4.5

### 20 — Embargos à Execução Fiscal Trabalhista
- **Modelo:** Sonnet 4.5

### 21 — Ação Anulatória de Auto de Infração Trabalhista
- **Modelo:** Opus 4.7

---

## CRIMINAL

### 22 — Resposta à Acusação
- **Modelo:** Opus 4.7 (alta stakes)
- **Schema:** preliminares CPP 395, absolvição sumária CPP 397, teses
- **Skill:** `defesa-criminal-resposta-acusacao`

### 23 — Alegações Finais Orais (Memoriais)
- **Modelo:** Sonnet 4.5
- **Schema:** teses, dosimetria se condenatória
- **Skill:** `memoriais`

### 24 — Apelação Criminal
- **Modelo:** Opus 4.7
- **Schema:** errors in procedendo / judicando
- **Skill:** `apelacao` (criminal)

### 25 — Habeas Corpus
- **Modelo:** Opus 4.7 (liberdade exige precisão)
- **Schema:** CPP 648 hipóteses, HC preventivo/liberatório
- **Skill:** `habeas-corpus`

### 26 — Recurso em Sentido Estrito (RSE)
- **Modelo:** Sonnet 4.5
- **Schema:** decisões interlocutórias CPP 581

### 27 — Mandado de Segurança Criminal
- **Modelo:** Sonnet 4.5
- **Schema:** direito líquido, ato coator

### 28 — Queixa-Crime
- **Modelo:** Sonnet 4.5
- **Schema:** fato, qualificação, provas
- **Skill:** `queixa-crime`

### 29 — Defesa no Inquérito Policial
- **Modelo:** Sonnet 4.5
- **Schema:** tese defensiva, requerimento diligência
- **Skill:** `defesa-no-inquerito`

### 30 — Assistência de Acusação
- **Modelo:** Sonnet 4.5
- **Schema:** qualidade, ato, provas

---

## FAMÍLIA E SUCESSÕES

### 31 — Petição de Alimentos Inicial
- **Modelo:** Sonnet 4.5
- **Schema:** partes, grau parentesco, binômio necessidade × possibilidade, provas
- **Skill:** `acao-alimentos`
- **Tutela urgência** alimentos provisórios Lei 5.478/68 art. 4º

### 32 — Ação de Divórcio Litigioso
- **Modelo:** Sonnet 4.5
- **Schema:** separação de fato, guarda, alimentos, partilha
- **Skill:** `divorcio-litigioso`

### 33 — Ação de Divórcio Consensual (Petição Judicial)
- **Modelo:** Sonnet 4.5
- **Skill:** `divorcio-consensual`

### 34 — Guarda Compartilhada — Petição
- **Modelo:** Sonnet 4.5
- **Schema:** partes, plano de convivência detalhado
- **Skill:** `guarda-compartilhada`

### 35 — Inventário Extrajudicial (Escritura)
- **Modelo:** Sonnet 4.5
- **Schema:** herdeiros, bens, ITCMD
- **Skill:** `inventario-extrajudicial`

### 36 — Usucapião Extrajudicial
- **Modelo:** Sonnet 4.5
- **Schema:** posse, tempo, modalidade, ata notarial
- **Skill:** `usucapiao-extrajudicial`

---

## EMPRESARIAL

### 37 — Contrato Social LTDA (Elaboração)
- **Modelo:** Sonnet 4.5
- **Schema:** sócios, capital, quotas, administração
- **Skill:** `contrato-social-elaboracao`

### 38 — Alteração Contratual LTDA
- **Modelo:** Sonnet 4.5
- **Schema:** tipo (cessão, capital, administração), deliberação

### 39 — Acordo de Acionistas / Quotistas
- **Modelo:** Sonnet 4.5
- **Schema:** bloco, voto em conjunto, tag/drag, vesting
- **Skill:** `acordo-acionistas`

### 40 — Contrato de Prestação de Serviços
- **Modelo:** Sonnet 4.5
- **Schema:** partes, objeto, prazo, remuneração, IP
- **Skill:** `minuta-contrato-servicos`

### 41 — Distrato Social
- **Modelo:** Sonnet 4.5

### 42 — Recuperação Judicial Inicial
- **Modelo:** Opus 4.7 (alta complexidade)
- **Schema:** requisitos art. 48 LREF
- **Skill:** `recuperacao-judicial-empresarial`

---

## CONSUMIDOR

### 43 — Ação contra Prática Abusiva (CDC)
- **Modelo:** Sonnet 4.5
- **Schema:** prática, nulidade cláusula, danos
- **Skill:** `acao-cdc-pratica-abusiva`

---

## TRIBUTÁRIO

### 44 — Mandado de Segurança Tributário
- **Modelo:** Sonnet 4.5
- **Schema:** autoridade coatora, direito líquido, prova pré-constituída
- **Skill:** `mandado-seguranca-tributario`

### 45 — Embargos à Execução Fiscal
- **Modelo:** Sonnet 4.5
- **Schema:** vícios CDA, decadência, prescrição, parcelamento
- **Skill:** `embargos-execucao-fiscal`

---

## PREVIDENCIÁRIO

### 46 — Petição Inicial — Aposentadoria por Tempo de Contribuição
- **Modelo:** Sonnet 4.5
- **Schema:** regra de transição, cálculo, RGPS-RPPS
- **Skill:** `aposentadoria-tempo-contribuicao`

### 47 — Recurso — Auxílio-Doença / Incapacidade
- **Modelo:** Sonnet 4.5
- **Schema:** perícia, fundamentação médica
- **Skill:** `auxilio-doenca-recurso`

### 48 — Petição BPC-LOAS
- **Modelo:** Sonnet 4.5
- **Skill:** `bpc-loas`

---

## CONTRATOS & DOCUMENTOS

### 49 — Contrato de Honorários Advocatícios
- **Modelo:** Sonnet 4.5
- **Schema:** tipo (fixo/êxito/mensal), valor, condições

### 50 — Procuração Ad Judicia et Extra
- **Modelo:** Haiku (curta, baixo custo)
- **Schema:** outorgante, outorgado, poderes (CPC 105)
- **Skill:** `procuracao`

### 51 — Declaração de Hipossuficiência
- **Modelo:** Haiku
- **Skill:** anexo CPC 99

### 52 — Termo de Ciência LGPD
- **Modelo:** Haiku

### 53 — Notificação Extrajudicial
- **Modelo:** Sonnet 4.5
- **Schema:** notificado, fato, prazo, fundamentação legal

### 54 — Parecer Jurídico
- **Modelo:** Opus 4.7 (máxima qualidade em parecer)
- **Schema:** consulta, fatos, análise, conclusão
- **Skill:** `parecer-juridico`

---

## Geração e Custos

### Tabela de Custos (referência Anthropic Claude)
| Modelo | Input $/M tokens | Output $/M tokens | Peça típica (R$) |
|---|---|---|---|
| Opus 4.7 | $15 | $75 | R$ 0,50-1,20 |
| Sonnet 4.5 | $3 | $15 | R$ 0,15-0,60 |
| Haiku 4.5 | $0,80 | $4 | R$ 0,02-0,08 |

### Sistema de Roteamento de Modelo

```typescript
// lib/ai/router.ts
export function routeModelByPieceType(
  type: PieceType,
  userPlan: Plan
): string {
  // Elite → Opus sempre em peças complexas
  if (userPlan === 'ELITE') {
    if (['PETICAO_INICIAL_TRIBUNAIS', 'OPINIAO_JURIDICA', ...].includes(type)) {
      return 'claude-opus-4-8';
    }
  }

  // Peças criminais complexas: Opus
  if (PIECES_CRIMINAIS_COMPLEXAS.includes(type)) {
    return 'claude-opus-4-8';
  }

  // Documentos simples: Haiku
  if (PIECES_ADMINISTRATIVAS.includes(type)) {
    return 'claude-haiku-4-5-20251001';
  }

  // Padrão: Sonnet
  return 'claude-sonnet-5';
}
```

### Contexto Jurídico Injetado (RAG)

Antes de gerar, é feita busca vetorial em `knowledge_documents`:

1. **Súmulas** da área + tribunal da comarca
2. **Teses vinculantes** aplicáveis (Temas STF/STJ)
3. **Acórdãos recentes** (últimos 12m) do tribunal onde a peça será protocolada
4. **Modelos internos** do escritório (se houver)
5. **Doutrina** se activated no plano (Elite: 5+ livros por área)

Top-K = 12, threshold = 0.78. Re-rank com Claude Sonnet.

---

## Pipeline Geração

```
1. User seleciona tipo + preenche schema
    ↓
2. tRPC mutation: pieces.generate({ type, caseId, inputs })
    ↓
3. Inngest job dispatched (workflow/queue)
    ↓
4. Job: fetch contexto via RAG (12 docs)
    ↓
5. Job: build prompt com system + user + contexto
    ↓
6. Job: streamed Anthropic Messages API
    ↓
7. SSE channel: tokens → frontend
    ↓
8. Job: save em documents com status='DRAFT'
    ↓
9. User revisa no TipTap
    ↓
10. User aprova → status='APPROVED' → export
```
