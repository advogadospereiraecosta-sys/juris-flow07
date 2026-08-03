import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { google } from 'googleapis';
import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { getAuthUrl } from '@/lib/google/drive';
import crypto from 'node:crypto';

const COOKIE = 'gdrive_oauth_state';

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.redirect(new URL('/login', process.env.AUTH_URL ?? 'http://localhost:3000'));
  }

  const state = crypto.randomBytes(24).toString('hex');
  const cookieStore = cookies();
  cookieStore.set(COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  });

  return NextResponse.redirect(getAuthUrl(state));
}