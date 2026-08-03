import { prisma } from '@juris-flow/db';
const us = await prisma.user.findMany({
  select: { id: true, email: true, fullName: true, tenantId: true, createdAt: true },
  orderBy: { createdAt: 'asc' },
});
console.log(JSON.stringify(us, null, 2));
await prisma.$disconnect();
