# JURIS-FLOW — Schema do Banco de Dados (PostgreSQL)

> Engine: **PostgreSQL 16** via Supabase. ORM: **Prisma**. RLS (Row Level Security) habilitado em todas as tabelas multi-tenant.

## Convenções

- **Multi-tenant** com `tenant_id` em toda tabela de negócio
- **UUID v7** como chave primária (sortable)
- **Snake_case** para colunas, **PascalCase** para models
- **Soft delete** com `deletedAt` onde aplica
- **Audit fields:** `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
- Toda tabela tenant-scoped tem índice composto `(tenant_id, createdAt desc)`

## Glossário de tipos

```sql
-- Role dentro do tenant
CREATE TYPE user_role AS ENUM ('OWNER', 'PARTNER', 'LAWYER', 'ASSISTANT', 'READONLY');

-- Status do processo
CREATE TYPE case_status AS ENUM (
  'ACTIVE', 'SUSPENDED', 'JUDGED', 'APPEALED',
  'EXECUTED', 'ARCHIVED', 'SETTLED'
);

-- Fase processual
CREATE TYPE case_phase AS ENUM (
  'INTAKE',      -- Captado, sem inicial
  'FILING',      -- Petição inicial
  'CITATION',    -- Aguardando citação
  'DISCOVERY',   -- Instrução
  'DECISION',    -- Em sentença
  'APPEAL',      -- Em recurso
  'EXECUTION'    -- Cumprimento
);

-- Área do Direito
CREATE TYPE legal_area AS ENUM (
  'CIVEL', 'TRABALHISTA', 'CRIMINAL', 'FAMILIA',
  'TRIBUTARIO', 'PREVIDENCIARIO', 'EMPRESARIAL',
  'CONSUMIDOR', 'ADMINISTRATIVO', 'IMOBILIARIO', 'OUTRO'
);

-- Status peça IA
CREATE TYPE piece_status AS ENUM (
  'DRAFT', 'REVIEWING', 'APPROVED', 'EXPORTED', 'ARCHIVED'
);

-- Status lead
CREATE TYPE lead_status AS ENUM (
  'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL',
  'NEGOTIATION', 'WON', 'LOST', 'NO_SHOW'
);

-- Canal do lead
CREATE TYPE lead_source AS ENUM (
  'ORGANIC', 'REFERRAL', 'INSTAGRAM', 'FACEBOOK',
  'GOOGLE_ADS', 'LINKEDIN', 'YOUTUBE', 'EVENT', 'OTHER'
);

-- Tipo de cálculo
CREATE TYPE calc_type AS ENUM (
  'TRCT', 'UPDATE_SELIC', 'UPDATE_IPCA', 'UPDATE_INPC',
  'UPDATE_IGPM', 'FOOD_BINOMIUM', 'FOOD_PERCENTAGE',
  'PRESCRIPTION_CIVIL', 'PRESCRIPTION_TAX', 'PRESCRIPTION_CRONOLOGIC',
  'BANK_REVISION', 'TAX_DEBT_UPDATE', 'FGTS_FINE_40',
  'PENSION_DEATH', 'RETIREMENT_TIME', 'BUSINESS_EVALUATION'
);

