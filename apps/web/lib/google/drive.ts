import { google, drive_v3 } from 'googleapis';
import { prisma } from '@juris-flow/db';
import { auth } from '@/lib/auth';

/**
 * Cliente Google Drive autenticado para o tenant atual.
 *
 * Carrega o refresh_token salvo em TenantDrive, gera um novo access_token
 * e devolve o cliente Drive.
 */

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/api/google/callback',
  );
}

export function getAuthUrl(state: string): string {
  const oauth2 = getOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // garante refresh_token
    scope: SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeCode(code: string) {
  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  return tokens;
}

export async function getDriveForCurrentTenant(): Promise<{
  drive: drive_v3.Drive;
  tenantDrive: { tenantId: string; rootFolderId: string; googleEmail: string | null };
} | null> {
  const session = await auth();
  if (!session?.user?.tenantId) return null;

  const td = await prisma.tenantDrive.findUnique({
    where: { tenantId: session.user.tenantId },
  });
  if (!td || td.disconnectedAt) return null;

  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({
    refresh_token: td.refreshToken,
    access_token: td.accessToken ?? undefined,
    expiry_date: td.expiresAt ? new Date(td.expiresAt).getTime() : undefined,
  });

  // Refresca access_token automaticamente se expirado
  oauth2.on('tokens', async (tokens) => {
    if (tokens.access_token || tokens.refresh_token) {
      await prisma.tenantDrive.update({
        where: { tenantId: td.tenantId },
        data: {
          accessToken: tokens.access_token ?? td.accessToken,
          refreshToken: tokens.refresh_token ?? td.refreshToken,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : td.expiresAt,
          lastSyncAt: new Date(),
        },
      });
    }
  });

  const drive = google.drive({ version: 'v3', auth: oauth2 });
  return {
    drive,
    tenantDrive: {
      tenantId: td.tenantId,
      rootFolderId: td.rootFolderId,
      googleEmail: td.googleEmail,
    },
  };
}

/**
 * Encontra ou cria uma pasta pelo nome dentro de um parent.
 * Idempotente — pode ser chamado múltiplas vezes.
 */
export async function ensureFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string,
): Promise<string> {
  // Busca
  const query = [
    `name = '${name.replace(/'/g, "\\'")}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `'${parentId}' in parents`,
    `trashed = false`,
  ].join(' and ');
  const res = await drive.files.list({ q: query, fields: 'files(id, name)', pageSize: 1 });
  const existing = res.data.files?.[0];
  if (existing?.id) return existing.id;

  // Cria
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });
  if (!created.data.id) throw new Error(`Falha ao criar pasta ${name}`);
  return created.data.id;
}

/**
 * Cria a estrutura padrão do tenant:
 *   Juris-Flow/
 *   ├── Clientes/
 *   ├── Templates/
 */
export async function bootstrapTenantFolders(rootFolderId: string) {
  const { drive } = (await getDriveForCurrentTenant())!;
  const clientesId = await ensureFolder(drive, 'Clientes', rootFolderId);
  const templatesId = await ensureFolder(drive, 'Templates', rootFolderId);
  return { clientesId, templatesId };
}

/**
 * Lista arquivos e subpastas em uma pasta.
 */
export async function listFolderContents(
  drive: drive_v3.Drive,
  folderId: string,
): Promise<drive_v3.Schema$File[]> {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink, iconLink)',
    orderBy: 'folder,name',
    pageSize: 100,
  });
  return res.data.files ?? [];
}

/**
 * Faz upload de um arquivo para uma pasta do Drive.
 */
export async function uploadFile(
  drive: drive_v3.Drive,
  folderId: string,
  filename: string,
  mimeType: string,
  data: Buffer | Uint8Array,
): Promise<drive_v3.Schema$File> {
  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(data),
    },
    fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink',
  });
  return res.data;
}

/**
 * Faz download de um arquivo como Buffer.
 */
export async function downloadFile(
  drive: drive_v3.Drive,
  fileId: string,
): Promise<{ data: Buffer; mimeType: string; filename: string }> {
  const meta = await drive.files.get({
    fileId,
    fields: 'name, mimeType',
  });
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' },
  );
  return {
    data: Buffer.from(res.data as ArrayBuffer),
    mimeType: meta.data.mimeType ?? 'application/octet-stream',
    filename: meta.data.name ?? 'arquivo',
  };
}

/**
 * Deleta arquivo (move pra lixeira; sem delete permanent pra permitir recover).
 */
export async function deleteFile(drive: drive_v3.Drive, fileId: string) {
  await drive.files.update({ fileId, requestBody: { trashed: true } });
}

/**
 * Cria uma pasta.
 */
export async function createFolder(
  drive: drive_v3.Drive,
  folderId: string,
  name: string,
): Promise<string> {
  return ensureFolder(drive, name, folderId);
}

// Lazy require para evitar carregar Readable em ambiente edge
import { Readable } from 'node:stream';