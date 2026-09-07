import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Check, Copy } from 'lucide-react';

export interface CopyButtonProps {
  value: string;
  variant?: 'badge' | 'inline';
  className?: string;
}

const copyWithFallback = async (value: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('El navegador no permitió copiar');
};

export function CopyButton({ value, variant = 'inline', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    await copyWithFallback(value);
    setCopied(true);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  const variantClass = variant === 'badge'
    ? 'rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200 focus-visible:ring-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/65 dark:focus-visible:ring-blue-900'
    : 'rounded-md px-1.5 py-1 text-sm font-medium text-gray-900 hover:bg-gray-100 focus-visible:ring-gray-200 dark:text-white dark:hover:bg-gray-800 dark:focus-visible:ring-gray-700';

  return (
    <button
      type="button"
      onClick={event => { void handleCopy(event); }}
      aria-label={`${copied ? 'ID copiado' : 'Copiar ID'} ${value}`}
      title={copied ? 'ID copiado' : 'Copiar ID del proyecto'}
      className={`group/copy inline-flex shrink-0 items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-4 ${variantClass} ${className}`}
    >
      <span className="tabular-nums">{value}</span>
      {copied
        ? <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        : <Copy className="h-3.5 w-3.5 opacity-55 transition-opacity group-hover/copy:opacity-100" />}
      <span className="sr-only" aria-live="polite">{copied ? 'Copiado' : ''}</span>
    </button>
  );
}
