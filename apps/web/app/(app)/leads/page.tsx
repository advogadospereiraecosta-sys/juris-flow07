import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { LinkButton } from '@juris-flow/ui';
import { Plus, TrendingUp } from 'lucide-react';
import { LeadsKanban } from '@/components/leads/leads-kanban';

export const metadata = { title: 'Leads — Juris-Flow' };

const COLUMNS = [
  { id: 'NEW', label: 'Novo', color: 'text-ink-300' },
  { id: 'CONTACTED', label: 'Em contato', color: 'text-ciente-300' },
  { id: 'QUALIFIED', label: 'Qualificado', color: 'text-vara-300' },
  { id: 'PROPOSAL', label: 'Proposta', color: 'text-prazo-300' },
  { id: 'NEGOTIATION', label: 'Negociação', color: 'text-prazo-300' },
  { id: 'WON', label: 'Ganho', color: 'text-improcede-300' },
  { id: 'LOST', label: 'Perdido', color: 'text-rede-300' },
];

export default async function LeadsPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId;

  const leads = tenantId
    ? await prisma.lead.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: [{ createdAt: 'desc' }],
      })
    : [];

  const total = leads.length;
  const newCount = leads.filter((l) => l.status === 'NEW').length;
  const wonCount = leads.filter((l) => l.status === 'WON').length;

  const columns = COLUMNS.map((c) => ({
    ...c,
    leads: leads.filter((l) => l.status === c.id),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="vf-display-md text-2xl font-bold text-ink-50">Pipeline de Leads</h1>
          <p className="vf-caption text-ink-400 mt-0.5">
            {total} lead{total !== 1 ? 's' : ''} · {newCount} novo(s) · {wonCount} ganho(s)
          </p>
        </div>
        <LinkButton href="/leads/new" size="sm" rightIcon={<Plus className="h-4 w-4" />}>
          Novo lead
        </LinkButton>
      </div>

      {total === 0 ? (
        <div className="rounded-lg border border-ink-800 bg-ink-900/40 p-12 text-center">
          <TrendingUp className="h-12 w-12 text-ink-700 mx-auto mb-3" />
          <p className="text-ink-400 font-medium">Nenhum lead ainda</p>
          <p className="text-ink-500 text-sm mt-1">
            Capture leads manualmente ou via formulário público.
          </p>
          <LinkButton href="/leads/new" size="sm" variant="outline" className="mt-4">
            <Plus className="h-4 w-4 mr-1" /> Cadastrar primeiro lead
          </LinkButton>
        </div>
      ) : (
        <LeadsKanban columns={columns} />
      )}
    </div>
  );
}