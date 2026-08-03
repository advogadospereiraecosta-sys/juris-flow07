'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight, Calendar, Building2, FileText, Link2, Check, X, Circle } from 'lucide-react';
import { ignorarPublicacaoAction, criarTarefaDePublicacaoAction } from '@/lib/actions/publicacoes';

type Pub = {
  id: string;
  rawText: string;
  source: string;
  court: string | null;
  publishedAt: Date | string;
  oab: string | null;
  partyNames: string[];
  cnj: string | null;
  status: string;
  deadlineAt: Date | string | null;
  deadlineDays: number | null;
  caseId: string | null;
  case: { id: string; title: string } | null;
};

export function PublicationCard({ publication }: { publication: Pub }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();

  const isIgnored = publication.status === 'IGNORED';
  const isLinked = publication.status === 'LINKED';
  const isNew = publication.status === 'NEW';

  const deadlineDays = publication.deadlineAt
    ? differenceInDays(new Date(publication.deadlineAt), new Date())
    : null;
  const isOverdue = deadlineDays !== null && isPast(new Date(publication.deadlineAt!));
  const isTodayD = deadlineDays !== null && isToday(new Date(publication.deadlineAt!));

  function handleIgnore() {
    if (!confirm('Marcar esta publicação como ignorada? Ela sairá da inbox principal.')) return;
    startTransition(async () => {
      await ignorarPublicacaoAction(publication.id);
      router.refresh();
    });
  }

  return (
    <div
      className={`rounded-lg border ${
        isIgnored
          ? 'border-ink-800 bg-ink-900/20 opacity-60'
          : isOverdue || isTodayD
          ? 'border-prazo-700 bg-prazo-950/20'
          : isLinked
          ? 'border-improcede-700/40 bg-improcede-950/10'
          : 'border-prazo-800 bg-prazo-950/30'
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Avatar OAB / Status */}
        <div
          className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
            isLinked
              ? 'bg-improcede-950/40 text-improcede-300'
              : isIgnored
              ? 'bg-ink-800 text-ink-500'
              : 'bg-prazo-950/30 text-prazo-300'
          }`}
          title={publication.status}
        >
          {isLinked ? <Check className="h-4 w-4" /> : isIgnored ? <X className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-sm text-ink-100 font-medium">
              {publication.partyNames[0] ?? 'Publicação sem parte'} vs {publication.partyNames[1] ?? '—'}
            </p>
            {publication.case && (
              <Link
                href={`/processos/${publication.case.id}`}
                className="text-[10px] text-vara-400 bg-vara-950/30 px-2 py-0.5 rounded hover:bg-vara-950/50 truncate max-w-[200px]"
              >
                → {publication.case.title}
              </Link>
            )}
            {isLinked && publication.source === 'MANUAL' && (
              <span className="text-[10px] bg-blue-950/40 text-blue-300 px-1.5 py-0.5 rounded font-medium">
                Match auto
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-ink-500">
            {publication.cnj && (
              <span className="font-mono">{publication.cnj.replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6')}</span>
            )}
            {publication.court && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {publication.court}
              </span>
            )}
            {publication.oab && (
              <span>OAB {publication.oab}</span>
            )}
            {publication.deadlineAt && (
              <span
                className={`flex items-center gap-1 font-medium ${
                  isOverdue || isTodayD
                    ? 'text-prazo-300'
                    : 'text-improcede-400'
                }`}
              >
                <Calendar className="h-3 w-3" />
                {format(new Date(publication.deadlineAt), 'dd/MM', { locale: ptBR })}
                {' • '}
                {deadlineDays === null
                  ? '—'
                  : isOverdue
                  ? 'vencido'
                  : isTodayD
                  ? 'hoje'
                  : `${deadlineDays}d`}
              </span>
            )}
          </div>

          {/* Texto da publicação (mostra quando expande) */}
          {expanded && (
            <div className="mt-3 rounded-md border border-ink-800 bg-ink-950 p-3 max-h-48 overflow-y-auto">
              <p className="text-xs text-ink-300 whitespace-pre-wrap font-mono leading-relaxed">
                {publication.rawText}
              </p>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-ink-400 hover:text-ink-100 p-1"
            title={expanded ? 'Recolher texto' : 'Ver texto'}
          >
            <FileText className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={pending || !!publication.caseId || isIgnored}
            onClick={() => {
              if (!confirm('Criar tarefa de triagem com o prazo fatal desta publicação?')) return;
              startTransition(async () => {
                if (!publication.caseId) {
                  alert('Vincule primeiro a um caso via botão na linha da publicação.');
                  return;
                }
                await criarTarefaDePublicacaoAction({
                  publicationId: publication.id,
                  caseId: publication.caseId,
                });
                router.refresh();
              });
            }}
            className="rounded-md px-2 py-1 text-xs bg-ink-800 text-ink-200 hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Criar tarefa de triagem"
          >
            Tarefa
          </button>
          <button
            type="button"
            disabled={pending || isIgnored || isLinked}
            onClick={handleIgnore}
            className="rounded-md px-2 py-1 text-xs text-prazo-400 hover:text-prazo-200 hover:bg-prazo-950/40 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Ignorar
          </button>
        </div>
      </div>
    </div>
  );
}
