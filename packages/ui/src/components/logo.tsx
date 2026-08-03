/**
 * Logo Juris-Flow — ícone "flow" + wordmark
 *
 * Variações:
 * - Compact (apenas ícone "JF")
 * - Default (ícone + nome)
 * - Full (ícone + nome + tagline)
 */

import * as React from 'react';
import { cn } from '../lib/utils';

interface LogoProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
}

export const LogoMark = React.forwardRef<SVGSVGElement, LogoProps>(
  ({ size = 32, className, ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-vara-400', className)}
      aria-label="Juris-Flow"
      {...props}
    >
      {/* Quadrado arredondado de fundo */}
      <rect width="32" height="32" rx="8" fill="currentColor" fillOpacity="0.12" />
      {/* Fluxo (3 linhas que dobram) */}
      <path
        d="M6 16h4l3-9 4 18 3-9h6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
);
LogoMark.displayName = 'LogoMark';

interface LogoLockupProps {
  variant?: 'compact' | 'default' | 'full';
  className?: string;
}

export const LogoLockup: React.FC<LogoLockupProps> = ({ variant = 'default', className }) => {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={variant === 'compact' ? 24 : 32} />
      {variant !== 'compact' && (
        <div className="flex flex-col leading-none">
          <span className="text-base font-bold tracking-tight text-ink-50">
            Juris<span className="text-vara-400">-</span>Flow
          </span>
          {variant === 'full' && (
            <span className="vf-caption mt-0.5 text-[10px] uppercase tracking-widest text-ink-400">
              Advogado no tempo
            </span>
          )}
        </div>
      )}
    </div>
  );
};
