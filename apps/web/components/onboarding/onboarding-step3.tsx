'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardContent } from '@juris-flow/ui';
import { ArrowRight, Loader2, Users, Briefcase, CheckSquare, TrendingUp, FileText, Sparkles, PartyPopper } from 'lucide-react';
import { finishOnboardingAction } from '@/lib/actions/onboarding';

const TOUR_STEPS = [
  {
    icon: Users,
    title: 'Clientes',
    description: 'Cadastre PF e PJ com auto-fill via CNPJ (BrasilAPI) e CEP (ViaCEP).',
    href: '/clients',
  },
  {
    icon: Briefcase,
    title: 'Processos',
    description: 'Vincule clientes a processos, registre andamentos com cálculo automático de prazos.',
    href: '/processos',
  },
  {
    icon: TrendingUp,
    title: 'Leads',
    description: 'Pipeline de funil de vendas. Converta leads ganhos em clientes automaticamente.',
    href: '/leads',
  },
  {
    icon: CheckSquare,
    title: 'Tarefas',
    description: 'Kanban pessoal por processo. Arraste pra mudar status com drag-and-drop.',
    href: '/tarefas',
  },
  {
    icon: FileText,
    title: 'Peças com IA',
    description: 'Petições, contestações e recursos gerados por Claude Opus 4.8 com revisão humana.',
    href: '/pecas',
  },
];

export function OnboardingStep3() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function handleFinish() {
    start(async () => {
      await finishOnboardingAction();
      router.push('/dashboard');
    });
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <PartyPopper className="h-10 w-10 text-vara-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-ink-50">Tudo configurado!</h2>
        <p className="text-sm text-ink-400 mt-1">
          Conheça as principais funcionalidades do Juris-Flow. Você pode voltar a este tour em <Link href="/configuracoes" className="text-vara-400 underline">Configurações</Link>.
        </p>
      </div>

      {/* Tour cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TOUR_STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <Link key={step.title} href={step.href}>
              <Card className="bg-ink-900/50 hover:border-vara-600 transition-colors h-full">
                <CardContent className="p-4">
                  <Icon className="h-5 w-5 text-vara-400 mb-2" />
                  <p className="text-sm font-medium text-ink-100">{step.title}</p>
                  <p className="text-xs text-ink-500 mt-1">{step.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="rounded-md border border-improcede-700/40 bg-improcede-950/20 px-4 py-3 text-xs text-improcede-300 flex items-start gap-2">
        <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Dica: comece cadastrando 2-3 clientes reais</p>
          <p className="mt-0.5 text-improcede-300/80">
            Quanto mais dados você inserir nos primeiros dias, melhor o seu setup estará para apresentar para seus clientes.
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleFinish} disabled={pending} size="lg" rightIcon={pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}>
          {pending ? 'Finalizando...' : 'Ir para o painel'}
        </Button>
      </div>
    </div>
  );
}