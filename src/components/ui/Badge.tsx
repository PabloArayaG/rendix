import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'custom_id' | 'in_progress' | 'completed' | 'default' | 'category';
  size?: 'sm' | 'md';
}

/**
 * Badge component for status indicators and labels
 * Follows RENDIX design system specifications
 */
export function Badge({ className, variant = 'default', size = 'md', children, ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full border';
  
  const variants = {
    custom_id: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
    in_progress: 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/50',
    completed: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/50',
    default: 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700/50',
    category: 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700/50',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
