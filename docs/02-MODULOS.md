# JURIS-FLOW — Especificação de Módulos

> Cada módulo é uma área vertical do SaaS. Documento vivo — atualizado a cada sprint.

---

## M01 — Dashboard / Início

### Propósito
Página inicial pós-login. Resumo executivo do escritório.

### Layout
- **Topbar** (h=64, fixa): logo + busca global + notifications bell + user avatar
- **Sidebar** (w=240, colapsável para 64): menu principal
- **Main content** (grid 12col):
  - **Hero bloco**: saudação personalizada ("Bom dia, Dra. Ana") + nº processos ativos + próximas audiências (próximos 7 dias)
  - **Cards KPI 4x** (h=120):
    - Processos ativos
    - Leads novos (7d)
    - Tarefas pendentes
    - Faturas em atraso (R$)
  - **2/3 col — Próximos prazos** (tabela):
    - Processo · Cliente · Movimento · Dias restantes · Ação
  - **2/3 col — Andamentos recentes** (timeline):
    - Hora · Processo · Movimento · (botão "Ver")
  - **1/3 col — Resumo financeiro**:
    - MRR do escritório · Recebido mês · Pendente · Inadimplência %
  - **1/3 col — Atividade do dia**:
    - Tarefas do dia (checklist) · Audiências

### Componentes
- `KpiCard` com sparkline
- `DeadlineTable` ordenável
- `FinancialWidget` com barra de aging
- `TaskChecklist` com drag-handle
- `Empty state` com ilustração SVG inline

### Dados
- Server component, fetch via tRPC
- Cache: 30s ISR + invalidation on mutations

---

## M02 — Clientes (CRM Pessoas)

### Propósito
Cadastro PF/PJ de clientes, partes, testemunhas, terceiros.

### Layout
- **Header**: título + busca + botão "Novo cliente"
- **Filtros laterais**: tipo (PF/PJ), status (ativo/inativo), tags, comarca
- **Tabela**: Nome · Tipo · CPF/CNPJ · Email · Telefone · Processos · Última interação · Ações
- **Bulk actions**: exportar CSV, importar, adicionar tag

### Detalhe (Drawer 70% width)
- **Tabs**: Visão geral · Processos · Documentos · Financeiro · Histórico · Notas
- **Cabeçalho**:
  - Avatar + Nome + badges (tipo, OAB se for advogado)
  - Botões: "Novo processo" · "Enviar mensagem" · "Editar"
- **Cards**:
  - **Card 1 — Identificação**: CPF/CNPJ, RG/IE, email, telefones, endereço completo
  - **Card 2 — Contratos ativos**: tabela com honorários vincendos
  - **Card 3 — Última interação**: WhatsApp email
  - **Card 4 — Tags**: chips editáveis

### Ações
- Importar CSV (com mapeamento colunas → person)
- LGPD: exportar dados do titular (art. 18 V)
- LGPD: deletar (anonimização, art. 16)

---

## M03 — Leads & Pipeline

### Propósito
Funil de atendimento e conversão de leads em clientes.

### Layout
- **Header**: KPI cards (4): Total Pipeline · Contratos Fechados (mês) · Taxa de Conversão (30d) · Tempo Médio até fechar
- **Toggle Kanban/Lista**
- **Kanban**: 7 colunas padrão
  - Novo Lead
  - Contato Realizado
  - Qualificado
  - Proposta Enviada
  - Negociação
  - Contrato Fechado (ganho)
  - Perdido
- Cada card: nome, área jurídica, valor estimado, ícone fonte, avatar responsável, próxima ação (data)

### Modal Lead (full-screen)
- 4 steps
- **Step 1 — Identificação**: nome, telefone, email, origem, utm
- **Step 2 — Caso**: área, sub-área, descrição, valor estimado
- **Step 3 — Próxima ação**: tipo (call/email/whatsapp/meeting), data, responsável
- **Step 4 — Histórico**: timeline de atividades

### Relatórios
- Funil por período + área
- Origem que mais converte
- Tempo médio por stage
- LTV previsto vs realizado

---

## M04 — Meus Processos

### Propósito
Listagem, busca e detalhamento de processos judiciais e administrativos.

