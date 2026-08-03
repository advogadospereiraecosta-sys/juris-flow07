import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { Card, CardContent, Badge, LinkButton, Input } from '@juris-flow/ui';
import { Search, Plus, CheckSquare } from 'lucide-react';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { createTaskAction } from '@/lib/actions/tasks';

export const metadata = { title: 'Tarefas — Juris-Flow' };

type SearchParams = { q?: string; caseId?: string };

const COLUMNS = [
  { id: 'TODO', label: 'A Fazer', color: 'text-ink-300' },
  { id: 'DOING', label: 'Em Progresso', color: 'text-prazo-400' },
  { id: 'BLOCKED', label: 'Bloqueada', color: 'text-rede-400' },
  { id: 'DONE', label: 'Concluído', color: 'text-improcede-400' },
];

export default async function TarefasPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const tenantId = session?.user.tenantId;
  const q = (searchParams.q ?? '').trim();

  const tasks = tenantId
    ? await prisma.task.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(searchParams.caseId ? { caseId: searchParams.caseId } : {}),
          ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
        },
        orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
        include: { case: { select: { id: true, title: true } } },
      })
    : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskRows: any[] = tasks;

  const columns = COLUMNS.map((col) => ({
    ...col,
    tasks: taskRows.filter((t) => t.status === col.id),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="vf-display-md text-2xl font-bold text-ink-50">Tarefas</h1>
          <p className="vf-caption text-ink-400 mt-0.5">
            {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''}
            {searchParams.caseId ? ' deste processo' : ''}
          </p>
        </div>
        <LinkButton href="/tarefas/new" size="sm" rightIcon={<Plus className="h-4 w-4" />}>
          Nova tarefa
        </LinkButton>
      </div>

      {/* Filtro */}
      <form className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <Input name="q" defaultValue={q} placeholder="Buscar tarefas..." className="pl-9" />
        </div>
        <button type="submit" className="rounded-md bg-vara-700 px-4 py-2 text-sm font-medium text-ink-50 hover:bg-vara-600">
          Buscar
        </button>
        {q && (
          <a href="/tarefas" className="flex items-center px-3 py-2 text-sm text-ink-400 hover:text-ink-200">
            Limpar
          </a>
        )}
      </form>

      <KanbanBoard columns={columns} />

      {/* Nova tarefa rápida */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-ink-400 mb-3 font-medium uppercase tracking-wider">Criar tarefa rápida</p>
          <form action={async (formData) => {
            'use server';
            await createTaskAction({
              title: formData.get('title') as string,
              priority: (formData.get('priority') as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') || 'MEDIUM',
              status: 'TODO',
              tags: [],
            });
          }} className="flex gap-2">
            <Input
              name="title"
              placeholder="Descrição da tarefa..."
              required
              className="flex-1"
            />
            <select
              name="priority"
              className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-200"
            >
              <option value="LOW">Baixa</option>
              <option value="MEDIUM" selected>Média</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
            <button
              type="submit"
              className="rounded-md bg-vara-700 px-4 py-2 text-sm font-medium text-ink-50 hover:bg-vara-600"
            >
              Criar
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
