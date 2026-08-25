import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  iconType?: 'schedule' | 'notification' | 'search';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = React.memo(({
  title,
  description,
  actionText,
  onAction,
  iconType = 'schedule',
  className = ''
}) => {
  return (
    <div className={`p-8 sm:p-10 text-center rounded-2xl sm:rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-950/30 backdrop-blur-xs flex flex-col items-center justify-center space-y-3.5 animate-fade-in ${className}`}>
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
        {/* Soft radial backdrop illumination */}
        <div className="absolute inset-0 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-xl pointer-events-none" />
        
        {iconType === 'schedule' && (
          <svg
            className="w-14 h-14 sm:w-16 sm:h-16 text-zinc-400 dark:text-zinc-600 transition-colors"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Calendar Outer Frame */}
            <rect
              x="8"
              y="12"
              width="48"
              height="44"
              rx="10"
              className="stroke-current"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            {/* Calendar Top Header Strip */}
            <path
              d="M8 24H56"
              className="stroke-current opacity-60"
              strokeWidth="2"
            />
            {/* Hanging Ring Pins */}
            <line x1="20" y1="8" x2="20" y2="14" className="stroke-emerald-500" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="44" y1="8" x2="44" y2="14" className="stroke-emerald-500" strokeWidth="2.5" strokeLinecap="round" />
            {/* Clock/Check Indicator Overlay */}
            <circle cx="32" cy="38" r="8" className="stroke-emerald-500/80 dark:stroke-emerald-400/80" strokeWidth="2" strokeLinecap="round" />
            <polyline points="32 34 32 38 35 40" className="stroke-emerald-500 dark:stroke-emerald-400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}

        {iconType === 'notification' && (
          <svg
            className="w-14 h-14 sm:w-16 sm:h-16 text-zinc-400 dark:text-zinc-600 transition-colors"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Bell Shape */}
            <path
              d="M32 10C24.268 10 18 16.268 18 24V34L14 42H50L46 34V24C46 16.268 39.732 10 32 10Z"
              className="stroke-current"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Bell Clapper */}
            <path
              d="M28 46C28 48.2091 29.7909 50 32 50C34.2091 50 36 48.2091 36 46"
              className="stroke-emerald-500"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Sound Wave Ripple Arcs */}
            <path
              d="M12 24C10 27 10 31 12 34"
              className="stroke-emerald-500/60 dark:stroke-emerald-400/60"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M52 24C54 27 54 31 52 34"
              className="stroke-emerald-500/60 dark:stroke-emerald-400/60"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Status dot */}
            <circle cx="32" cy="26" r="3" className="fill-emerald-500" />
          </svg>
        )}

        {iconType === 'search' && (
          <svg
            className="w-14 h-14 sm:w-16 sm:h-16 text-zinc-400 dark:text-zinc-600 transition-colors"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="28" cy="28" r="14" className="stroke-current" strokeWidth="2" strokeDasharray="3 3" />
            <line x1="38" y1="38" x2="52" y2="52" className="stroke-emerald-500" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M24 28H32" className="stroke-zinc-400 dark:stroke-zinc-500" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </div>

      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 tracking-tight">
          {title}
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
          {description}
        </p>
      </div>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-black dark:text-emerald-400 dark:hover:text-black border border-emerald-500/20 text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;
