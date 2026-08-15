import React from 'react';

/**
 * Modern, high-performance Skeleton loading placeholders with subtle shimmer animations
 * to replace standard spinners during initial data synchronization.
 */

export function ClassCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <div 
          key={idx}
          className="p-3.5 sm:p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 shadow-xs space-y-3 animate-pulse text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-2 flex-1 min-w-0">
              {/* Subject code pill */}
              <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
              {/* Subject Title */}
              <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
            {/* Status chip */}
            <div className="h-5 w-14 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AttendanceTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-2.5 animate-pulse text-left">
      <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
        <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>

      {Array.from({ length: rows }).map((_, idx) => (
        <div 
          key={idx}
          className="p-3.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-850/70 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="h-3.5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-2.5 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 rounded hidden sm:block" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ScheduleListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 w-full animate-pulse text-left">
      {Array.from({ length: count }).map((_, idx) => (
        <div 
          key={idx}
          className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          </div>
          <div className="h-5 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
            <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
