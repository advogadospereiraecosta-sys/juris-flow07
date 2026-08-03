import { prisma } from '@juris-flow/db';
const cs = await prisma.case.findMany({
  select: { id: true, title: true, legalArea: true, status: true, clientId: true, createdAt: true, tenant: { select: { plan: true } } },
  orderBy: { createdAt: 'desc' },
  take: 5,
});
console.log(JSON.stringify(cs, null, 2));
await prisma.$disconnect();
