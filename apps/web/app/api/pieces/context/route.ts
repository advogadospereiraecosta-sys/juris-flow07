import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pieces/context
 *
 * Devolve clientes + processos do tenant para preencher os selects
 * de vinculação na tela de nova peça. Inclui dados pessoais completos
 * do cliente para auto-fill (CPF/CNPJ, endereço, telefones).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const { tenantId } = session.user;

  const [clients, cases] = await Promise.all([
    prisma.client.findMany({
      where: { tenantId },
      select: {
        id: true,
        personId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.case.findMany({
      where: { tenantId },
      select: {
        id: true,
        title: true,
        cnjNumber: true,
        clientId: true,
        court: true,
        district: true,
        legalArea: true,
        procedureType: true,
        opposingPartyName: true,
        opposingPartyCpf: true,
        opposingPartyCnpj: true,
        opposingLawyerName: true,
        opposingLawyerOab: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    }),
  ]);

  // Busca persons em batch
  const personIds = clients.map((c) => c.personId).filter(Boolean);
  const persons = await prisma.person.findMany({
    where: { id: { in: personIds } },
    select: {
      id: true,
      fullName: true,
      legalName: true,
      cpf: true,
      cnpj: true,
      email: true,
      phone: true,
      whatsapp: true,
      address: true,
    },
  });
  const personById = new Map(persons.map((p) => [p.id, p]));

  return NextResponse.json({
    clients: clients.map((c) => {
      const p = personById.get(c.personId);
      if (!p) {
        return { id: c.id, name: null };
      }
      const addr = (p.address as Record<string, unknown> | null) ?? null;
      const address = addr
        ? [addr.street, addr.number, addr.complement, addr.neighborhood, addr.city, addr.state, addr.zipCode]
            .filter(Boolean)
            .join(', ')
        : null;
      return {
        id: c.id,
        name: p.legalName ?? p.fullName,
        fullName: p.fullName,
        legalName: p.legalName,
        cpf: p.cpf,
        cnpj: p.cnpj,
        cpfCnpj: p.cnpj ?? p.cpf ?? null,
        email: p.email,
        phone: p.phone ?? p.whatsapp,
        address: address || null,
      };
    }),
    cases: cases.map((c) => ({
      id: c.id,
      title: c.title,
      cnjNumber: c.cnjNumber,
      clientId: c.clientId,
      court: c.court,
      district: c.district,
      legalArea: c.legalArea,
      procedureType: c.procedureType,
      opposingPartyName: c.opposingPartyName,
      opposingPartyCpf: c.opposingPartyCpf,
      opposingPartyCnpj: c.opposingPartyCnpj,
      opposingLawyerName: c.opposingLawyerName,
      opposingLawyerOab: c.opposingLawyerOab,
    })),
  });
}
