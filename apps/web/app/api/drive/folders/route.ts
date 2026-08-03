import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDriveForCurrentTenant, listFolderContents } from '@/lib/google/drive';
import { prisma } from '@juris-flow/db';
import { ensureFolder } from '@/lib/google/drive';

/**
 * GET /api/drive/folders?path=Clientes/Marina Costa
 *
 * Resolve um path no Drive (relativo à pasta raiz do tenant)
 * e devolve o id da pasta + lista de arquivos.
 */
export async function GET(req: Request) {
  const ctx = await getDriveForCurrentTenant();
  if (!ctx) {
    return NextResponse.json({ error: 'Drive não conectado' }, { status: 401 });
  }
  const { drive, tenantDrive } = ctx;

  const url = new URL(req.url);
  const pathParam = url.searchParams.get('path') ?? '';
  const segments = pathParam.split('/').filter(Boolean);

  let currentFolderId: string = tenantDrive.rootFolderId;
  for (const seg of segments) {
    currentFolderId = await ensureFolder(drive, seg, currentFolderId);
  }

  const files = await listFolderContents(drive, currentFolderId);

  return NextResponse.json({ folderId: currentFolderId, files });
}