import { prisma } from '@juris-flow/db';
const cs = await prisma.case.findMany({
  where: { cnjNumber: { not: null } },
  select: { id: true, title: true, cnjNumber: true, tenantId: true, createdAt: true },
  orderBy: { createdAt: 'desc' },
  take: 5,
});
console.log(JSON.stringify(cs, null, 2));
await prisma.$disconnect();
