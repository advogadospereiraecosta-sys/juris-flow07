/**
 * Seed do banco de dados para desenvolvimento.
 *
 * Cria 1 tenant de demonstração com:
 * - 1 usuário OWNER com OAB
 * - 1 usuário ASSISTANT
 * - 1 LGPD consent mock
 *
 * Uso:
 *   npm run db:seed
 *
 * NÃO roda em produção.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  const passwordHash = await bcrypt.hash('Tamp@221122', 12); // senha demo só pra dev

  // === Tenant demo ===
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Escritório Demo',
      slug: 'demo',
      email: '[email protected]',
      plan: 'PRO',
      planStatus: 'TRIALING',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`  ✓ Tenant criado: ${tenant.name} (${tenant.slug})`);

  // === Owner ===
  const owner = await prisma.user.upsert({
    where: { email: '[email protected]' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: '[email protected]',
      fullName: 'Dra. Demo Owner',
      oabNumber: '123456',
      oabState: 'SP',
      role: 'OWNER',
      passwordHash,
    },
  });
  console.log(`  ✓ Owner criado: ${owner.email}`);

  // === Assistant ===
  const assistant = await prisma.user.upsert({
    where: { email: '[email protected]' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: '[email protected]',
      fullName: 'João Assistente',
      role: 'ASSISTANT',
      passwordHash,
    },
  });
  console.log(`  ✓ Assistente criado: ${assistant.email}`);

  // === Subscription ===
  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      plan: 'PRO',
      status: 'TRIALING',
      cycle: 'MONTHLY',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`  ✓ Subscription TRIALING criada`);

  // === LGPD consent ===
  await prisma.lgpdConsent.create({
    data: {
      tenantId: tenant.id,
      dataSubjectEmail: owner.email,
      consentType: 'TERMS',
      action: 'CONSENT',
      status: 'APPROVED',
      termsVersion: 'v1.0',
      privacyPolicyVersion: 'v1.0',
      ip: '127.0.0.1',
      userAgent: 'seed-script',
      respondedAt: new Date(),
    },
  });
  console.log(`  ✓ LGPD consent registrado`);

  // === Audit log ===
  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      userId: owner.id,
      action: 'CREATE',
      resourceType: 'tenant',
      resourceId: tenant.id,
      after: { source: 'seed', plan: 'PRO_TRIAL' },
    },
  });
  console.log(`  ✓ Audit log criado`);

  // === Clientes de exemplo ===
  const clientData = [
    {
      kind: 'PF' as const,
      fullName: 'Marina Costa Lima',
      cpf: '12345678901',
      email: 'marina.costa@email.com',
      phone: '(11) 98765-4321',
      whatsapp: '(11) 98765-4321',
    },
    {
      kind: 'PF' as const,
      fullName: 'Roberto Silva Santos',
      cpf: '98765432109',
      email: 'roberto.santos@empresa.com',
      phone: '(21) 99876-5432',
    },
    {
      kind: 'PJ' as const,
      legalName: 'TechSolutions Desenvolvimento de Software Ltda.',
      tradeName: 'TechSolutions',
      cnpj: '12345678000199',
      email: 'contato@techsolutions.com.br',
      phone: '(11) 3333-4444',
    },
    {
      kind: 'PJ' as const,
      legalName: 'Restaurante Sabor da Terra Ltda.',
      tradeName: 'Sabor da Terra',
      cnpj: '98765432000188',
      email: 'financeiro@sabordaterra.com.br',
      phone: '(19) 3456-7890',
    },
    {
      kind: 'PF' as const,
      fullName: 'Ana Beatriz Oliveira',
      cpf: '45678912300',
      email: 'ana.beatriz@email.com',
      whatsapp: '(31) 98765-1234',
    },
  ];

  for (const data of clientData) {
    const person = await prisma.person.create({
      data: {
        tenantId: tenant.id,
        ...data,
        source: 'CLIENT',
      },
    });
    await prisma.client.upsert({
      where: { personId: person.id },
      update: {},
      create: {
        tenantId: tenant.id,
        personId: person.id,
        status: 'ACTIVE',
      },
    });
    console.log(`  ✓ Cliente criado: ${data.fullName ?? data.legalName}`);
  }

  // Busca pessoas criadas para vincular processos
  const persons = await prisma.person.findMany({
    where: { tenantId: tenant.id, source: 'CLIENT' },
    take: 3,
  });

  // === Processos de exemplo ===
  const cases = [
    {
      title: 'Cobrança de honorários — Marina Costa',
      description: 'Ação de cobrança de honorários advocatícios contratuais atrasados há 90 dias.',
      court: 'TJSP',
      courtUnit: '35ª Vara Cível',
      district: 'São Paulo',
      state: 'SP',
      legalArea: 'CIVEL' as const,
      procedureType: 'CONHECIMENTO' as const,
      status: 'ACTIVE' as const,
      phase: 'DECISION' as const,
      clientId: persons[0]?.id,
      caseValueCents: 4500000,
      filingDate: new Date('2024-08-15'),
    },
    {
      title: 'Reclamação Trabalhista — Roberto Santos',
      description: 'Reclamante alega horas extras não pagas epeculiarities. Advogado assistente.',
      court: 'TRT2',
      courtUnit: '12ª Vara do Trabalho',
      district: 'São Paulo',
      state: 'SP',
      legalArea: 'TRABALHISTA' as const,
      procedureType: 'CONHECIMENTO' as const,
      status: 'ACTIVE' as const,
      phase: 'DISCOVERY' as const,
      clientId: persons[1]?.id,
      caseValueCents: 8500000,
      filingDate: new Date('2024-11-01'),
    },
    {
      title: 'Cumprimento de sentença — TechSolutions',
      description: 'Cumprimento de sentença com penhora via SISBAJUD.',
      court: 'TJSP',
      courtUnit: '12ª Vara Empresarial',
      district: 'São Paulo',
      state: 'SP',
      legalArea: 'EMPRESARIAL' as const,
      procedureType: 'EXECUCAO' as const,
      status: 'ACTIVE' as const,
      phase: 'EXECUTION' as const,
      clientId: persons[2]?.id,
      caseValueCents: 22000000,
      filingDate: new Date('2024-05-20'),
    },
  ];

  for (const data of cases) {
    if (!data.clientId) continue;
    const created = await prisma.case.upsert({
      where: { cnjNumber: `000${Math.random()}`.slice(0, 20) },
      update: {},
      create: {
        tenantId: tenant.id,
        ...data,
      },
    });
    // Movimento de Andamento
    await prisma.caseMovement.create({
      data: {
        tenantId: tenant.id,
        caseId: created.id,
        sequence: 1,
        occurredAt: new Date(),
        title: 'Petição deandu. Andamento registrado via seed.',
        description: 'Seed: movimento inicial',
        source: 'MANUAL',
      },
    });
    console.log(`  ✓ Processo criado: ${data.title.slice(0, 50)}`);
  }

  // === Tarefas de exemplo ===
  const tasks = [
    {
      title: 'Revisar contrato de honorários — Marina',
      description: 'Conferir minuta e enviar para assinatura digital.',
      status: 'TODO' as const,
      priority: 'HIGH' as const,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Protocolar contestação — Roberto Santos',
      description: 'Prazo fatal em 5 dias úteis.',
      status: 'DOING' as const,
      priority: 'URGENT' as const,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Reunião de alinhamento — TechSolutions',
      description: 'Alinhar estratégia do cumprimento de sentença.',
      status: 'TODO' as const,
      priority: 'MEDIUM' as const,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Elaborar relatório mensal — Clientes PJ',
      description: 'Relatório gerencial para os clientes pessoa jurídica.',
      status: 'TODO' as const,
      priority: 'LOW' as const,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const data of tasks) {
    await prisma.task.create({
      data: {
        tenantId: tenant.id,
        ...data,
        assignedToId: owner.id,
        createdById: owner.id,
      },
    });
  }
  console.log(`  ✓ ${tasks.length} tarefas criadas`);

  // === Leads de exemplo ===
  const leads = [
    {
      fullName: 'Fernanda Alves',
      email: 'fernanda.alves@email.com',
      phone: '(11) 98877-6655',
      status: 'NEW' as const,
      source: 'INSTAGRAM' as const,
      legalArea: 'FAMILIA' as const,
      estimatedValueCents: 3000000,
    },
    {
      fullName: 'Carlos Eduardo Mendes',
      email: 'carlos.mendes@corp.com.br',
      phone: '(21) 97766-5544',
      status: 'QUALIFIED' as const,
      source: 'REFERRAL' as const,
      legalArea: 'TRABALHISTA' as const,
      estimatedValueCents: 6000000,
    },
    {
      fullName: 'Dra. Patricia Advocacia Ltda.',
      email: 'contato@patriciaadvocacia.com.br',
      phone: '(19) 99887-6655',
      status: 'PROPOSAL' as const,
      source: 'ORGANIC' as const,
      legalArea: 'EMPRESARIAL' as const,
      estimatedValueCents: 12000000,
    },
  ];

  for (const data of leads) {
    await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        ...data,
        probability: 20,
        responsibleUserId: owner.id,
      },
    });
  }
  console.log(`  ✓ ${leads.length} leads criados`);

  console.log('');
  console.log('✅ Seed concluído.');
  console.log('');
  console.log('Credenciais de teste:');
  console.log(`  Owner     → owner@juris.com     (senha: Tamp@221122)`);
  console.log(`  Assistant → assistant@juris.com  (senha: Tamp@221122)`);
  console.log('');
  console.log('Clientes de exemplo: Marina Costa, Roberto Silva, TechSolutions, Sabor da Terra, Ana Beatriz');
}

main()
  .catch((e) => {
    console.error('❌ Seed falhou:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
