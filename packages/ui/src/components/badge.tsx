import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-vara-700 text-vara-100',
        success: 'bg-procede-700/30 text-procede-200',
        warning: 'bg-prazo-700/30 text-prazo-200',
        danger: 'bg-improcede-700/30 text-improcede-200',
        info: 'bg-ciente-700/30 text-ciente-200',
        muted: 'bg-ink-700 text-ink-200',
        outline: 'border border-ink-700 text-ink-200',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, dot, children, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full', {
            'bg-vara-300': variant === 'default',
            'bg-procede-300': variant === 'success',
            'bg-prazo-300': variant === 'warning',
            'bg-improcede-300': variant === 'danger',
            'bg-ciente-300': variant === 'info',
            'bg-ink-300': variant === 'muted' || variant === 'outline',
          })}
        />
      )}
      {children}
    </span>
  ),
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
