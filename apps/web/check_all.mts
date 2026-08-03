import { prisma } from '@juris-flow/db';
const cs = await prisma.case.findMany({
  select: { id: true, title: true, cnjNumber: true, legalArea: true, clientId: true, createdAt: true },
  orderBy: { createdAt: 'desc' },
  take: 10,
});
console.log(JSON.stringify(cs, null, 2));
await prisma.$disconnect();
