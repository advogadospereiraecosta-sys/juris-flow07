'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { QuickCreateClientModal } from './quick-create-modal';

type Client = { id: string; name: string | null; fullName?: string | null };

type Props = {
  initialClients: Client[];
  initialSelected?: string;
};

export function ClientSelect({ initialClients, initialSelected = '' }: Props) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [selected, setSelected] = useState(initialSelected);
  const [openModal, setOpenModal] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null);

  function handleCreated(client: { id: string; personId?: string; name: string }) {
    console.log('[client-select] handleCreated chamado:', client);
    // Adiciona na lista e seleciona
    // Nota: clientId no DB aponta pra Person (não pra Client)
    const novo: Client = { id: client.personId ?? client.id, name: client.name };
    setClients((prev) => {
      const semDuplicata = prev.filter((c) => c.id !== novo.id);
      return [novo, ...semDuplicata];
    });
    // Seta selected IMEDIATAMENTE (antes do re-render)
    setSelected(novo.id);
    console.log('[client-select] selected setado para:', novo.id);
    setJustCreated(novo.id);
    setTimeout(() => setJustCreated(null), 3000);
  }

  // Garante que o `name="clientId"` no DOM está sincronizado com o state
  // (React controlled input — deve já estar, mas reforçamos por garantia)
  useEffect(() => {
    // No-op agora — só placeholder para caso de precisar
  }, [selected]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label htmlFor="clientId" className="block text-xs font-medium text-ink-300 whitespace-nowrap">
          Cliente
        </label>
        <select
          id="clientId"
          name="clientId"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 min-w-0 rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
        >
          <option value="">Sem cliente vinculado</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name ?? '—'}
              {justCreated === c.id ? ' (criado agora)' : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setOpenModal(true)}
          className="shrink-0 inline-flex items-center gap-1 rounded-md border border-vara-700 bg-vara-950/30 px-2 py-2 text-vara-300 hover:bg-vara-950/60 transition-colors"
          title="Cadastrar cliente sem sair desta tela"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {justCreated && (
        <div className="flex items-center gap-1 text-[10px] text-improcede-400">
          <CheckCircle2 className="h-3 w-3" />
          Cliente cadastrado e selecionado automaticamente.
        </div>
      )}

      <QuickCreateClientModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
