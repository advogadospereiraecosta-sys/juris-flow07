import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { Card, CardContent, Badge } from '@juris-flow/ui';
import { Scale, FileCheck, Building2, Sparkles, Check } from 'lucide-react';
import { OnboardingStepper } from '@/components/onboarding/onboarding-stepper';
import { OnboardingStep1 } from '@/components/onboarding/onboarding-step1';
import { OnboardingStep2 } from '@/components/onboarding/onboarding-step2';
import { OnboardingStep3 } from '@/components/onboarding/onboarding-step3';

export const metadata = { title: 'Onboarding — Juris-Flow' };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { step?: string };
}) {
  const session = await auth();
  if (!session?.user?.tenantId) redirect('/login');

  const tenantId = session.user.tenantId;

  // Verifica se já completou
  const progress = await prisma.onboardingProgress.findUnique({ where: { tenantId } });
  if (progress?.completed) {
    redirect('/dashboard');
  }

  const stepNum = (progress?.currentStep ?? 1) as 1 | 2 | 3;
  const requested = parseInt(searchParams.step ?? '', 10);
  const currentStep: 1 | 2 | 3 = requested === 2 || requested === 3 ? requested : stepNum;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const trialEndsAt = tenant?.trialEndsAt;
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000)) : 14;

  return (
    <div className="min-h-screen bg-ink-950 text-ink-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Scale className="h-6 w-6 text-vara-400" />
            <h1 className="text-2xl font-bold">Bem-vindo ao Juris-Flow</h1>
          </div>
          <p className="text-ink-400 text-sm">
            Vamos configurar seu escritório em 3 passos rápidos. Você tem {daysLeft} dias de trial gratuito.
          </p>
        </div>

        {/* Stepper */}
        <OnboardingStepper current={currentStep} />

        {/* Conteúdo */}
        <Card className="mt-8">
          <CardContent className="p-8">
            {currentStep === 1 && <OnboardingStep1 />}
            {currentStep === 2 && <OnboardingStep2 />}
            {currentStep === 3 && <OnboardingStep3 />}
          </CardContent>
        </Card>

        {/* Skip */}
        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-xs text-ink-500 hover:text-ink-300">
            Pular onboarding (você pode completar depois em Configurações)
          </Link>
        </div>
      </div>
    </div>
  );
}