import React from 'react';

/**
 * Modern, high-performance Skeleton loading placeholders with subtle shimmer animations
 * to eliminate layout shifts (CLS) during initial component mount and data synchronization.
 */

export function ShimmerEffect() {
  return (
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent pointer-events-none" />
  );
}

export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <div 
          key={idx}
          className="relative overflow-hidden p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850/80 shadow-xs space-y-2.5 animate-pulse text-left"
        >
          <ShimmerEffect />
          <div className="flex items-center justify-between">
            <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="w-6 h-6 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-2.5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className={`relative overflow-hidden w-full ${height} p-5 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850/80 shadow-xs flex flex-col justify-between animate-pulse text-left`}>
      <ShimmerEffect />
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-36 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-2.5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
        <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
      </div>

      <div className="flex items-end justify-between gap-2 pt-6 h-36">
        {[40, 75, 50, 90, 65, 85, 95].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div 
              className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-t-md transition-all" 
              style={{ height: `${h}%` }} 
            />
            <div className="h-2.5 w-6 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClassCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <div 
          key={idx}
          className="relative overflow-hidden p-3.5 sm:p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 shadow-xs space-y-3 animate-pulse text-left"
        >
          <ShimmerEffect />
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
    <div className="relative overflow-hidden w-full space-y-2.5 animate-pulse text-left">
      <ShimmerEffect />
      <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
        <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>

      {Array.from({ length: rows }).map((_, idx) => (
        <div 
          key={idx}
          className="relative overflow-hidden p-3.5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-850/70 flex items-center justify-between gap-3"
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
    <div className="relative overflow-hidden space-y-3 w-full animate-pulse text-left">
      <ShimmerEffect />
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