-- Tipo de peça processual (40+)
CREATE TYPE piece_type AS ENUM (
  'PETICAO_INICIAL_CIVEL', 'CONTESTACAO', 'REPLICA',
  'AGRAVO_INSTRUMENTO', 'APELACAO', 'CONTRARRAZOES_APELACAO',
  'AGRAVO_INTERNO', 'EMBARGOS_DECLARACAO', 'EMBARGOS_EXECUCAO',
  'CUMPRIMENTO_SENTENCA', 'IMPUGNACAO_CUMPRIMENTO',
  'RECURSO_ESPECIAL', 'RECURSO_EXTRAORDINARIO',
  'HABEAS_CORPUS', 'MANDADO_SEGURANCA', 'MANDADO_INJUNCAO',
  'RECLAMACAO_TRABALHISTA', 'CONTESTACAO_TRABALHISTA',
  'RODADA', 'RECURSO_ORDINARIO_TRABALHO', 'AGRAVO_PETICAO',
  'AGRAVO_INSTRUMENTO_TRABALHO', 'AGRAVO_REGIMENTAL',
  'DENUNCIA_CRIME', 'RESPOSTA_ACUSACAO', 'APELACAO_CRIMINAL',
  'MEMORIAIS', 'SENTENCA', 'DECISAO_INTERLOCUTORIA',
  'ATO_CONSTITUTIVO', 'ALTERACAO_CONTRATUAL', 'DISTRATO_SOCIAL',
  'CONTRATO_PRESTACAO_SERVICOS', 'CONTRATO_HONORARIOS',
  'TERMO_PARCIAL', 'PARECER_JURIDICO', 'NOTIFICACAO_EXTRAJUDICIAL',
  'PROCURACAO_AD_JUDICIA', 'PROCURACAO_AD_NEGOTIA',
  'DECLARACAO_HIPOSSUFICIENCIA', 'TERMO_CIENCIA_LGPD'
);

-- Status financeiro
CREATE TYPE invoice_status AS ENUM (
  'PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED'
);

-- Método de pagamento
CREATE TYPE payment_method AS ENUM ('PIX', 'BOLETO', 'CREDIT_CARD', 'TRANSFER');

-- Status honorário advocatício
CREATE TYPE fee_status AS ENUM (
  'PROPOSED', 'ACCEPTED', 'INVOICED', 'PAID', 'OVERDUE',
  'NEGOTIATING', 'CANCELLED', 'PARTIAL'
);

-- Canal monitoramento DJEN
CREATE TYPE djen_status AS ENUM (
  'PENDING', 'SENT', 'DELIVERED', 'FAILED', 'RETRYING'
);
```

## Tabelas Core

### auth & tenant

```sql
-- Tenants (escritórios)
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  document TEXT, -- CNPJ/CPF
  phone TEXT,
  email TEXT,
  address JSONB,
  logo_url TEXT,
  brand_color TEXT DEFAULT '#3B82F6',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  asaas_customer_id TEXT,
  asaas_subscription_id TEXT,
  plan user_plan DEFAULT 'FREE',
  plan_status TEXT DEFAULT 'ACTIVE',
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Usuários
CREATE TABLE users (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  email TEXT UNIQUE NOT NULL,
  email_verified TIMESTAMPTZ,
  password_hash TEXT,
  full_name TEXT NOT NULL,
  oab_number TEXT,
  oab_state CHAR(2),
  avatar_url TEXT,
  phone TEXT,
  role user_role DEFAULT 'ASSISTANT',
  mfa_secret TEXT,
  mfa_enabled BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_tenant ON users(tenant_id) WHERE deleted_at IS NULL;

-- Sessões NextAuth
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  expires TIMESTAMPTZ NOT NULL,
  session_token TEXT UNIQUE
);

-- OAuth (Google + OAB)
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER
);
```

### Clientes e Pessoas

```sql
-- Pessoas (clientes, partes, testemunhas, terceiros)
CREATE TABLE persons (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('PF','PJ')),
  -- PF
  full_name TEXT,
  cpf TEXT,
  birth_date DATE,
  -- PJ
  legal_name TEXT,
  trade_name TEXT,
  cnpj TEXT,
  state_registration TEXT,
  -- Comum
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  address JSONB,
  notes TEXT,
  tags TEXT[],
  source TEXT, -- 'CLIENT','PARTY','WITNESS','OPPOSING','THIRD_PARTY'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_persons_tenant ON persons(tenant_id, name) WHERE deleted_at IS NULL;

-- Vínculo cliente ↔ tenant (relacionamentos múltiplos)
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  person_id UUID REFERENCES persons(id) NOT NULL,
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE','INACTIVE','FORMER'
  contracted_at DATE,
  contract_ends_at DATE,
  fee_arrangement JSONB, -- { type, value, currency, billing_cycle }
  ltv_cents BIGINT DEFAULT 0,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_clients_unique ON clients(tenant_id, person_id);
