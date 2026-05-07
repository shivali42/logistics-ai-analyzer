import type { ReactNode } from 'react';

interface ActionProps {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ActionProps;
  variant?: 'default' | 'error' | 'search';
}

const variantStyles = {
  default: {
    wrapper: 'bg-slate-50 border-slate-200',
    iconRing: 'bg-white ring-slate-200 text-slate-400',
    title: 'text-slate-800',
    description: 'text-slate-500',
    button: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500',
  },
  error: {
    wrapper: 'bg-red-50 border-red-200',
    iconRing: 'bg-white ring-red-200 text-red-400',
    title: 'text-red-800',
    description: 'text-red-600',
    button: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  },
  search: {
    wrapper: 'bg-amber-50 border-amber-200',
    iconRing: 'bg-white ring-amber-200 text-amber-500',
    title: 'text-slate-800',
    description: 'text-slate-500',
    button: 'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-400',
  },
} as const;

export default function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  const styles = variantStyles[variant];

  return (
    <div
      role="status"
      aria-label={title}
      className={`flex flex-col items-center justify-center gap-4 rounded-2xl border px-8 py-14 text-center ${styles.wrapper}`}
    >
      <div
        aria-hidden="true"
        className={`flex h-16 w-16 items-center justify-center rounded-2xl ring-1 shadow-sm ${styles.iconRing}`}
      >
        <span className="h-8 w-8 [&>svg]:h-full [&>svg]:w-full">{icon}</span>
      </div>

      <div className="max-w-xs space-y-1.5">
        <h3 className={`text-base font-semibold ${styles.title}`}>{title}</h3>
        {description && (
          <p className={`text-sm leading-relaxed ${styles.description}`}>{description}</p>
        )}
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className={`mt-1 rounded-lg px-5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${styles.button}`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
