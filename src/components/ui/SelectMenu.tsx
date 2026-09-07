import { useEffect, useId, useRef, useState, type ComponentType } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectMenuOption {
  value: string;
  label: string;
  count?: number;
}

export interface SelectMenuProps {
  label: string;
  value: string;
  options: SelectMenuOption[];
  onChange: (value: string) => void;
  icon: ComponentType<{ className?: string }>;
  accent?: 'blue' | 'orange' | 'violet';
  className?: string;
}

const accentStyles = {
  blue: {
    icon: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300',
    focus: 'focus-visible:border-blue-400 focus-visible:ring-blue-100 dark:focus-visible:ring-blue-900/50',
    option: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    count: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300',
  },
  orange: {
    icon: 'bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-300',
    focus: 'focus-visible:border-orange-400 focus-visible:ring-orange-100 dark:focus-visible:ring-orange-900/50',
    option: 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
    count: 'bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300',
  },
  violet: {
    icon: 'bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300',
    focus: 'focus-visible:border-violet-400 focus-visible:ring-violet-100 dark:focus-visible:ring-violet-900/50',
    option: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    count: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300',
  },
} as const;

export function SelectMenu({
  label,
  value,
  options,
  onChange,
  icon: Icon,
  accent = 'blue',
  className = '',
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = options.find(option => option.value === value) ?? options[0];
  const styles = accentStyles[accent];

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(current => !current)}
        className={`group flex min-h-[58px] w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-left shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 ${styles.focus}`}
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
            {label}
          </span>
          <span className="mt-0.5 block truncate text-sm font-medium text-gray-900 dark:text-white">
            {selected?.label}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 group-hover:text-gray-600 dark:group-hover:text-gray-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-[0_18px_45px_-12px_rgba(15,23,42,0.28)] dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="max-h-72 space-y-0.5 overflow-y-auto overscroll-contain">
            {options.map(option => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    isSelected
                      ? `${styles.option} font-semibold`
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {typeof option.count === 'number' && (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${isSelected ? styles.count : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {option.count}
                    </span>
                  )}
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {isSelected && <Check className="h-4 w-4" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
