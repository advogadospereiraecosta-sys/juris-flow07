'use client';

import { Scale, FileCheck, Building2, Sparkles, Check } from 'lucide-react';
import clsx from 'clsx';

type Props = { current: 1 | 2 | 3 };

const STEPS = [
  { id: 1, label: 'Termos & LGPD', icon: Scale },
  { id: 2, label: 'Seu Escritório', icon: Building2 },
  { id: 3, label: 'Bem-vindo!', icon: Sparkles },
] as const;

export function OnboardingStepper({ current }: Props) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((step, idx) => {
        const done = current > step.id;
        const active = current === step.id;
        const Icon = step.icon;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2',
                  done && 'border-improcede-500 bg-improcede-950 text-improcede-300',
                  active && 'border-vara-500 bg-vara-950 text-vara-300',
                  !done && !active && 'border-ink-700 bg-ink-900 text-ink-500',
                )}
              >
                {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span
                className={clsx(
                  'mt-1.5 text-xs',
                  (done || active) ? 'text-ink-200' : 'text-ink-500',
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={clsx(
                  'w-12 sm:w-20 h-0.5 mx-1 sm:mx-2',
                  done ? 'bg-improcede-600' : 'bg-ink-700',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}