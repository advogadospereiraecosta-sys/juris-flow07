import { prisma } from '@juris-flow/db';
const cs = await prisma.case.findMany({
  where: { OR: [{ title: { contains: 'Unicri' } }, { title: { contains: 'Kaliny' } }] },
  select: { id: true, title: true, legalArea: true, status: true, clientId: true, createdAt: true },
  orderBy: { createdAt: 'desc' },
  take: 5,
});
console.log(JSON.stringify(cs, null, 2));
await prisma.$disconnect();
