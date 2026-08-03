import { prisma } from '@juris-flow/db';

const tasks = await prisma.task.findMany({
  where: { description: { contains: 'DataJud' }, status: 'TODO' },
  orderBy: { createdAt: 'desc' },
});

const seen = new Map<string, string>();
let removed = 0;
for (const t of tasks) {
  const key = `${t.caseId}:${t.title}`;
  if (seen.has(key)) {
    await prisma.task.delete({ where: { id: t.id } });
    removed++;
  } else {
    seen.set(key, t.id);
  }
}
console.log(`Tasks duplicadas removidas: ${removed} (de ${tasks.length} totais)`);
await prisma.$disconnect();