### Layout
- **Topo**:
  - Toggle: Lista / Timeline & Gráficos
  - Botão: "Adicionar Processo por Nº CNJ"
  - Botão: "Importar processos públicos"
- **Sub-tabs**:
  - **Ativos** (badge count)
  - **Arquivados**
- **Filtros**:
  - Busca (CNJ, nome, partes, assunto)
  - Estado (UF)
  - Comarca
  - Ano
  - Status
  - Área
  - Responsável
- **Tabela**:
  - Cliente · CNJ · Tipo · Fase · Tribunal · Última mov. · Valor · Ações

### Detalhe do Processo (rota /cases/[id])

- **Header fixo**: título, CNJ, badges (status, fase, área), ações (novo andamento, nova tarefa, nova peça, exportar)
- **Sidebar esquerda (sticky 280px)**:
  - Cliente (avatar + link)
  - Parte contrária (link)
  - Advogado contrário
  - Valor da causa
  - Datas-chave (distribuição, citação, sentença)
  - Honorários vinculados
  - Tags
  - Responsável
- **Center — Andamentos (timeline vertical)**:
  - Agrupados por mês/ano
  - Card por movimento: data, título, descrição, ícone origem (DataJud, Manual, DJEN)
  - Fatais com badge vermelho + countdown
  - Anexos (PDF preview inline)
  - Botão "Adicionar comentário"
- **Tabs**:
  - Andamentos
  - Tarefas
  - Documentos
  - Audiências
  - Publicações DJEN
  - Honorários
  - Notas
  - Histórico de edições

### Sincronização DataJud
- Polling 24h: when 24h since datajud_synced_at
- Manual: botão "Sincronizar agora"
- Auto-trigger: toda nova CNJ cadastrada

---

## M05 — Tarefas & Agenda

### Propósito
Kanban pessoal do escritório + agenda integrada.

### Kanban
- 5 colunas: A fazer · Em andamento · Bloqueada · Concluída · Cancelada
- Drag-and-drop (optimistic update)
- Filtros: por responsável, caso, prioridade, tag, data
- Cards: título, badge prioridade, badge caso (link), data, responsável avatar

### Calendário (toggle view)
- Mês / Semana / Dia
- Eventos (audiências, prazos, tarefas com due_date)
- Click no evento → drawer detalhe
- Drag para mover

### Notificações
- D-7: email
- D-3: email + in-app
- D-1: email + WhatsApp + push
- D-0: tudo + SMS (Pro+)

---

## M06 — Peças com IA

### Catálogo (40+ peças)
Ver `docs/03-PECAS-CATALOG.md`

### Layout — Gerador de Peça

- **Step 1**: escolher tipo de peça
- **Step 2**: vincular a processo (opcional) + selecionar template (opcional)
- **Step 3**: entrevistar (formulário estruturado):
  - Para petição inicial: qualificação das partes, fatos, pedidos, valor, tutela
  - Para contestação: seleciona inicial, escolha preliminares + teses
  - Para agravo: seleciona decisão agravada, escolha tese principal + subsidiária
  - Cada tipo tem esquema Zod
- **Step 4**: geração IA (loading 5-30s com streaming)
- **Step 5**: editor rich-text (TipTap) com:
  - Toolbar: negrito, itálico, sublinhado, títulos, listas, alinhamento
  - Botão IA inline: "reescrever", "expandir", "encurtar", "tom mais formal", "incluir jurisprudência"
  - Comentários laterais (chat com IA)
  - Sidebar direita: minimap + sumário automático
- **Step 6**: revisão humana + aprovação
- **Step 7**: exportar PDF / DOCX / copiar
- **Versionamento**: cada save gera snapshot; histórico navegável

### Streaming
- SSE (Server-Sent Events) para evitar polling
- Tokens aparecem em tempo real
- Cancelamento disponível durante geração

### Custos
- Cada peça custa ~R$ 0,30 (Claude Opus input $15/M, output $75/M)
- Cobrado internamente via credits (Pro tem unlimited, Essencial tem 20/mês)

---

## M07 — Calculadoras

