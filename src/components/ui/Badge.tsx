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
  const baseStyles = 'inline-flex items-center font-medium rounded-md';
  
  const variants = {
    custom_id: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-blue-50 text-blue-700',
    completed: 'bg-green-50 text-green-700',
    default: 'bg-gray-100 text-gray-800',
    category: 'bg-gray-100 text-gray-700',
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
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
