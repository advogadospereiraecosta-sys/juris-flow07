import * as React from 'react';
import { cn } from '../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, leftIcon, rightIcon, ...props }, ref) => (
    <div className="relative flex w-full items-center">
      {leftIcon && (
        <div className="pointer-events-none absolute left-3 text-ink-400 [&_svg]:size-4">
          {leftIcon}
        </div>
      )}
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-50',
          'placeholder:text-ink-400',
          'focus:border-vara-400 focus:outline-none focus:ring-1 focus:ring-vara-400',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors',
          leftIcon && 'pl-10',
          rightIcon && 'pr-10',
          error && 'border-improcede-500 focus:border-improcede-500 focus:ring-improcede-500',
          className,
        )}
        {...props}
      />
      {rightIcon && (
        <div className="absolute right-3 text-ink-400 [&_svg]:size-4">{rightIcon}</div>
      )}
    </div>
  ),
);
Input.displayName = 'Input';

export { Input };
