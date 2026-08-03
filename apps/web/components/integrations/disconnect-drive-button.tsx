'use client';

import { useTransition } from 'react';
import { Button } from '@juris-flow/ui';
import { Unlink } from 'lucide-react';
import { disconnectDriveAction } from '@/lib/actions/google';

export function DisconnectDriveButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm('Desconectar o Google Drive? Os arquivos no Drive não serão apagados.')) return;
        start(async () => {
          await disconnectDriveAction();
        });
      }}
    >
      <Unlink className="h-4 w-4 mr-1" />
      {pending ? 'Desconectando...' : 'Desconectar'}
    </Button>
  );
}