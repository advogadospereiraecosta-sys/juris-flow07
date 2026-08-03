import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina classes com suporte a Tailwind merge.
 * `cn('p-2', condition && 'bg-red-500', 'p-4')` → `'bg-red-500 p-4'`
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
