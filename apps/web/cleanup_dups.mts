import { prisma } from '@juris-flow/db';

// Remove tasks duplicadas (mesmo título + caseId)
const dupes = await prisma.task.findMany({
  where: { description: { contains: 'DataJud' } },
  orderBy: { createdAt: 'desc' },
});

const seen = new Map<string, string>();
let removed = 0;
for (const t of dupes) {
  const key = `${t.caseId}:${t.title}:${(t.description || '').slice(0, 30)}`;
  if (seen.has(key)) {
    await prisma.task.delete({ where: { id: t.id } });
    removed++;
  } else {
    seen.set(key, t.id);
  }
}
console.log(`Tasks duplicadas removidas: ${removed}`);
await prisma.$disconnect();
