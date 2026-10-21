'use client';

import React, { useEffect, useState } from 'react';
import { Repository } from '@/types/repository';
import { GraphData } from '@/types/graph';
import { checkHealth } from '@/lib/api';
import { Activity, Radio, TriangleAlert, GitBranch, Boxes } from 'lucide-react';

interface StatusBarProps {
  repo: Repository | null;
  graphData: GraphData | null;
}

function StatusDot({ tone }: { tone: 'ok' | 'warn' | 'busy' | 'idle' }) {
  const tones = {
    ok: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]',
    warn: 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]',
    busy: 'bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.9)] animate-pulse-soft',
    idle: 'bg-slate-600',
  };
  return <span className={`h-1.5 w-1.5 rounded-full ${tones[tone]}`} />;
}

export default function StatusBar({ repo, graphData }: StatusBarProps) {
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      const isOk = await checkHealth();
      if (!cancelled) setServerOnline(isOk);
    };

    ping();
    const interval = setInterval(ping, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const nodesCount = graphData?.nodes?.length || 0;
  const edgesCount = graphData?.edges?.length || 0;
  const cyclesCount = graphData?.cycles?.length || 0;

  const pipelineTone: 'ok' | 'warn' | 'busy' | 'idle' = !repo
    ? 'idle'
    : repo.status === 'completed'
    ? 'ok'
    : repo.status === 'failed'
    ? 'warn'
    : 'busy';

  return (
    <footer className="relative z-20 flex h-9 w-full shrink-0 items-center justify-between gap-4 border-t border-white/[0.055] bg-base/80 px-4 font-mono text-[10px] text-slate-500 backdrop-blur-xl lg:px-6">
      {/* Pipeline state */}
      <div className="flex min-w-0 items-center gap-2">
        <Activity className="h-3 w-3 shrink-0 text-cyan-400/80" />
        <span className="hidden uppercase tracking-[0.14em] sm:inline">Pipeline</span>
        <span className="flex min-w-0 items-center gap-1.5 text-slate-300">
          <StatusDot tone={pipelineTone} />
          <span className={`truncate ${repo?.status === 'failed' ? 'text-red-300' : ''}`}>
            {repo ? repo.status.replace(/_/g, ' ') : 'idle'}
          </span>
        </span>
        {repo && (
          <span className="hidden truncate text-slate-600 md:inline">
            {repo.owner}/{repo.name}
          </span>
        )}
      </div>

      {/* Counters */}
      <div className="hidden items-center gap-4 md:flex">
        {repo ? (
          <>
            <span className="flex items-center gap-1.5">
              <Boxes className="h-3 w-3 text-slate-600" />
              <span className="text-slate-500">files</span>
              <strong className="font-semibold text-slate-300">{repo.fileCount}</strong>
            </span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1">
              <span className="text-slate-500">nodes</span>
              <strong className="font-semibold text-slate-300">{nodesCount}</strong>
            </span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1">
              <span className="text-slate-500">edges</span>
              <strong className="font-semibold text-slate-300">{edgesCount}</strong>
            </span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3 text-slate-600" />
              <strong className="font-semibold text-slate-300">{repo.defaultBranch}</strong>
            </span>
            {cyclesCount > 0 && (
              <span className="flex items-center gap-1 rounded border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 font-semibold text-amber-300">
                <TriangleAlert className="h-2.5 w-2.5" />
                {cyclesCount} cycle{cyclesCount === 1 ? '' : 's'}
              </span>
            )}
          </>
        ) : (
          <span className="text-slate-600">no repository loaded</span>
        )}
      </div>

      {/* API health */}
      <div className="flex shrink-0 items-center gap-1.5">
        <Radio
          className={`h-3 w-3 ${
            serverOnline === null
              ? 'text-slate-600'
              : serverOnline
              ? 'text-emerald-400'
              : 'text-red-400'
          }`}
        />
        <span className="hidden uppercase tracking-[0.14em] sm:inline">api</span>
        <span
          className={
            serverOnline === null
              ? 'text-slate-500'
              : serverOnline
              ? 'font-semibold text-emerald-400'
              : 'font-semibold text-red-400'
          }
        >
          {serverOnline === null ? 'connecting' : serverOnline ? 'online' : 'offline'}
        </span>
      </div>
    </footer>
  );
}
