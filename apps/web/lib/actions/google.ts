'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';

/**
 * Desconecta Google Drive do tenant. Marca `disconnectedAt` no TenantDrive.
 * Os arquivos ficam no Drive do escritório (não apagamos nada).
 */
export async function disconnectDriveAction(): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return { success: false, error: 'Não autenticado' };
  }
  try {
    await prisma.tenantDrive.update({
      where: { tenantId: session.user.tenantId },
      data: { disconnectedAt: new Date() },
    });
    revalidatePath('/configuracoes/integracoes');
    return { success: true };
  } catch {
    return { success: false, error: 'Erro ao desconectar' };
  }
}