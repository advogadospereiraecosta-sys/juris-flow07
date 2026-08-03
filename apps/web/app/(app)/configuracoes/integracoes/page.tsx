import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Badge } from '@juris-flow/ui';
import { CheckCircle2, AlertTriangle, Cloud, Linkedin, RefreshCcw, Mail } from 'lucide-react';
import { DisconnectDriveButton } from '@/components/integrations/disconnect-drive-button';
import { classifyEmail } from '@/lib/google/email';
import Link from 'next/link';

export const metadata = { title: 'Integrações — Juris-Flow' };

type SearchParams = { ok?: string; error?: string; warn?: string };

export default async function IntegracoesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;

  const drive = tenantId
    ? await prisma.tenantDrive.findUnique({ where: { tenantId } })
    : null;

  const connected = !!drive && !drive.disconnectedAt;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="vf-display-md text-2xl font-bold text-ink-50">Integrações</h1>
        <p className="vf-caption text-ink-400 mt-0.5">
          Conecte serviços externos para turbinar seu escritório.
        </p>
      </div>

      {searchParams.ok === 'google' && (
        <div className="rounded-md border border-improcede-700 bg-improcede-950/40 px-4 py-3 text-sm text-improcede-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Google Drive conectado com sucesso.
        </div>
      )}
      {searchParams.warn === 'personal_email' && (
        <div className="rounded-md border border-prazo-700 bg-prazo-950/40 px-4 py-3 text-sm text-prazo-200">
          <p className="font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Conta pessoal detectada
          </p>
          <p className="mt-1 text-prazo-300/90 text-xs">
            Você conectou com <strong>{drive?.googleEmail}</strong>, um email pessoal
            (Gmail/Hotmail/etc). Recomendamos usar uma conta{' '}
            <strong>institucional do escritório</strong> (ex: contato@seumescritorio.com.br)
            para garantir que os arquivos permaneçam acessíveis ao escritório caso
            essa conta pessoal seja desativada ou o titular saia da empresa.
          </p>
        </div>
      )}
      {searchParams.error && (
        <div className="rounded-md border border-prazo-700 bg-prazo-950/40 px-4 py-3 text-sm text-prazo-300">
          {searchParams.error === 'google' && 'Erro ao conectar Google Drive. Tente novamente.'}
          {searchParams.error === 'missing_refresh' && (
            <>
              Google não retornou refresh_token. Vá em{' '}
              <a className="underline" href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
                Permissões da Conta Google
              </a>{' '}
              e remova o Juris-Flow, depois reconecte.
            </>
          )}
          {searchParams.error === 'missing_code' && 'Google não retornou código de autorização.'}
          {searchParams.error === 'bad_state' && 'Estado inválido. Tente novamente.'}
          {searchParams.error === 'not_connected' && 'Google Drive não está conectado.'}
        </div>
      )}

      {/* Google Drive */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink-800 text-white">
              <Cloud className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <CardTitle>Google Drive</CardTitle>
              <CardDescription>
                Armazene documentos na conta do escritório. Pasta raiz <code className="text-xs">Juris-Flow/</code> é criada no Drive automaticamente.
              </CardDescription>
            </div>
            {connected ? (
              <Badge variant="success">Conectado</Badge>
            ) : (
              <Badge variant="muted">Desconectado</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {connected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-ink-500 uppercase tracking-wider flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Conta Google
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-ink-200">{drive!.googleEmail ?? '—'}</p>
                    {(() => {
                      const cls = classifyEmail(drive!.googleEmail);
                      if (cls.kind === 'personal') {
                        return <Badge variant="warning" className="text-[10px]">Pessoal</Badge>;
                      }
                      if (cls.kind === 'institutional') {
                        return <Badge variant="success" className="text-[10px]">Institucional</Badge>;
                      }
                      return null;
                    })()}
                  </div>
                  {(() => {
                    const cls = classifyEmail(drive!.googleEmail);
                    if (cls.kind === 'personal') {
                      return (
                        <p className="text-[10px] text-prazo-400 mt-1">
                          Recomendamos reconectar com email institucional do escritório.
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div>
                  <p className="text-xs text-ink-500 uppercase tracking-wider">Conectado em</p>
                  <p className="text-ink-200">
                    {new Date(drive!.connectedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-improcede-700/40 bg-improcede-950/20 p-3 text-xs text-improcede-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Os arquivos ficam na conta Google do escritório. Juris-Flow apenas gerencia metadados e referências.</span>
              </div>
              <div className="flex gap-2">
                <Link href="/api/google/start">
                  <Button variant="outline" size="sm">
                    <RefreshCcw className="h-4 w-4 mr-1" />
                    Reconectar com outra conta
                  </Button>
                </Link>
                <DisconnectDriveButton />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border border-ink-800 bg-ink-900/40 p-3 text-xs text-ink-400 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-prazo-400 shrink-0 mt-0.5" />
                <span>
                  Você será redirecionado para o Google para autorizar. O escopo <code className="text-vara-300">drive.file</code> permite que o Juris-Flow acesse apenas arquivos dentro da pasta <code className="text-vara-300">Juris-Flow/</code> criada pelo app.
                </span>
              </div>
              <Link href="/api/google/start">
                <Button>
                  <Cloud className="h-4 w-4 mr-1" />
                  Conectar Google Drive
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/*Outras integrações (futuro) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink-800 text-ink-400">
              <Linkedin className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-ink-400">Mais integrações</CardTitle>
              <CardDescription>
                DataJud, DJEN, Asaas, Resend e Sentry disponíveis em breve.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}