import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { google } from 'googleapis';
import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { exchangeCode } from '@/lib/google/drive';
import { isPersonalEmail } from '@/lib/google/email';

const COOKIE = 'gdrive_oauth_state';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.redirect(new URL('/login', process.env.AUTH_URL ?? 'http://localhost:3000'));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    console.error('[google/callback] error from Google:', error);
    return NextResponse.redirect(new URL('/configuracoes/integracoes?error=google', req.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL('/configuracoes/integracoes?error=missing_code', req.url));
  }

  const expected = cookies().get(COOKIE)?.value;
  if (!expected || expected !== state) {
    return NextResponse.redirect(new URL('/configuracoes/integracoes?error=bad_state', req.url));
  }
  cookies().delete(COOKIE);

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL('/configuracoes/integracoes?error=missing_refresh', req.url),
      );
    }

    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/api/google/callback',
    );
    oauth2.setCredentials(tokens);

    // Google People API (openid) — alternativa simples: tokeninfo
    let email: string | null = null;
    let sub: string | null = null;
    try {
      const tokenInfo = await oauth2.getTokenInfo(tokens.access_token!);
      email = tokenInfo.email ?? null;
      sub = tokenInfo.sub ?? null;
    } catch (e) {
      console.warn('[google/callback] tokeninfo falhou:', e);
    }

    // Cria pasta raiz "Juris-Flow" no Drive do escritório
    const drive = google.drive({ version: 'v3', auth: oauth2 });
    const root = await drive.files.create({
      requestBody: {
        name: 'Juris-Flow',
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Pasta raiz da integração com Juris-Flow. Não mova arquivos para fora daqui.',
      },
      fields: 'id',
    });
    if (!root.data.id) throw new Error('Falha ao criar pasta raiz');

    await prisma.tenantDrive.upsert({
      where: { tenantId: session.user.tenantId },
      update: {
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token ?? null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        googleEmail: email,
        googleUserId: sub,
        rootFolderId: root.data.id,
        disconnectedAt: null,
        lastSyncAt: new Date(),
      },
      create: {
        tenantId: session.user.tenantId,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token ?? null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        googleEmail: email,
        googleUserId: sub,
        rootFolderId: root.data.id,
      },
    });

    // Cria estrutura padrão
    const subFolders = [
      { name: 'Clientes', mimeType: 'application/vnd.google-apps.folder' },
      { name: 'Templates', mimeType: 'application/vnd.google-apps.folder' },
    ];
    for (const f of subFolders) {
      await drive.files.create({
        requestBody: { name: f.name, mimeType: f.mimeType, parents: [root.data.id] },
        fields: 'id',
      });
    }

    const warnFlag = isPersonalEmail(email) ? '&warn=personal_email' : '';
    return NextResponse.redirect(new URL(`/configuracoes/integracoes?ok=google${warnFlag}`, req.url));
  } catch (e) {
    console.error('[google/callback]', e);
    return NextResponse.redirect(new URL('/configuracoes/integracoes?error=google', req.url));
  }
}