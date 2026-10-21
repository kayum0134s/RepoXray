'use client';

import React, { useMemo } from 'react';
import { GraphData } from '@/types/graph';
import { getNodeTheme } from '@/lib/nodeTheme';

interface GraphLegendProps {
  data?: GraphData | null;
}

export default function GraphLegend({ data }: GraphLegendProps) {
  const entries = useMemo(() => {
    const counts = new Map<string, { count: number; color: string }>();

    (data?.nodes || []).forEach((node) => {
      if ((node.type as string) === 'FOLDER' || (node.type as string) === 'directory') return;
      const theme = getNodeTheme(node.language, node.type, node.path);
      const key = node.language || theme.label;
      const existing = counts.get(key);
      counts.set(key, {
        count: (existing?.count || 0) + 1,
        color: existing?.color || theme.color,
      });
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6);
  }, [data]);

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/[0.06] bg-base/70 px-2.5 py-1.5 backdrop-blur-md">
      <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-slate-600">
        Legend
      </span>
      {entries.map(([label, { count, color }]) => (
        <span key={label} className="flex items-center gap-1.5 font-mono text-[9.5px] text-slate-400">
          <span
            className="h-1.5 w-1.5 rounded-full ring-2 ring-white/[0.04]"
            style={{ backgroundColor: color }}
          />
          {label}
          <span className="text-slate-700">{count}</span>
        </span>
      ))}
    </div>
  );
}