```

### Leads & Pipeline

```sql
-- Leads (oportunidades pré-cliente)
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  person_id UUID REFERENCES persons(id), -- pode ser null se lead ainda não tem pessoa
  -- OU dados inline se ainda não cadastrou
  full_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  source lead_source,
  utm JSONB,
  -- Pipeline
  status lead_status DEFAULT 'NEW',
  legal_area legal_area,
  estimated_value_cents BIGINT,
  probability INTEGER DEFAULT 10, -- %
  responsible_user_id UUID REFERENCES users(id),
  next_action_at TIMESTAMPTZ,
  next_action TEXT,
  lost_reason TEXT,
  converted_client_id UUID REFERENCES clients(id),
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_leads_tenant_status ON leads(tenant_id, status, created_at DESC);
CREATE INDEX idx_leads_responsible ON leads(responsible_user_id) WHERE deleted_at IS NULL;

-- Atividades do lead (Kanban)
CREATE TABLE lead_activities (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  lead_id UUID REFERENCES leads(id) NOT NULL,
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL, -- 'CALL','EMAIL','WHATSAPP','MEETING','NOTE','STATUS_CHANGE','PROPOSAL_SENT'
  subject TEXT,
  body TEXT,
  metadata JSONB,
  occurred_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id, occurred_at DESC);
