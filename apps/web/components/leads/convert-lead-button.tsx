'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@juris-flow/ui';
import { UserCheck, Loader2 } from 'lucide-react';
import { convertLeadToClientAction } from '@/lib/actions/leads';

type Props = { leadId: string };

export function ConvertLeadButton({ leadId }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm('Converter este lead em cliente? Será criada uma nova ficha PF/PJ e movido para Ganho.')) return;
    start(async () => {
      const result = await convertLeadToClientAction(leadId);
      if (!result.success) {
        setError(result.error ?? 'Erro');
        return;
      }
      router.push(`/clients/${result.data?.clientId}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end">
      <Button variant="primary" size="sm" disabled={pending} onClick={handleClick}>
        {pending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserCheck className="h-4 w-4 mr-1" />}
        Converter em cliente
      </Button>
      {error && <p className="text-xs text-prazo-400 mt-1">{error}</p>}
    </div>
  );
}