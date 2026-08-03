'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent } from '@juris-flow/ui';
import { ArrowRight, Loader2, Shield, Eye, Lock, FileText, Cookie } from 'lucide-react';
import { saveOnboardingStep1Action } from '@/lib/actions/onboarding';

export function OnboardingStep1() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  function handleSubmit(formData: FormData) {
    setError('');
    start(async () => {
      const result = await saveOnboardingStep1Action(formData);
      if (!result.success) {
        setError(result.error ?? 'Erro ao aceitar');
        return;
      }
      router.push('/onboarding?step=2');
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink-50">Termos de uso & LGPD</h2>
        <p className="text-sm text-ink-400 mt-1">
          Para começar, precisamos que você concorde com nossa política de privacidade.
          Você pode revisar a versão integral abaixo.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-prazo-700 bg-prazo-950/40 px-3 py-2 text-xs text-prazo-300">
          {error}
        </div>
      )}

      {/* Cards explicativos */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-ink-900/50">
          <CardContent className="p-4">
            <Shield className="h-5 w-5 text-improcede-400 mb-2" />
            <p className="text-sm font-medium text-ink-100">Dados protegidos</p>
            <p className="text-xs text-ink-500 mt-1">Criptografia em repouso e em trânsito. Backups diários.</p>
          </CardContent>
        </Card>
        <Card className="bg-ink-900/50">
          <CardContent className="p-4">
            <Eye className="h-5 w-5 text-vara-400 mb-2" />
            <p className="text-sm font-medium text-ink-100">Transparência total</p>
            <p className="text-xs text-ink-500 mt-1">Você vê todo acesso aos seus dados. Auditoria contínua.</p>
          </CardContent>
        </Card>
        <Card className="bg-ink-900/50">
          <CardContent className="p-4">
            <Lock className="h-5 w-5 text-ciente-400 mb-2" />
            <p className="text-sm font-medium text-ink-100">Acesso isolado</p>
            <p className="text-xs text-ink-500 mt-1">Cada escritório tem seu próprio espaço. Ninguém mais vê.</p>
          </CardContent>
        </Card>
        <Card className="bg-ink-900/50">
          <CardContent className="p-4">
            <FileText className="h-5 w-5 text-prazo-400 mb-2" />
            <p className="text-sm font-medium text-ink-100">Documentação legal</p>
            <p className="text-xs text-ink-500 mt-1">Prov. 188 OAB + LGPD Art. 37-46.</p>
          </CardContent>
        </Card>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3 pt-2">
        <label className="flex items-start gap-3 rounded-md border border-ink-800 p-3 cursor-pointer hover:border-vara-700">
          <input type="checkbox" name="acceptedTerms" required className="mt-0.5 h-4 w-4 rounded border-ink-600 bg-ink-900 text-vara-600" />
          <div className="flex-1">
            <p className="text-sm text-ink-200">
              Li e aceito os <a href="/termos" target="_blank" className="text-vara-400 underline">Termos de Uso</a> do Juris-Flow. <span className="text-prazo-400">*</span>
            </p>
            <p className="text-[10px] text-ink-500 mt-0.5">Inclui responsabilidade pelo conteúdo e uso da plataforma.</p>
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-md border border-ink-800 p-3 cursor-pointer hover:border-vara-700">
          <input type="checkbox" name="acceptedPrivacy" required className="mt-0.5 h-4 w-4 rounded border-ink-600 bg-ink-900 text-vara-600" />
          <div className="flex-1">
            <p className="text-sm text-ink-200">
              Li e aceito a <a href="/privacidade" target="_blank" className="text-vara-400 underline">Política de Privacidade</a> e o tratamento de dados conforme LGPD. <span className="text-prazo-400">*</span>
            </p>
            <p className="text-[10px] text-ink-500 mt-0.5">Você pode solicitar exportação/anonimização a qualquer momento.</p>
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-md border border-ink-800 p-3 cursor-pointer hover:border-vara-700">
          <input type="checkbox" name="marketingOptIn" className="mt-0.5 h-4 w-4 rounded border-ink-600 bg-ink-900 text-vara-600" />
          <div className="flex-1">
            <p className="text-sm text-ink-200">
              Aceito receber comunicações sobre novas funcionalidades (opcional)
            </p>
            <p className="text-[10px] text-ink-500 mt-0.5 flex items-center gap-1">
              <Cookie className="h-3 w-3" />
              Você pode revogar este consentimento a qualquer momento.
            </p>
          </div>
        </label>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending} rightIcon={pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}>
          {pending ? 'Salvando...' : 'Aceitar e continuar'}
        </Button>
      </div>
    </form>
  );
}