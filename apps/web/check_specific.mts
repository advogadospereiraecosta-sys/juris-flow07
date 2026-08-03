import { prisma } from '@juris-flow/db';
const id = '665591a4-de09-42bc-8ad7-b79a4f083153';
const c = await prisma.case.findUnique({ where: { id }, select: { id: true, cnjNumber: true, tenantId: true } });
console.log('Case found:', JSON.stringify(c, null, 2));

const u = await prisma.user.findMany({ where: { tenantId: c!.tenantId }, select: { id: true, fullName: true, email: true } });
console.log('Users:', u);
await prisma.$disconnect();
