import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge-safe middleware (sem dependência do Prisma/NextAuth).
 *
 * Apenas verifica presença de cookie de sessão. A validação real
 * (decodificação do JWT) é feita nos route handlers via `auth()`.
 *
 * Protege toda rota que não seja pública:
 * - /login, /signup, /api/auth/*, /api/signup → público
 * - /, /privacidade, /termos → público
 * - /_next, /favicon, /api/webhooks → público (assets / webhooks assinados)
 * - resto → exige cookie de sessão
 */

const PUBLIC_PREFIXES = ['/login', '/signup', '/api/auth', '/api/signup', '/api/cnpj', '/api/cep', '/api/cnj', '/api/datajud'];
const PUBLIC_EXACT = new Set(['/', '/privacidade', '/termos']);

const SESSION_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Sempre liberta assets internos do Next
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Sempre liberta webhooks (validados por assinatura)
  if (pathname.startsWith('/api/webhooks')) {
    return NextResponse.next();
  }

  const isPublic =
    PUBLIC_EXACT.has(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (isPublic) return NextResponse.next();

  const hasSession = SESSION_COOKIE_NAMES.some((name) => req.cookies.has(name));
  if (!hasSession) {
    const url = new URL('/login', req.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};