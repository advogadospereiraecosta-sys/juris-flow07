'use client';

import { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { Badge } from '@juris-flow/ui';
import { updateTaskAction } from '@/lib/actions/tasks';
import { revalidatePath } from 'next/cache';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Task = any;

type Column = {
  id: string;
  label: string;
  color: string;
  tasks: Task[];
};

type Props = { columns: Column[] };

const PRIORITY_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'muted' }> = {
  LOW: { label: 'B', variant: 'muted' },
  MEDIUM: { label: 'M', variant: 'muted' },
  HIGH: { label: 'A', variant: 'warning' },
  URGENT: { label: 'U', variant: 'danger' },
};

const COL_STATUS: Record<string, string> = {
  TODO: 'TODO',
  DOING: 'DOING',
  BLOCKED: 'BLOCKED',
  DONE: 'DONE',
};

export function KanbanBoard({ columns: initialColumns }: Props) {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  function findTask(taskId: string): { task: Task; colId: string } | null {
    for (const col of columns) {
      const task = col.tasks.find((t) => t.id === taskId);
      if (task) return { task, colId: col.id };
    }
    return null;
  }

  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDraggedId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  }

  function handleDragLeave() {
    setDragOverCol(null);
  }

  async function handleDrop(e: React.DragEvent, targetColId: string) {
    e.preventDefault();
    setDragOverCol(null);

    if (!draggedId) return;
    const found = findTask(draggedId);
    if (!found || found.colId === targetColId) {
      setDraggedId(null);
      return;
    }

    const taskId = draggedId;
    const newStatus = COL_STATUS[targetColId] ?? targetColId;

    // Optimistic update
    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, tasks: [...col.tasks] }));
      const srcCol = next.find((c) => c.id === found.colId)!;
      const tgtCol = next.find((c) => c.id === targetColId)!;
      const taskIdx = srcCol.tasks.findIndex((t) => t.id === taskId);
      if (taskIdx === -1) return prev;
      const [task] = srcCol.tasks.splice(taskIdx, 1);
      tgtCol.tasks.push({ ...task, status: newStatus });
      return next;
    });
    setDraggedId(null);

    // Persist
    await updateTaskAction(taskId, { status: newStatus as 'TODO' | 'DOING' | 'BLOCKED' | 'DONE' | 'CANCELLED' });
    revalidatePath('/tarefas');
    revalidatePath('/dashboard');
  }

  const COLUMN_HEADER_COLORS: Record<string, string> = {
    TODO: 'bg-ink-800 text-ink-300',
    DOING: 'bg-prazo-900/50 text-prazo-300',
    BLOCKED: 'bg-rede-950/50 text-rede-300',
    DONE: 'bg-improcede-950/50 text-improcede-300',
  };

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
      {columns.map((col) => (
        <div
          key={col.id}
          className={`
            rounded-lg border bg-ink-900/50 min-h-[500px]
            ${dragOverCol === col.id ? 'border-vara-600 ring-1 ring-vara-600/30' : 'border-ink-800'}
          `}
          onDragOver={(e) => handleDragOver(e, col.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, col.id)}
        >
          {/* Column header */}
          <div className={`flex items-center justify-between rounded-t-lg px-3 py-2.5 ${COLUMN_HEADER_COLORS[col.id] ?? 'bg-ink-800 text-ink-300'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold uppercase tracking-wider ${col.color}`}>{col.label}</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-800 text-[10px] font-semibold text-ink-300">
                {col.tasks.length}
              </span>
            </div>
          </div>

          {/* Tasks */}
          <div className="space-y-2 p-2">
            {col.tasks.length === 0 && (
              <p className="text-center text-[10px] text-ink-600 py-8">Arraste tarefas para cá</p>
            )}
            {col.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isDragging={draggedId === task.id}
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskCard({
  task,
  isDragging,
  onDragStart,
}: {
  task: Task;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  const priorityCfg = PRIORITY_CONFIG[task.priority] ?? { label: task.priority, variant: 'default' as const };
  const isOverdue = task.dueDate && task.status !== 'DONE' && isPast(new Date(task.dueDate));
  const isDueToday = task.dueDate && task.status !== 'DONE' && isToday(new Date(task.dueDate));

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className={`
        rounded-md border bg-ink-950 p-3 cursor-grab active:cursor-grabbing select-none
        hover:border-ink-600 transition-colors
        ${isDragging ? 'opacity-40 border-vara-600' : 'border-ink-800'}
        ${task.status === 'DONE' ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-xs leading-snug flex-1 ${task.status === 'DONE' ? 'line-through text-ink-500' : 'text-ink-200'}`}>
          {task.title}
        </p>
        <Badge variant={priorityCfg.variant} className="text-[9px] w-4 h-4 p-0 flex items-center justify-center shrink-0" title={`Prioridade ${priorityCfg.label}`}>
          {priorityCfg.label}
        </Badge>
      </div>

      <div className="flex items-center justify-between mt-2">
        {task.dueDate && (
          <span className={`text-[10px] ${isOverdue ? 'text-rede-400 font-medium' : isDueToday ? 'text-prazo-400 font-medium' : 'text-ink-500'}`}>
            {isOverdue ? '⚠' : isDueToday ? '⏰' : '📅'}{' '}
            {format(new Date(task.dueDate), 'dd/MM')}
          </span>
        )}
        {task.case && (
          <span className="text-[10px] text-ink-600 truncate max-w-[100px]" title={task.case.title}>
            {task.case.title}
          </span>
        )}
      </div>

      {task.description && (
        <p className="text-[10px] text-ink-600 mt-1.5 line-clamp-2">{task.description}</p>
      )}
    </div>
  );
}
