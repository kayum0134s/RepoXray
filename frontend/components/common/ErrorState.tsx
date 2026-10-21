'use client';

import React from 'react';
import { AlertOctagon, RotateCcw, ArrowUpRight, ShieldCheck, GitBranch } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="animate-scale-in relative w-full max-w-md overflow-hidden rounded-2xl border border-red-400/15 bg-surface/80 shadow-panel backdrop-blur-2xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/70 to-transparent" />

      <div className="flex flex-col items-center px-6 py-7 text-center">
        <div className="relative grid h-14 w-14 place-items-center">
          <span className="absolute inset-0 rounded-2xl bg-red-500/10 blur-xl" />
          <span className="relative grid h-12 w-12 place-items-center rounded-xl border border-red-400/30 bg-red-500/10 text-red-300">
            <AlertOctagon className="h-5 w-5" strokeWidth={2.1} />
          </span>
        </div>

        <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-white">
          Analysis couldn&apos;t complete
        </h3>
        <p className="mt-1.5 max-w-[22rem] font-mono text-[11px] leading-relaxed text-slate-500">
          The pipeline stopped before the graph could be generated.
        </p>

        <div className="mt-5 w-full rounded-xl border border-white/[0.06] bg-black/40 p-3 text-left">
          <p className="label-xs mb-1.5 text-red-400/70">Error detail</p>
          <p className="break-words font-mono text-[11px] leading-relaxed text-slate-300">
            {message || 'An unexpected error occurred during ingestion, parsing or graph resolution.'}
          </p>
        </div>

        <div className="mt-4 w-full space-y-2 text-left">
          <p className="label-xs">Common causes</p>
          <ul className="space-y-1.5 font-mono text-[10.5px] text-slate-500">
            <li className="flex items-center gap-2">
              <GitBranch className="h-3 w-3 shrink-0 text-slate-600" />
              Repository is private, renamed, or the default branch is empty.
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-3 w-3 shrink-0 text-slate-600" />
              GitHub rate limit reached — add a <code className="text-slate-400">GITHUB_TOKEN</code>.
            </li>
          </ul>
        </div>

        {onRetry && (
          <button onClick={onRetry} className="btn mt-6 w-full py-2.5 text-[11px]">
            <RotateCcw className="h-3.5 w-3.5" />
            Try another repository
            <ArrowUpRight className="ml-auto h-3 w-3 text-slate-600" />
          </button>
        )}
      </div>
    </div>
  );
}
