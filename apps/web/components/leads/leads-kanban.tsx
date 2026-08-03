'use client';

import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@juris-flow/ui';
import { Mail, Phone, Calendar, DollarSign, Eye } from 'lucide-react';
import Link from 'next/link';
import { moveLeadAction } from '@/lib/actions/leads';
import { revalidatePath } from 'next/cache';
import clsx from 'clsx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lead = any;

type Column = {
  id: string;
  label: string;
  color: string;
  leads: Lead[];
};

type Props = { columns: Column[] };

const SOURCE_LABEL: Record<string, string> = {
  ORGANIC: 'Orgânico',
  REFERRAL: 'Indicação',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  GOOGLE_ADS: 'Google Ads',
  LINKEDIN: 'LinkedIn',
  YOUTUBE: 'YouTube',
  EVENT: 'Evento',
  OTHER: 'Outro',
};

const LEGAL_AREA_LABEL: Record<string, string> = {
  CIVEL: 'Cível',
  TRABALHISTA: 'Trabalhista',
  CRIMINAL: 'Criminal',
  FAMILIA: 'Família',
  TRIBUTARIO: 'Tributário',
  PREVIDENCIARIO: 'Previdenciário',
  EMPRESARIAL: 'Empresarial',
  CONSUMIDOR: 'Consumidor',
  ADMINISTRATIVO: 'Administrativo',
  IMOBILIARIO: 'Imobiliário',
  OUTRO: 'Outro',
};

function formatCents(cents: bigint | number | null | undefined): string {
  if (cents == null) return '';
  const n = typeof cents === 'bigint' ? Number(cents) : cents;
  if (n === 0) return '';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(n / 100);
}

export function LeadsKanban({ columns: initialColumns }: Props) {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  function findLead(leadId: string): { lead: Lead; colId: string } | null {
    for (const col of columns) {
      const lead = col.leads.find((l) => l.id === leadId);
      if (lead) return { lead, colId: col.id };
    }
    return null;
  }

  function handleDragStart(e: React.DragEvent, leadId: string) {
    setDraggedId(leadId);
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
    const found = findLead(draggedId);
    if (!found || found.colId === targetColId) {
      setDraggedId(null);
      return;
    }
    const leadId = draggedId;
    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, leads: [...col.leads] }));
      const srcCol = next.find((c) => c.id === found.colId)!;
      const tgtCol = next.find((c) => c.id === targetColId)!;
      const idx = srcCol.leads.findIndex((l) => l.id === leadId);
      if (idx === -1) return prev;
      const [lead] = srcCol.leads.splice(idx, 1);
      lead.status = targetColId;
      tgtCol.leads.unshift(lead);
      return next;
    });
    setDraggedId(null);
    await moveLeadAction(leadId, targetColId);
    revalidatePath('/leads');
    revalidatePath('/dashboard');
  }

  const COLUMN_HEADER: Record<string, string> = {
    NEW: 'bg-ink-800 text-ink-300',
    CONTACTED: 'bg-ciente-900/50 text-ciente-300',
    QUALIFIED: 'bg-vara-900/50 text-vara-300',
    PROPOSAL: 'bg-prazo-900/50 text-prazo-300',
    NEGOTIATION: 'bg-prazo-900/70 text-prazo-200',
    WON: 'bg-improcede-950/50 text-improcede-300',
    LOST: 'bg-rede-950/30 text-rede-300',
  };

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
      {columns.map((col) => (
        <div
          key={col.id}
          className={clsx(
            'rounded-lg border bg-ink-900/50 min-h-[500px]',
            dragOverCol === col.id ? 'border-vara-600 ring-1 ring-vara-600/30' : 'border-ink-800',
          )}
          onDragOver={(e) => handleDragOver(e, col.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, col.id)}
        >
          <div className={`flex items-center justify-between rounded-t-lg px-3 py-2.5 ${COLUMN_HEADER[col.id] ?? 'bg-ink-800 text-ink-300'}`}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider">{col.label}</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-800 text-[10px] font-semibold text-ink-300">
                {col.leads.length}
              </span>
            </div>
          </div>
          <div className="space-y-2 p-2">
            {col.leads.length === 0 && (
              <p className="text-center text-[10px] text-ink-600 py-8">Arraste leads para cá</p>
            )}
            {col.leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                isDragging={draggedId === lead.id}
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LeadCard({
  lead,
  isDragging,
  onDragStart,
}: {
  lead: Lead;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  const areaLabel = lead.legalArea ? LEGAL_AREA_LABEL[lead.legalArea] ?? lead.legalArea : null;
  const value = formatCents(lead.estimatedValueCents);
  const nextAction = lead.nextActionAt ? new Date(lead.nextActionAt) : null;
  const isOverdue = nextAction && nextAction < new Date();

  return (
    <Link
      href={`/leads/${lead.id}`}
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      className={clsx(
        'block rounded-md border bg-ink-950 p-3 cursor-grab active:cursor-grabbing transition-colors',
        'hover:border-ink-600',
        isDragging ? 'opacity-40 border-vara-600' : 'border-ink-800',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink-100 flex-1 min-w-0 truncate">{lead.fullName}</p>
        {lead.probability > 0 && (
          <span className="text-[10px] text-ink-500 shrink-0">{lead.probability}%</span>
        )}
      </div>

      <div className="space-y-1 mt-2 text-[10px] text-ink-500">
        {lead.email && (
          <p className="flex items-center gap-1 truncate">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{lead.email}</span>
          </p>
        )}
        {lead.phone && (
          <p className="flex items-center gap-1">
            <Phone className="h-3 w-3 shrink-0" />
            {lead.phone}
          </p>
        )}
        {value && (
          <p className="flex items-center gap-1 text-vara-400 font-medium">
            <DollarSign className="h-3 w-3 shrink-0" />
            {value}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-ink-800">
        {areaLabel ? (
          <Badge variant="muted" className="text-[9px]">{areaLabel}</Badge>
        ) : (
          <span />
        )}
        {nextAction && (
          <span className={clsx(
            'text-[10px] flex items-center gap-1',
            isOverdue ? 'text-rede-400 font-medium' : 'text-ink-500',
          )}>
            <Calendar className="h-3 w-3" />
            {format(nextAction, 'dd/MM')}
          </span>
        )}
      </div>
    </Link>
  );
}