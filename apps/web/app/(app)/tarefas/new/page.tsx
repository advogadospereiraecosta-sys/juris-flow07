import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@juris-flow/ui';
import { createTaskAction } from '@/lib/actions/tasks';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Nova Tarefa — Juris-Flow' };

export default async function NovaTarefaPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) redirect('/login');

  const [cases, users] = await Promise.all([
    prisma.case.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, title: true },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    }),
    prisma.user.findMany({
      where: { tenantId },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/tarefas" className="rounded-md p-1.5 hover:bg-ink-800 transition-colors">
          <ArrowLeft className="h-4 w-4 text-ink-400" />
        </Link>
        <div>
          <h1 className="vf-display-md text-2xl font-bold text-ink-50">Nova Tarefa</h1>
          <p className="vf-caption text-ink-400 mt-0.5">Crie uma tarefa e associe a um processo.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da tarefa</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData) => {
              'use server';
              const result = await createTaskAction({
                title: formData.get('title') as string,
                description: formData.get('description') as string || undefined,
                priority: (formData.get('priority') as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') || 'MEDIUM',
                status: 'TODO',
                dueDate: formData.get('dueDate') as string || undefined,
                caseId: formData.get('caseId') as string || undefined,
                assignedToId: formData.get('assignedToId') as string || undefined,
                tags: [],
              });
              if (result.success) redirect('/tarefas');
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="title" className="block text-xs font-medium text-ink-300 mb-1.5">
                Título <span className="text-rede-500">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                maxLength={200}
                placeholder="Ex: Redigir contestação — Processo X"
                className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-xs font-medium text-ink-300 mb-1.5">
                Descrição
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                maxLength={5000}
                placeholder="Detalhes, observações ou checklists..."
                className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="priority" className="block text-xs font-medium text-ink-300 mb-1.5">
                  Prioridade
                </label>
                <select
                  id="priority"
                  name="priority"
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM" selected>Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>

              <div>
                <label htmlFor="dueDate" className="block text-xs font-medium text-ink-300 mb-1.5">
                  Data de vencimento
                </label>
                <input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="caseId" className="block text-xs font-medium text-ink-300 mb-1.5">
                  Processo
                </label>
                <select
                  id="caseId"
                  name="caseId"
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
                >
                  <option value="">Nenhum</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="assignedToId" className="block text-xs font-medium text-ink-300 mb-1.5">
                  Responsável
                </label>
                <select
                  id="assignedToId"
                  name="assignedToId"
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
                >
                  <option value="">Não atribuída</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName ?? u.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/tarefas"
                className="rounded-md px-4 py-2 text-sm font-medium text-ink-300 hover:text-ink-100 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="rounded-md bg-vara-700 px-5 py-2 text-sm font-medium text-ink-50 hover:bg-vara-600 transition-colors"
              >
                Criar tarefa
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