### Catálogo (15+ calculadoras)
1. **TRCT** — verbas rescisórias com base no motivo (lei 13.467)
2. **Atualização SELIC** — qualquer valor com SELIC acumulada
3. **Atualização IPCA-E** — débitos judiciais cíveis
4. **Atualização IGP-M/FGV** — débitos contratuais
5. **Pensão Alimentícia** — binômio necessidade × possibilidade (Lei 5.478/68)
6. **Pensão por Morte** — coeficiente RBC × salário benefício
7. **Aposentadoria** — regras de transição EC 103/2019
8. **Tempo de Contribuição** — soma de períodos (Súmula 8 TNU)
9. **Bancário Revisional** — capitalização, anatocismo, juros abusivos
10. **Débito Tributário** — SELIC + multa + juros
11. **Prescrição e Decadência** — civil, tributária, criminal, CDC
12. **FGTS + Multa 40%** — saldo + correção
13. **Liquidação Trabalhista** — verbas com médias 12m
14. **Honorários Sucumbenciais** — faixas CPC 85 §2-§8
15. **Custas Judiciais** — por estado + classe processual
16. **Inventário** — ITCMD por estado + cálculo monte-mor

### Layout Padrão de Calculadora
- **Header**: título + descrição + ícone
- **Formulário à esquerda**: campos validados com Zod
- **Resultado à direita**: tabela + gráfico + memória CSV
- **Botões**:
  - "Calcular" (com loading)
  - "Salvar" (associa ao processo)
  - "Exportar PDF" (memória em PDF com fundamentação)
  - "Compartilhar" (link público read-only)

### IA Assistente
- Auto-detecção do tipo de cálculo a partir de texto livre
- Ex: "Calcule a atualização desse contrato de R$ 50 mil de 2019 até hoje" → detecta atualização IPCA

---

## M08 — Publicações & DJEN

### Propósito
Receber e processar publicações de diários oficiais.

### Abas
- **Hoje** (badge count)
- **Não lidas** (badge)
- **Vencendo em 7 dias**
- **Lidas**
- **Arquivadas**

### Item de Publicação
- Cabeçalho: data + diário + tags
- Processos identificados (chips clicáveis)
- Partes envolvidas
- Advogado(s) com OAB
- Texto completo (colapsável)
- **Análise IA**:
  - Resumo em 1 linha
  - Tipo do ato (intimação, sentença, decisão interlocutória, recurso)
  - Há prazo fatal? (sim/não + dias + data final)
  - Sugestão de ação ("Impugnar cumprimento", "Manifestar-se em 5 dias")
- **Ações**:
  - Vincular a processo
  - Criar tarefa automática
  - Criar lembrete
  - Compartilhar

### Configuração de Monitoramentos
- Lista de monitors ativos
- Novo monitor: nome + filtros (OAB, CPF, CNJ, palavra-chave)
- Histórico de matches (últimos 30d)

### Notificações
- Push em tempo real (Firebase Cloud Messaging)
- Email digest (diário às 7h)
- WhatsApp (só para fatais — plano Pro+)

---

## M09 — Modelos & Templates

### Propósito
Biblioteca de templates do escritório + templates da plataforma.

### Layout
- **Header**: busca + categorias
- **Cards por template**: nome · prévia 1ª linha · área · variáveis esperadas · usado X vezes
- **Ações**: usar, editar, duplicar, deletar, compartilhar com time

### Editor de Template (TipTap + placeholders)
- Placeholders `{{nome_variavel}}` highlighted
- Sidebar: lista de variáveis detectadas + editor schema (nome, label, tipo, required)
- Botão "Testar": preenche com dados fake

### Catálogo da Plataforma (público)
- 30+ templates prontos por área
- Categorizados: Inicial · Recursal · Trabalhista · Criminal · Família · Empresarial · Contratos
- "Instalar" no meu escritório (1 click)

---

## M10 — Jurisprudência

### Catálogo
- **STJ**: acervo desde 1988
- **STF**: desde 1988
- **Teses Repetitivas**: vinhetas por tema
- **Súmulas**: vinculantes + ordinárias (STJ/STF)
- **Informativos**: STJ semanal + STF quinzenal

### Busca
- Full-text em PT-BR com stemming jurídico
- Filtros: tribunal, tipo (acórdão/súmula/tema), data, área, relator, classe
- Ranqueamento: relevância + Recência + Citações

