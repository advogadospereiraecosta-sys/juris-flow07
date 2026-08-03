import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogoLockup, Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@juris-flow/ui';
import { Mail, Lock, User, Building } from 'lucide-react';
import { auth } from '@/lib/auth';

export default async function SignupPage() {
  // Se já logado, manda pro dashboard
  const session = await auth();
  if (session?.user) redirect('/dashboard');

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Juris-Flow">
            <LogoLockup />
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Comece grátis por 14 dias</CardTitle>
            <CardDescription>
              Plano Pro por 14 dias. Sem cartão. Após o trial, escolha Free, Essencial ou Pro.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <form
              method="post"
              action="/api/signup"
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-1.5 block text-sm font-medium text-ink-200"
                >
                  Seu nome completo
                </label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Ana Pereira da Silva"
                  required
                  autoComplete="name"
                  leftIcon={<User />}
                />
              </div>

              <div>
                <label
                  htmlFor="tenantName"
                  className="mb-1.5 block text-sm font-medium text-ink-200"
                >
                  Nome do escritório
                </label>
                <Input
                  id="tenantName"
                  name="tenantName"
                  type="text"
                  placeholder="Pereira & Advogados Associados"
                  required
                  leftIcon={<Building />}
                />
              </div>

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
                  placeholder="[email protected]"
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
                  Senha (mín. 8 caracteres)
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  leftIcon={<Lock />}
                />
              </div>

              <div className="flex items-start gap-2 pt-2">
                <input
                  id="lgpd-consent"
                  name="lgpdConsent"
                  type="checkbox"
                  required
                  className="mt-0.5 rounded border-ink-700 bg-ink-900"
                />
                <label htmlFor="lgpd-consent" className="text-xs text-ink-300">
                  Concordo com a{' '}
                  <Link href="/privacidade" className="text-vara-400 hover:underline">
                    Política de Privacidade
                  </Link>{' '}
                  e os{' '}
                  <Link href="/termos" className="text-vara-400 hover:underline">
                    Termos de Uso
                  </Link>
                  . (LGPD art. 7º, V)
                </label>
              </div>

              <Button type="submit" size="lg" className="w-full">
                Criar conta grátis
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-ink-400">
              Já tem conta?{' '}
              <Link href="/login" className="text-vara-400 hover:text-vara-300">
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
