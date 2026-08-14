import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js/auto';
import { AttendanceRecord } from '../types';
import { Activity, Award, TrendingUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

// Register standard Chart.js modules just in case
try {
  Chart.register(...registerables);
} catch(e) {
  // Silent fallback if already registered
}

interface AttendanceGraphProps {
  classId: string;
  classCode: string;
  className: string;
  records: AttendanceRecord[];
  isDark?: boolean;
}

export default function AttendanceGraph({ classId, classCode, className, records, isDark: propIsDark }: AttendanceGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  // Compute theme dynamically inside rendering
  const activeIsDark = propIsDark !== undefined ? propIsDark : document.documentElement.classList.contains('dark');

  // Filter records for this class
  const classRecords = records
    .filter(r => r.classId === classId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Aggregate metrics
  const total = classRecords.length;
  const present = classRecords.filter(r => r.status === 'present').length;
  const late = classRecords.filter(r => r.status === 'late').length;
  const excused = classRecords.filter(r => r.status === 'excused').length;
  const absent = classRecords.filter(r => r.status === 'absent').length;

  const presentPercent = total > 0 ? Math.round((present / total) * 100) : 100;
  const latePercent = total > 0 ? Math.round((late / total) * 100) : 0;
  const excusedPercent = total > 0 ? Math.round((excused / total) * 100) : 0;
  const absentPercent = total > 0 ? Math.round((absent / total) * 100) : 0;

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy previous chart if existing to prevent canvas re-use errors
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Prepare chronological data
    const labels = classRecords.map(r => {
      // Format YYYY-MM-DD to prettier format (e.g., "May 12")
      try {
        const d = new Date(r.date);
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      } catch {
        return r.date;
      }
    });

    // If empty classRecords, provide dynamic trend points so it looks complete and removes fixed weeks
    const finalLabels = labels.length > 0 ? labels : Array.from({ length: 4 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (3 - i) * 7);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    });
    
    // Convert status to value for trending (Present = 100, Excused = 90, Late = 70, Absent = 0)
    const trendValues = classRecords.map(r => {
      if (r.status === 'present') return 100;
      if (r.status === 'excused') return 90;
      if (r.status === 'late') return 70;
      return 0;
    });
    const finalTrendValues = trendValues.length > 0 ? trendValues : [100, 100, 100, 100];

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Create Gradient fill for Line Chart
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    chartInstanceRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: finalLabels,
        datasets: [
          {
            label: 'Class Attendance Pulse (%)',
            data: finalTrendValues,
            borderColor: '#10b981',
            borderWidth: 3,
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#10b981',
            pointBorderColor: activeIsDark ? '#09090b' : '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: activeIsDark ? '#09090b' : '#ffffff',
            titleColor: activeIsDark ? '#f4f4f5' : '#18181b',
            titleFont: {
              family: 'JetBrains Mono, monospace',
              size: 11,
              weight: 'bold'
            },
            bodyFont: {
              family: 'Inter, sans-serif',
              size: 11
            },
            bodyColor: '#10b981',
            borderColor: activeIsDark ? '#27272a' : '#e4e4e7',
            borderWidth: 1.5,
            padding: 12,
            displayColors: false,
            callbacks: {
              title: (tooltipItems) => {
                const index = tooltipItems[0].dataIndex;
                if (classRecords[index]) {
                  const r = classRecords[index];
                  try {
                    const d = new Date(r.date);
                    return `🗓️ ${d.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
                  } catch {
                    return `🗓️ Date: ${r.date}`;
                  }
                }
                return '🗓️ Reference Period';
              },
              label: (context) => {
                const index = context.dataIndex;
                if (classRecords[index]) {
                  const r = classRecords[index];
                  const statusLabel = r.status.toUpperCase();
                  const timeInfo = r.time ? ` at ${r.time}` : ' (No logs)';
                  return `Status: ${statusLabel}${timeInfo}`;
                }
                return 'Standard Status: PRESENT';
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: activeIsDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            },
            ticks: {
              color: activeIsDark ? '#a1a1aa' : '#71717a',
              font: {
                family: 'JetBrains Mono, monospace',
                size: 9
              }
            }
          },
          y: {
            min: 0,
            max: 110,
            grid: {
              color: activeIsDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            },
            ticks: {
              color: activeIsDark ? '#a1a1aa' : '#71717a',
              font: {
                family: 'JetBrains Mono, monospace',
                size: 9
              },
              callback: (value) => {
                if (value === 100) return 'Present';
                if (value === 90) return 'Excused';
                if (value === 70) return 'Late';
                if (value === 0) return 'Absent';
                return '';
              }
            }
          }
        }
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [classId, classRecords.length, activeIsDark]);

  // ResizeObserver with 100ms debounced trigger to handle sudden layout/split-screen transitions
  useEffect(() => {
    if (!canvasRef.current) return;
    const parent = canvasRef.current.parentElement;
    if (!parent) return;

    let timeoutId: any = null;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (chartInstanceRef.current) {
          try {
            chartInstanceRef.current.resize();
          } catch (e) {
            // Silently handle if chart is being destroyed/recreated
          }
        }
      }, 100);
    });

    observer.observe(parent);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Tally Cards */}
      <div className={`grid ${excused > 0 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-3`}>
        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 text-left">
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Present</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-zinc-900 dark:text-zinc-100">{present}</span>
            <span className="text-xs text-zinc-400 font-mono">({presentPercent}%)</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 text-left">
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Late</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-zinc-900 dark:text-zinc-100">{late}</span>
            <span className="text-xs text-zinc-400 font-mono">({latePercent}%)</span>
          </div>
        </div>

        {excused > 0 && (
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 text-left">
            <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Excused</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black font-mono text-zinc-900 dark:text-zinc-100">{excused}</span>
              <span className="text-xs text-zinc-400 font-mono">({excusedPercent}%)</span>
            </div>
          </div>
        )}

        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 text-left">
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Absent</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-zinc-900 dark:text-zinc-100">{absent}</span>
            <span className="text-xs text-zinc-400 font-mono">({absentPercent}%)</span>
          </div>
        </div>
      </div>

      {/* Main Canvas Graph Box */}
      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850">
        <div className="flex items-center justify-between mb-3 text-left">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Attendance Pulse Rate Trend</span>
          </div>
          <div className="text-[10px] font-mono text-emerald-500 flex items-center gap-1 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
            {total} logs analyzed
          </div>
        </div>

        <div className="h-44 relative">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}