### Detalhe da Tese
- Cabeçalho: tribunal, classe, número, relator, data, órgão
- Tese (1-3 parágrafos)
- Casos aplicados (lista de acórdãos)
- Citação ABNT pronta
- Botões:
  - "Copiar citação"
  - "Inserir em peça" (gera bloco pronto)
  - "Salvar em ementário"
  - "Compartilhar"

### Ementário Pessoal (banco interno)
- Organizar por taxonomia própria (área > tema > subtema)
- Tags personalizadas
- Exportar CSV/PDF
- Compartilhar com time

---

## M11 — Honorários & Financeiro

### Sub-módulos
- **Contratos de Honorários**: tipos (fixo, percentual, êxito, mensal, híbrido)
- **Faturas**: emissão automática, Asaas integration
- **Pagamentos**: conciliação (PIX, boleto, cartão)
- **Relatórios**: aging, MRR do escritório, inadimplência
- **Despesas**: rateio por caso/cliente
- **Repasses**: calcular valor a repassar a correspondente

### Fluxo de Cobrança Automatizado
- Régua de 5 níveis:
  1. **D+1**: email lembrete amigável
  2. **D+7**: email formal + whatsapp
  3. **D+15**: notificação cartorial extra
  4. **D+30**: suspensão serviços com aviso prévio 5d
  5. **D+60**: ação judicial (monitória ou execução)

### Templates
- Email lembrete (3 versões: amigável, formal, firme)
- Notificação cartorial (modelo PR)
- Petição inicial de cobrança (gerada por IA com base no contrato)

---

## M12 — Configurações

### Sub-módulos
- **Escritório**: nome, logo, marca, endereço, OAB nº
- **Equipe**: convidar membros (email + role), suspender, remover
- **OAB & Certificados**: vincular nº OAB ao usuário
- **Integrações**:
  - Google Calendar (OAuth)
  - Microsoft 365 (OAuth)
  - WhatsApp Business (Z-API ou oficial)
  - E-mail IMAP/SMTP
  - Tribunais (DataJud, DJEN, MNI)
- **Pagamento**: plano, histórico, cartão
- **Notificações**: canais por evento
- **LGPD**: política de privacidade customizável, exportar titular
- **API Keys**: gerar token para integrações externas (Elite)
- **Backup**: baixar snapshot de dados
- **Auditoria**: log de ações sensíveis

---

## M13 — App Mobile (v2)

### Decisão
Iniciar mobile nativo **somente no mês 12** (após tração web). Web app já é PWA + responsive.

### Stack Mobile
- React Native + Expo
- Compartilhar 90% do código com web (componentes)
- Notificações nativas (FCM)
- Câmera para anexo rápido
- Offline-first com SQLite local

### Features v1 Mobile
- Dashboard resumido
- Lista de tarefas (com check-off)
- Próximas audiências (com mapa)
- DJEN push real-time
- Falar com IA (peça sob demanda)
- Câmera anexar (com OCR)

---

## M14 — Equipes & Permissões (RBAC)

### Roles
- `OWNER` — tudo, billing, deletar tenant
- `PARTNER` — quase tudo, vê todos os casos, edita honorários
- `LAWYER` — vê seus casos, edita, vê honorários, NÃO vê faturamento interno
- `ASSISTANT` — vê casos designados, edita tarefas, NÃO edita peças finais
- `READONLY` — vê dashboard, não edita nada

### Capacidades por Role
| Capability | OWNER | PARTNER | LAWYER | ASSISTANT | READONLY |
|---|---|---|---|---|---|
| Config escritório | ✓ | ✗ | ✗ | ✗ | ✗ |
| Billing | ✓ | ✗ | ✗ | ✗ | ✗ |
| Ver todos casos | ✓ | ✓ | ✗ | ✗ | ✗ |
| Editar peças | ✓ | ✓ | ✓ | ✗ | ✗ |
| Aprovar peças | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit honorários | ✓ | ✓ | ✗ | ✗ | ✗ |
| Edit clientes | ✓ | ✓ | ✓ | ✓ | ✗ |
| Exportar LGPD | ✓ | ✗ | ✗ | ✗ | ✗ |
| Audit log | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## M15 — Marketplace (v2 — mês 18)

### Marketplace de integrações
- Templates vendidos por outros advogados
- Integrações (LEGAl AI plugins)
- Calculadoras premium (especialistas)
- Comissão: 70% autor / 30% Juris-Flow
