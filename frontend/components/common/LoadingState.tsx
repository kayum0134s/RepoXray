'use client';

import React, { useEffect, useState } from 'react';
import { Check, Loader2, ScanLine, Timer } from 'lucide-react';
import { RepositoryStatus } from '@/types/repository';

interface LoadingStateProps {
  status: RepositoryStatus;
  message?: string;
}

const PIPELINE_STAGES: Array<{ status: RepositoryStatus; label: string; desc: string }> = [
  { status: 'scanning', label: 'Ingestion & scanning', desc: 'Fetching the git tree and mapping file inventory' },
  { status: 'parsing', label: 'AST source parsing', desc: 'Extracting symbols, classes, functions and imports' },
  { status: 'resolving', label: 'Relationship resolution', desc: 'Resolving relative paths, aliases and package edges' },
  { status: 'building_graph', label: 'Graph generation', desc: 'Building adjacency, degree metrics and cycle detection' },
];

export default function LoadingState({ status, message }: LoadingStateProps) {
  const stageIndex = PIPELINE_STAGES.findIndex((s) => s.status === status);
  const activeIndex = stageIndex === -1 ? 0 : stageIndex;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => setElapsed((Date.now() - start) / 1000), 100);
    return () => clearInterval(interval);
  }, []);

  const progress = Math.min(96, 12 + activeIndex * 24 + Math.min(elapsed * 1.6, 20));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="animate-scale-in relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.07] bg-surface/80 shadow-panel backdrop-blur-2xl"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />

      <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
        {/* Orbiting scanner */}
        <div className="relative grid h-24 w-24 place-items-center">
          <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
          <div className="absolute inset-2 rounded-full border border-dashed border-cyan-300/20 animate-spin-slow" />
          <div
            className="absolute inset-0 rounded-full opacity-70"
            style={{
              background:
                'conic-gradient(from 0deg, rgba(34,211,238,0) 0deg, rgba(34,211,238,0.22) 90deg, rgba(34,211,238,0) 180deg)',
              animation: 'spin-slow 2.6s linear infinite',
              maskImage: 'radial-gradient(circle, transparent 58%, #000 59%)',
              WebkitMaskImage: 'radial-gradient(circle, transparent 58%, #000 59%)',
            }}
          />
          <div className="relative grid h-12 w-12 place-items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-cyan-200 shadow-[0_0_40px_-12px_rgba(34,211,238,0.9)]">
            <ScanLine className="h-5 w-5" strokeWidth={2} />
          </div>
        </div>

        <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-white">
          Reading the architecture
        </h3>
        <p className="mt-1 max-w-sm font-mono text-[11px] leading-relaxed text-slate-500">
          {message || 'Multi-language AST extraction and graph generation in progress.'}
        </p>

        {/* Progress rail */}
        <div className="mt-6 w-full">
          <div className="mb-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-slate-600">
            <span>Stage {activeIndex + 1} of {PIPELINE_STAGES.length}</span>
            <span className="flex items-center gap-1 tabular-nums">
              <Timer className="h-2.5 w-2.5" />
              {elapsed.toFixed(1)}s
            </span>
          </div>
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="relative h-full rounded-full bg-gradient-to-r from-cyan-300 via-cyan-400 to-indigo-400 transition-all duration-700 ease-smooth"
              style={{ width: `${progress}%` }}
            >
              <span className="absolute inset-0 overflow-hidden rounded-full">
                <span className="absolute inset-y-0 w-1/2 animate-sweep bg-gradient-to-r from-transparent via-white/50 to-transparent" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stage list */}
      <div className="border-t border-white/[0.055] bg-black/20 px-3 py-3">
        {PIPELINE_STAGES.map((stage, idx) => {
          const isDone = activeIndex > idx;
          const isActive = activeIndex === idx;

          return (
            <div
              key={stage.status}
              className={`flex items-start gap-3 rounded-lg px-3 py-2 transition-all duration-300 ${
                isActive ? 'bg-cyan-300/[0.05]' : ''
              }`}
            >
              <span
                className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-all duration-300 ${
                  isDone
                    ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300'
                    : isActive
                    ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-200'
                    : 'border-white/[0.08] bg-transparent text-slate-700'
                }`}
              >
                {isDone ? (
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                ) : isActive ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : (
                  <span className="h-1 w-1 rounded-full bg-current" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-[11.5px] font-medium leading-none ${
                    isActive ? 'text-cyan-100' : isDone ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {stage.label}
                </p>
                <p
                  className={`mt-1 font-mono text-[10px] leading-snug ${
                    isActive ? 'text-slate-500' : 'text-slate-700'
                  }`}
                >
                  {stage.desc}
                </p>
              </div>

              {isActive && (
                <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-cyan-400/80">
                  active
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
