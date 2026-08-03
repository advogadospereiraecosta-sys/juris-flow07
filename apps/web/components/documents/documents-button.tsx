'use client';

import { useState } from 'react';
import { Button } from '@juris-flow/ui';
import { FolderOpen } from 'lucide-react';
import { DocumentsModal } from './documents-modal';

type Props = {
  /** Path inicial dentro do Drive (relativo à raiz do tenant). */
  drivePath: string;
  /** Label exibido no modal (ex: "Marina Costa Lima" ou "Processo 1234-56"). */
  scopeLabel: string;
  /** Aparência do botão. */
  variant?: 'primary' | 'outline' | 'ghost' | 'secondary';
};

export function DocumentsButton({ drivePath, scopeLabel, variant = 'outline' }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size="sm" onClick={() => setOpen(true)}>
        <FolderOpen className="h-4 w-4 mr-1" />
        Documentos
      </Button>
      <DocumentsModal open={open} onClose={() => setOpen(false)} initialPath={drivePath} scopeLabel={scopeLabel} />
    </>
  );
}