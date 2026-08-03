import Link from 'next/link';
import { cookies } from 'next/headers';
import { LogoLockup, Button, Input, Card, CardContent } from '@juris-flow/ui';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  // Se já tem sessão, redireciona
  const session = await auth();
  if (session?.user) {
    redirect('/dashboard');
  }

  // Para o Credentials provider do NextAuth v5, o form precisa enviar
  // csrfToken no body E o cookie authjs.csrf-token deve estar presente.
  // O cookie é setado automaticamente quando o usuário acessa /api/auth/csrf.
  //
  // Estratégia correta: ao renderizar /login, garantimos que o cookie
  // existe. Se não existir, o usuário é redirecionado para o endpoint
  // csrf antes de voltar (impossível em SSR). Então a abordagem é:
  // 1. SETAR o cookie via response se ele não existe.
  // 2. Enviar o mesmo token no form.
  //
  // Vamos implementar via Server Action que gera ambos.
  const existingCookie = cookies().get('authjs.csrf-token')?.value;

  let csrfToken = '';
  if (existingCookie) {
    // O cookie tem o formato "token|hash". O token puro é a parte antes do "|"
    csrfToken = existingCookie.split('|')[0] ?? '';
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Juris-Flow">
            <LogoLockup />
          </Link>
        </div>

        <Card>
          <CardContent className="p-8">
            <h1 className="vf-heading text-2xl text-ink-50">Entrar</h1>
            <p className="vf-caption mt-1">
              Acesse o painel do seu escritório.
            </p>

            {searchParams.error === 'CredentialsSignin' && (
              <div className="mt-4 rounded-md border border-improcede-700 bg-improcede-900/40 px-3 py-2 text-sm text-improcede-200">
                Email ou senha incorretos.
              </div>
            )}
            {searchParams.error === 'MissingCSRF' && (
              <div className="mt-4 rounded-md border border-prazo-700 bg-prazo-900/40 px-3 py-2 text-sm text-prazo-200">
                Sessão expirou. Tente novamente.
              </div>
            )}

            {existingCookie && (
              <form
                method="post"
                action="/api/auth/callback/credentials"
                className="mt-6 space-y-4"
              >
                <input type="hidden" name="csrfToken" value={csrfToken} />
                <input
                  type="hidden"
                  name="callbackUrl"
                  value={searchParams.callbackUrl ?? '/dashboard'}
                />

                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-ink-200"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                    autoComplete="email"
                    leftIcon={<Mail />}
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium text-ink-200"
                  >
                    Senha
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoComplete="current-password"
                    leftIcon={<Lock />}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-ink-300">
                    <input
                      type="checkbox"
                      name="remember"
                      className="rounded border-ink-700 bg-ink-900"
                    />
                    Lembrar-me
                  </label>
                  <Link
                    href="/esqueci-senha"
                    className="text-vara-400 hover:text-vara-300"
                  >
                    Esqueci a senha
                  </Link>
                </div>

                <Button type="submit" size="lg" className="w-full" rightIcon={<ArrowRight />}>
                  Entrar
                </Button>
              </form>
            )}

            {!existingCookie && (
              // Se não tem cookie csrf, primeiro garantimos que ele seja criado.
              // Ao clicar, o navegador faz GET /api/auth/csrf que seta o cookie
              // e redireciona de volta.
              <form
                method="get"
                action="/api/auth/csrf"
                className="mt-6 space-y-4"
              >
                <input
                  type="hidden"
                  name="redirect"
                  value="/login"
                />
                <Button type="submit" size="lg" className="w-full">
                  Continuar para o login
                </Button>
                <p className="vf-caption text-center text-xs">
                  (Primeiro acesso — vamos preparar sua sessão segura)
                </p>
              </form>
            )}

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ink-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-ink-800 px-2 text-ink-400">ou</span>
              </div>
            </div>

            <Button variant="outline" size="lg" className="w-full" type="button" disabled>
              <GoogleIcon />
              Continuar com Google
              <span className="text-xs text-ink-500">(em breve)</span>
            </Button>

            <p className="mt-6 text-center text-sm text-ink-400">
              Ainda não tem conta?{' '}
              <Link href="/signup" className="text-vara-400 hover:text-vara-300">
                Comece grátis
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}