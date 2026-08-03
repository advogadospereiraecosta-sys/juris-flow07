import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getDriveForCurrentTenant,
  ensureFolder,
  uploadFile,
  downloadFile,
  deleteFile,
} from '@/lib/google/drive';
import { prisma, audit } from '@juris-flow/db';

/**
 * POST /api/drive/files   (multipart/form-data)
 *
 * Campos esperados:
 *   folderPath  — string com path relativo à raiz (ex: "Clientes/Marina/Documentos")
 *   file        — arquivo
 *
 * GET  /api/drive/files?fileId=xxx   — download stream
 * DELETE /api/drive/files?fileId=xxx — trash
 */

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const ctx = await getDriveForCurrentTenant();
  if (!ctx) return NextResponse.json({ error: 'Drive não conectado' }, { status: 401 });
  const { drive, tenantDrive } = ctx;

  const formData = await req.formData();
  const folderPath = (formData.get('folderPath') as string | null) ?? '';
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo maior que 50 MB' }, { status: 413 });
  }

  const segments = folderPath.split('/').filter(Boolean);
  let folderId: string = tenantDrive.rootFolderId;
  for (const seg of segments) {
    folderId = await ensureFolder(drive, seg, folderId);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadFile(drive, folderId, file.name, file.type || 'application/octet-stream', buffer);

  await audit({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: 'CREATE',
    resourceType: 'drive_file',
    resourceId: uploaded.id ?? undefined,
    after: { name: uploaded.name, size: uploaded.size, folderPath },
  });

  return NextResponse.json({
    file: {
      id: uploaded.id,
      name: uploaded.name,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      webViewLink: uploaded.webViewLink,
    },
  });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const ctx = await getDriveForCurrentTenant();
  if (!ctx) return NextResponse.json({ error: 'Drive não conectado' }, { status: 401 });
  const { drive } = ctx;

  const url = new URL(req.url);
  const fileId = url.searchParams.get('fileId');
  if (!fileId) return NextResponse.json({ error: 'fileId ausente' }, { status: 400 });

  try {
    const { data, mimeType, filename } = await downloadFile(drive, fileId);
    await audit({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: 'READ',
      resourceType: 'drive_file',
      resourceId: fileId,
      after: { name: filename, download: true },
    });
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (e) {
    console.error('[GET files]', e);
    return NextResponse.json({ error: 'Erro ao baixar arquivo' }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const ctx = await getDriveForCurrentTenant();
  if (!ctx) return NextResponse.json({ error: 'Drive não conectado' }, { status: 401 });
  const { drive } = ctx;

  const url = new URL(req.url);
  const fileId = url.searchParams.get('fileId');
  if (!fileId) return NextResponse.json({ error: 'fileId ausente' }, { status: 400 });

  await deleteFile(drive, fileId);

  await audit({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: 'DELETE',
    resourceType: 'drive_file',
    resourceId: fileId,
  });

  return NextResponse.json({ ok: true });
}