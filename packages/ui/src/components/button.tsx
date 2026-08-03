import * as React from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vara-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-vara-500 text-white hover:bg-vara-400 active:bg-vara-600',
        secondary:
          'bg-ink-800 text-ink-50 hover:bg-ink-700 active:bg-ink-800 border border-ink-700',
        ghost: 'text-ink-100 hover:bg-ink-800 hover:text-white',
        outline:
          'border border-ink-700 bg-transparent text-ink-100 hover:bg-ink-800',
        danger: 'bg-improcede-500 text-white hover:bg-improcede-400',
        success: 'bg-procede-500 text-white hover:bg-procede-400',
        link: 'text-vara-400 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, leftIcon, rightIcon, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  ),
);
Button.displayName = 'Button';

export interface LinkButtonProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>,
    VariantProps<typeof buttonVariants> {
  href: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Botão que renderiza como <Link> (Next.js).
 *
 * Use no lugar de `<Button asChild><Link>...`.
 */
const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ className, variant, size, href, leftIcon, rightIcon, children, ...props }, ref) => (
    <Link
      href={href}
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  ),
);
LinkButton.displayName = 'LinkButton';

export { Button, LinkButton, buttonVariants };