```

### Processos

```sql
-- Processos (unidade central)
CREATE TABLE cases (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  cnj_number TEXT UNIQUE,
  -- Metadados do tribunal
  court TEXT, -- 'TRF1','TJSP','TJMG', etc
  court_unit TEXT, -- '1ª Vara Cível de São Paulo'
  district TEXT, -- comarca
  state CHAR(2),
  -- Classificação
  legal_area legal_area,
  sub_area TEXT,
  procedure_type TEXT, -- 'Conhecimento','Execução','Recursal'
  case_type TEXT, -- tipo interno
  -- Status
  status case_status DEFAULT 'ACTIVE',
  phase case_phase DEFAULT 'INTAKE',
  -- Partes
  client_id UUID REFERENCES clients(id),
  opposing_party_id UUID REFERENCES persons(id),
  opposing_party_lawyer TEXT,
  -- Financeiro
  case_value_cents BIGINT,
  fee_agreement_id UUID REFERENCES fee_agreements(id),
  -- Datas
  filing_date DATE,
  citation_date DATE,
  judgment_date DATE,
  -- Meta
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  responsible_user_id UUID REFERENCES users(id),
  -- DataJud sync
  datajud_synced_at TIMESTAMPTZ,
  datajud_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_cases_tenant ON cases(tenant_id, status, created_at DESC);
CREATE INDEX idx_cases_cnj ON cases(cnj_number);
CREATE INDEX idx_cases_client ON cases(client_id);
CREATE INDEX idx_cases_responsible ON cases(responsible_user_id);

-- Andamentos (timeline)
CREATE CASE movements (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  case_id UUID REFERENCES cases(id) NOT NULL,
  -- Conteúdo
  sequence INTEGER NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  code TEXT, -- código do movimento DataJud
  title TEXT NOT NULL,
  description TEXT,
  -- Origem
  source TEXT DEFAULT 'MANUAL', -- 'MANUAL','DATAJUD','DJEN','MIGRATION'
  datajud_id TEXT,
  is_fatal BOOLEAN DEFAULT false, -- gera prazo
  deadline_days INTEGER,
  deadline_kind TEXT, -- 'UTEIS','CORRIDOS'
  deadline_ends_at TIMESTAMPTZ, -- calculado
  -- Anexos
  attachments JSONB,
  -- Tags internas
  is_private BOOLEAN DEFAULT false,
  tags TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_movements_case ON movements(case_id, occurred_at DESC);
CREATE INDEX idx_movements_fatal ON movements(deadline_ends_at) WHERE is_fatal = true AND is_private = false;

-- Tarefas vinculadas ao processo
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  case_id UUID REFERENCES cases(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'TODO', -- 'TODO','DOING','BLOCKED','DONE','CANCELLED'
  priority TEXT DEFAULT 'MEDIUM', -- 'LOW','MEDIUM','HIGH','URGENT'
  due_date TIMESTAMPTZ,
  reminder_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  tags TEXT[],
  -- Comporta movimento fatal?
  linked_movement_id UUID REFERENCES movements(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tasks_tenant ON tasks(tenant_id, status, due_date);

-- Eventos de agenda (audiências, sessões)
CREATE TABLE events (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  case_id UUID REFERENCES cases(id),
  type TEXT NOT NULL, -- 'AUDIENCIA','SESSAO','REUNIAO','PRAZO','OUTRO'
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT,
  is_virtual BOOLEAN DEFAULT false,
  meeting_url TEXT,
  attendees JSONB, -- [{ user_id, role, confirmed }]
  reminders JSONB, -- [{ offset_minutes, sent }]
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_tenant_starts ON events(tenant_id, starts_at);
```

### Publicações e DJEN

```sql
-- Publicações de diário
CREATE TABLE publications (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  -- Identificação
  djen_id TEXT UNIQUE NOT NULL, -- id oficial CNJ
  diario TEXT, -- 'DJEN','DJE-TJSP', etc
  publication_date TIMESTAMPTZ NOT NULL,
  -- Conteúdo
  process_numbers TEXT[],
  parties JSONB,
  lawyers JSONB,
  full_text TEXT,
  summary TEXT,
  -- Classificação
  is_fatal BOOLEAN DEFAULT false,
  deadline_kind TEXT,
  deadline_ends_at TIMESTAMPTZ,
  case_id UUID REFERENCES cases(id),
  matched_at TIMESTAMPTZ, -- quando foi vinculada
  matched_by UUID REFERENCES users(id),
  matched_by_ia BOOLEAN DEFAULT false,
  -- Status leitura
  status TEXT DEFAULT 'NEW', -- 'NEW','READ','ARCHIVED'
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES users(id),
  -- Tags
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_publications_tenant ON publications(tenant_id, publication_date DESC);
CREATE INDEX idx_publications_fatal ON publications(deadline_ends_at) WHERE is_fatal = true;
CREATE INDEX idx_publications_process ON publications USING GIN(process_numbers);
CREATE INDEX idx_publications_match ON publications(case_id) WHERE case_id IS NOT NULL;

-- Monitoramentos (cadastros de busca)
CREATE TABLE monitors (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  name TEXT NOT NULL,
  -- Filtros
  oab_numbers TEXT[],
  oab_states CHAR(2)[],
  cpfs TEXT[],
  cnpjs TEXT[],
  process_numbers TEXT[],
  parties TEXT[],
  keywords TEXT[],
  legal_areas legal_area[],
  -- Origem
  source TEXT DEFAULT 'DJEN', -- 'DJEN','DJE-SP','DJE-RJ', etc
  -- Cadência
  frequency TEXT DEFAULT 'REALTIME', -- 'REALTIME','DAILY'
  -- Notificações
  notify_email BOOLEAN DEFAULT true,
  notify_whatsapp BOOLEAN DEFAULT false,
  notify_in_app BOOLEAN DEFAULT true,
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Alertas de publicação enviada
CREATE TABLE alert_deliveries (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  publication_id UUID REFERENCES publications(id) NOT NULL,
  channel TEXT NOT NULL, -- 'EMAIL','WHATSAPP','IN_APP','PUSH'
  recipient_user_id UUID REFERENCES users(id),
  status djen_status DEFAULT 'PENDING',
  attempts INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Peças e IA

```sql
-- Documentos (peças, contratos, modelos, contratos cliente)
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  case_id UUID REFERENCES cases(id),
  client_id UUID REFERENCES clients(id),
  -- Tipo
  kind TEXT NOT NULL, -- 'PIECE','CONTRACT','MODEL','ATTACHMENT','OTHER'
  piece_type piece_type,
  title TEXT NOT NULL,
  description TEXT,
  -- Conteúdo
  content TEXT,
  content_format TEXT DEFAULT 'HTML', -- 'HTML','MARKDOWN','DOCX','PDF'
  -- Origem
  origin TEXT DEFAULT 'MANUAL', -- 'MANUAL','IA','TEMPLATE','IMPORTED'
  template_id UUID REFERENCES documents(id),
  -- Estado
  status piece_status DEFAULT 'DRAFT',
  -- IA
  ia_prompt JSONB,
  ia_model TEXT,
  ia_tokens_input INTEGER,
  ia_tokens_output INTEGER,
  ia_cost_cents INTEGER,
  ia_generated_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  -- File
  file_url TEXT, -- R2 URL do PDF exportado
  file_size_bytes INTEGER,
  -- Tags
  tags TEXT[],
  -- Versionamento
  parent_version_id UUID REFERENCES documents(id),
  version INTEGER DEFAULT 1,
  -- Audit
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_documents_tenant ON documents(tenant_id, kind, created_at DESC);
CREATE INDEX idx_documents_case ON documents(case_id);
CREATE INDEX idx_documents_piece_type ON documents(piece_type);

-- Templates (modelos do escritório)
CREATE TABLE templates (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  piece_type piece_type,
  -- Conteúdo template com placeholders {{variavel}}
  content TEXT NOT NULL,
  -- Variáveis esperadas
  variables JSONB, -- [{ name, type, label, required, default }]
  -- Categoria
  category TEXT, -- 'INICIAL','RECURSO','CONTRATO','CLIENTE'
  -- Stats
  times_used INTEGER DEFAULT 0,
  -- Audit
  created_by UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT false, -- compartilhado entre tenant
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Calculadoras

```sql
-- Histórico de cálculos
CREATE TABLE calculations (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  case_id UUID REFERENCES cases(id),
  user_id UUID REFERENCES users(id),
  type calc_type NOT NULL,
  -- Dados de entrada
  inputs JSONB NOT NULL,
  -- Resultado
  outputs JSONB NOT NULL,
  -- Memória
  steps JSONB, -- passos intermediários
  -- Memória em CSV
  csv_url TEXT,
  -- Custo IA (se usou)
  ia_cost_cents INTEGER,
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_calculations_tenant ON calculations(tenant_id, type, created_at DESC);

-- Bases indexadoras (cache para cálculos)
CREATE TABLE indexer_rates (
  id UUID PRIMARY KEY,
  indexer TEXT NOT NULL, -- 'SELIC','IPCA','INPC','IGPM','TR','Poupanca'
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  rate NUMERIC(12,8) NOT NULL,
  accumulated NUMERIC(12,8), -- acumulado 12m
  source TEXT, -- 'BCB','IBGE','FGV'
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(indexer, year, month)
);

CREATE INDEX idx_indexer_rates_lookup ON indexer_rates(indexer, year DESC, month DESC);
```

### Financeiro

```sql
-- Contratos de honorários
CREATE TABLE fee_agreements (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  client_id UUID REFERENCES clients(id) NOT NULL,
  case_id UUID REFERENCES cases(id),
  -- Tipo
  fee_type TEXT NOT NULL, -- 'FIXED','PERCENTAGE','SUCCESS','MONTHLY','HYBRID'
  -- Valor
  amount_cents BIGINT,
  percentage NUMERIC(5,2),
  -- Recorrência
  billing_cycle TEXT, -- 'MONTHLY','QUARTERLY','SEMIANNUAL','YEARLY','ONE_OFF'
  -- Sucesso
  success_base TEXT, -- 'CONDENAÇÃO','ACORDO','BENEFÍCIO'
  -- Vencimento
  starts_at DATE,
  ends_at DATE,
  -- Status
  status fee_status DEFAULT 'PROPOSED',
  signed_at TIMESTAMPTZ,
  document_id UUID REFERENCES documents(id), -- contrato gerado
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Faturas (invoices)
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  fee_agreement_id UUID REFERENCES fee_agreements(id),
  client_id UUID REFERENCES clients(id),
  -- Identificação
  description TEXT NOT NULL,
  -- Valor
  amount_cents BIGINT NOT NULL,
  discount_cents BIGINT DEFAULT 0,
  net_amount_cents BIGINT NOT NULL,
  -- Vencimento
  issued_at DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  -- Status
  status invoice_status DEFAULT 'PENDING',
  -- Asaas
  asaas_id TEXT,
  asaas_status TEXT,
  asaas_invoice_url TEXT,
  payment_method payment_method,
  -- Auditoria
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoices_tenant_status ON invoices(tenant_id, status, due_date);
CREATE INDEX idx_invoices_asaas ON invoices(asaas_id);
```

### Biblioteca Jurídica

```sql
-- Documentos indexados para RAG (peças-modelo do escritório + biblioteca jurisprudência)
CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  -- Origem
  source TEXT NOT NULL, -- 'INTERNAL','JURISPRUDENCIA','DOUTRINA','SUMULA','TEMA'
  source_ref TEXT, -- 'STJ Tema 988','Súmula 309 STJ'
  -- Conteúdo
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  -- Embedding (pgvector)
  embedding vector(1536), -- OpenAI text-embedding-3-small OU voyage-law-2
  -- Meta
  metadata JSONB,
  tags TEXT[],
  legal_areas legal_area[],
  -- Versionamento
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_knowledge_tenant ON knowledge_documents(tenant_id);
CREATE INDEX idx_knowledge_embedding ON knowledge_documents USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_knowledge_legal_areas ON knowledge_documents USING GIN(legal_areas);
```

### Auditoria

```sql
-- Audit log (LGPD, segurança)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  -- Ação
  action TEXT NOT NULL, -- 'CREATE','UPDATE','DELETE','READ','EXPORT','LOGIN','LOGOUT'
  resource_type TEXT, -- 'case','client','document','invoice'
  resource_id UUID,
  -- Diff
  before JSONB,
  after JSONB,
  -- Contexto
  ip INET,
  user_agent TEXT,
  occurred_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id, occurred_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id, occurred_at DESC);

-- LGPD (consentimentos, requests do titular)
CREATE TABLE lgpd_records (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  data_subject_id UUID, -- person/user id
  data_subject_email TEXT,
  -- Tipo
  consent_type TEXT NOT NULL, -- 'TERMS','PRIVACY','SHARING','MARKETING','COOKIES'
  -- Ação
  action TEXT NOT NULL, -- 'CONSENT','REVOKE','ACCESS_REQUEST','DELETION_REQUEST','PORTABILITY'
  status TEXT DEFAULT 'PENDING', -- 'PENDING','APPROVED','REJECTED','COMPLETED'
  -- Versão
  terms_version TEXT,
  privacy_policy_version TEXT,
  -- Resposta
  responded_at TIMESTAMPTZ,
  response_notes TEXT,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_lgpd_subject ON lgpd_records(data_subject_id);
CREATE INDEX idx_lgpd_pending ON lgpd_records(status) WHERE status = 'PENDING';

-- Notificações in-app
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  -- Conteúdo
  type TEXT NOT NULL, -- 'DEADLINE_D_7','DEADLINE_D_3','DEADLINE_D_1','DEADLINE_D_0',
                       -- 'NEW_LEAD','LEAD_CONVERTED','PIECE_READY',
                       -- 'INVOICE_OVERDUE','MONITOR_NEW_PUB','MFA_REQUIRED'
  title TEXT NOT NULL,
  body TEXT,
  -- Link
  link TEXT,
  -- Prioridade
  priority TEXT DEFAULT 'NORMAL', -- 'LOW','NORMAL','HIGH','CRITICAL'
  -- Estado
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  -- Meta
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
```

### Assinaturas SaaS (Juris-Flow cobrando de seus clientes)

```sql
-- Planos assinados pelos clientes do SaaS
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) UNIQUE NOT NULL,
  -- Plano
  plan TEXT NOT NULL, -- 'FREE','ESSENTIAL','PRO','ELITE'
  -- Cobra
  status TEXT DEFAULT 'ACTIVE', -- 'TRIALING','ACTIVE','PAST_DUE','CANCELLED','UNPAID'
  -- Período
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  -- Asaas
  asaas_subscription_id TEXT,
  asaas_customer_id TEXT,
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Uso (metering)
CREATE TABLE usage_records (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  metric TEXT NOT NULL, -- 'IA_PIECES','STORAGE_BYTES','USERS','MONITORS','PUBLICATIONS_RECEIVED'
  period DATE NOT NULL, -- mês
  value BIGINT NOT NULL,
  UNIQUE(tenant_id, metric, period)
);

CREATE INDEX idx_usage_tenant_period ON usage_records(tenant_id, period DESC);
```

## Row Level Security (RLS)

```sql
-- Habilitar RLS em todas as tabelas tenant
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ...

-- Policy genérica por tenant
CREATE POLICY tenant_isolation ON cases
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Audit log: apenas owner/partner lê
CREATE POLICY audit_owner ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.tenant_id = audit_logs.tenant_id
        AND u.role IN ('OWNER', 'PARTNER')
    )
  );
```

## Views Materializadas (relatórios)

```sql
-- Funil de leads (últimos 12m)
CREATE MATERIALIZED VIEW mv_lead_funnel AS
SELECT
  tenant_id,
  DATE_TRUNC('month', created_at) AS month,
  source,
  COUNT(*) FILTER (WHERE status = 'NEW') AS new_count,
  COUNT(*) FILTER (WHERE status = 'QUALIFIED') AS qualified_count,
  COUNT(*) FILTER (WHERE status = 'PROPOSAL') AS proposal_count,
  COUNT(*) FILTER (WHERE status = 'WON') AS won_count,
  COUNT(*) FILTER (WHERE status = 'LOST') AS lost_count,
  AVG(estimated_value_cents) FILTER (WHERE status = 'WON') AS avg_won_value
FROM leads
WHERE created_at > now() - INTERVAL '12 months'
  AND deleted_at IS NULL
GROUP BY tenant_id, DATE_TRUNC('month', created_at), source;

-- Aging de faturas (inadimplência)
CREATE MATERIALIZED VIEW mv_invoice_aging AS
SELECT
  tenant_id,
  client_id,
  SUM(amount_cents) FILTER (WHERE due_date > current_date) AS current_amount,
  SUM(amount_cents) FILTER (WHERE due_date BETWEEN current_date - INTERVAL '30 days' AND current_date) AS d30,
  SUM(amount_cents) FILTER (WHERE due_date BETWEEN current_date - INTERVAL '60 days' AND current_date - INTERVAL '31 days') AS d60,
  SUM(amount_cents) FILTER (WHERE due_date BETWEEN current_date - INTERVAL '90 days' AND current_date - INTERVAL '61 days') AS d90,
  SUM(amount_cents) FILTER (WHERE due_date < current_date - INTERVAL '90 days') AS d90_plus
FROM invoices
WHERE status IN ('PENDING', 'OVERDUE')
GROUP BY tenant_id, client_id;
```

## Volumes estimados (1 ano)

| Tabela | Linhas estimadas | Crescimento/mês |
|---|---|---|
| `tenants` | 1.500 | +100 |
| `users` | 3.000 | +200 |
| `cases` | 90.000 | +7.500 |
| `movements` | 1M | +85k |
| `publications` | 3M | +250k |
| `documents` | 200k | +17k |
| `invoices` | 150k | +12k |
| `audit_logs` | 50M | +4M |
| `knowledge_documents` | 200k | +5k (biblioteca crescendo) |

## Próximas Tabelas (v2)

- `chat_sessions` — conversas com IA (Claude Workbench-style)
- `integrations` — Google Calendar, Outlook, Zapier, n8n
- `webhooks_out` — notificações para sistemas externos
- `expediente_config` — regras de expediente por tribunal
- `task_templates` — checklists de tarefas (intimação, audiência, etc)
- `presenca_audiencia` — controle de presença com QR
