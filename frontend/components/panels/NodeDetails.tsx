'use client';

import React, { useEffect, useState } from 'react';
import { GraphNode } from '@/types/graph';
import { FileDetail } from '@/types/repository';
import { fetchFileDetail } from '@/lib/api';
import { getNodeTheme } from '@/lib/nodeTheme';
import {
  X,
  Code2,
  ArrowUpRight,
  ArrowDownLeft,
  TriangleAlert,
  Layers,
  ExternalLink,
  Focus,
  Sparkles,
  Box,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface NodeDetailsProps {
  node: GraphNode | null;
  repoId?: string;
  onClose: () => void;
  onOpenFile?: (path: string, fileId: string) => void;
  onFocusNeighbors?: (nodeId: string) => void;
  onExplainAI?: (node: GraphNode) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="label-xs mb-1.5">{children}</p>;
}

export default function NodeDetails({
  node,
  repoId,
  onClose,
  onOpenFile,
  onFocusNeighbors,
  onExplainAI,
}: NodeDetailsProps) {
  const [detail, setDetail] = useState<FileDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!node || !repoId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setDetail(null);

    fetchFileDetail(repoId, node.id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((err) => console.error('Failed to load file detail:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [node, repoId]);

  if (!node) return null;

  const theme = getNodeTheme(node.language, node.type, node.path);
  const metadata = node.metadata || {};
  const inDegree = metadata.in_degree ?? 0;
  const outDegree = metadata.out_degree ?? 0;
  const totalDegree = metadata.total_degree ?? inDegree + outDegree;
  const unresolvedImports = metadata.unresolved_imports || [];

  const symbols = detail?.symbols || [];
  const classes = symbols.filter((s) => s.type === 'class');
  const functions = symbols.filter((s) => s.type === 'function' || s.type === 'method');

  const degreeTotal = Math.max(1, inDegree + outDegree);
  const inPct = (inDegree / degreeTotal) * 100;

  return (
    <section className="animate-fade-up panel flex w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="relative border-b border-white/[0.055] p-3.5">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-[0.14]"
          style={{ background: `radial-gradient(ellipse at 18% 0%, ${theme.color}, transparent 70%)` }}
        />
        <div className="relative flex items-start gap-2.5">
          <span
            className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border"
            style={{
              borderColor: `${theme.color}55`,
              backgroundColor: `${theme.color}18`,
              color: theme.borderColor,
            }}
          >
            <Code2 className="h-3.5 w-3.5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="truncate text-[13.5px] font-semibold leading-tight text-white" title={node.label}>
                {node.label}
              </h2>
              <button onClick={onClose} className="icon-btn -mr-1 -mt-1 shrink-0" aria-label="Close inspector">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="mt-1 truncate font-mono text-[10px] text-slate-500" title={node.path}>
              {node.path}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-1">
              <span
                className="rounded border px-1.5 py-px font-mono text-[9px] font-medium uppercase tracking-wider"
                style={{
                  borderColor: `${theme.color}44`,
                  backgroundColor: `${theme.color}12`,
                  color: theme.borderColor,
                }}
              >
                {node.type}
              </span>
              {node.language && (
                <span className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-px font-mono text-[9px] text-slate-400">
                  {node.language}
                </span>
              )}
              {metadata.line_count ? (
                <span className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-px font-mono text-[9px] text-slate-400">
                  {metadata.line_count} lines
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 p-3.5">
        {/* Actions */}
        <div className="grid grid-cols-2 gap-1.5">
          {onOpenFile && (
            <button onClick={() => onOpenFile(node.path, node.id)} className="btn py-1.5">
              <ExternalLink className="h-3 w-3 text-cyan-300" />
              Open code
            </button>
          )}
          {onFocusNeighbors && (
            <button onClick={() => onFocusNeighbors(node.id)} className="btn py-1.5">
              <Focus className="h-3 w-3 text-indigo-300" />
              Focus
            </button>
          )}
          {onExplainAI && (
            <button
              onClick={() => onExplainAI(node)}
              className="btn col-span-2 py-1.5 text-cyan-200"
            >
              <Sparkles className="h-3 w-3" />
              Explain with AI
            </button>
          )}
        </div>

        {/* Metrics */}
        <div>
          <SectionLabel>Connectivity</SectionLabel>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: 'total', value: totalDegree, tone: 'text-slate-100' },
              { label: 'inbound', value: inDegree, tone: 'text-emerald-300' },
              { label: 'outbound', value: outDegree, tone: 'text-indigo-300' },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-lg border border-white/[0.055] bg-black/30 px-2 py-1.5"
              >
                <p className={`font-mono text-[15px] font-semibold leading-none tabular-nums ${m.tone}`}>
                  {m.value}
                </p>
                <p className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-slate-600">
                  {m.label}
                </p>
              </div>
            ))}
          </div>

          {/* Degree split bar */}
          <div className="mt-2 flex h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
            <span
              className="h-full rounded-l-full bg-emerald-400/70 transition-all duration-500"
              style={{ width: `${inPct}%` }}
              title={`${inDegree} inbound`}
            />
            <span
              className="h-full flex-1 rounded-r-full bg-indigo-400/70"
              title={`${outDegree} outbound`}
            />
          </div>
        </div>

        {/* Unresolved imports */}
        {unresolvedImports.length > 0 && (
          <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.05] p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5">
              <TriangleAlert className="h-3 w-3 text-amber-400" />
              <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] text-amber-300/90">
                Unresolved ({unresolvedImports.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {unresolvedImports.slice(0, 8).map((imp: string) => (
                <span
                  key={imp}
                  className="rounded border border-amber-400/15 bg-black/30 px-1.5 py-px font-mono text-[9px] text-amber-200/80"
                >
                  {imp}
                </span>
              ))}
              {unresolvedImports.length > 8 && (
                <span className="font-mono text-[9px] text-amber-400/50">
                  +{unresolvedImports.length - 8}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Symbols */}
        {loading ? (
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-black/20 px-2.5 py-2 font-mono text-[10px] text-slate-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading symbols…
          </div>
        ) : symbols.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {classes.length > 0 && (
              <div>
                <SectionLabel>
                  <span className="inline-flex items-center gap-1">
                    <Box className="h-2.5 w-2.5 text-emerald-400/80" /> Classes · {classes.length}
                  </span>
                </SectionLabel>
                <div className="flex max-h-24 flex-col gap-0.5 overflow-y-auto pr-1">
                  {classes.map((cls, i) => (
                    <div
                      key={`${cls.name}-${i}`}
                      className="flex items-center justify-between rounded-md px-1.5 py-1 font-mono text-[10.5px] text-slate-300 transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="truncate text-emerald-200/90">{cls.name}</span>
                      {cls.line_number && (
                        <span className="shrink-0 tabular-nums text-[9px] text-slate-600">
                          L{cls.line_number}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {functions.length > 0 && (
              <div>
                <SectionLabel>
                  <span className="inline-flex items-center gap-1">
                    <Code2 className="h-2.5 w-2.5 text-cyan-400/80" /> Functions · {functions.length}
                  </span>
                </SectionLabel>
                <div className="flex max-h-28 flex-col gap-0.5 overflow-y-auto pr-1">
                  {functions.slice(0, 40).map((fn, i) => (
                    <div
                      key={`${fn.name}-${i}`}
                      className="flex items-center justify-between rounded-md px-1.5 py-1 font-mono text-[10.5px] text-slate-300 transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="truncate text-cyan-100/80">{fn.name}()</span>
                      {fn.line_number && (
                        <span className="shrink-0 tabular-nums text-[9px] text-slate-600">
                          L{fn.line_number}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Relationships */}
        {detail &&
          (detail.outgoingRelationships.length > 0 || detail.incomingRelationships.length > 0) && (
            <div className="border-t border-white/[0.055] pt-3">
              <SectionLabel>
                <span className="inline-flex items-center gap-1">
                  <Layers className="h-2.5 w-2.5 text-indigo-400/80" /> Dependencies
                </span>
              </SectionLabel>

              <div className="flex flex-col gap-2">
                {detail.outgoingRelationships.length > 0 && (
                  <div>
                    <p className="mb-1 flex items-center gap-1 font-mono text-[9px] text-slate-600">
                      <ArrowUpRight className="h-2.5 w-2.5 text-indigo-400/70" />
                      imports {detail.outgoingRelationships.length}
                    </p>
                    <div className="flex max-h-28 flex-col gap-0.5 overflow-y-auto pr-1">
                      {detail.outgoingRelationships.map((rel, i) => (
                        <div
                          key={i}
                          className="group/rel flex items-center gap-1.5 rounded-md bg-black/25 px-1.5 py-1 font-mono text-[9.5px] text-slate-400"
                          title={rel.target}
                        >
                          <ArrowRight className="h-2.5 w-2.5 shrink-0 text-indigo-400/50" />
                          <span className="truncate">{rel.target.split('/').pop()}</span>
                          <span className="ml-auto truncate text-[8.5px] text-slate-700">
                            {rel.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.incomingRelationships.length > 0 && (
                  <div>
                    <p className="mb-1 flex items-center gap-1 font-mono text-[9px] text-slate-600">
                      <ArrowDownLeft className="h-2.5 w-2.5 text-emerald-400/70" />
                      imported by {detail.incomingRelationships.length}
                    </p>
                    <div className="flex max-h-28 flex-col gap-0.5 overflow-y-auto pr-1">
                      {detail.incomingRelationships.map((rel, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 rounded-md bg-black/25 px-1.5 py-1 font-mono text-[9.5px] text-slate-400"
                          title={rel.source}
                        >
                          <ArrowDownLeft className="h-2.5 w-2.5 shrink-0 text-emerald-400/50" />
                          <span className="truncate">{rel.source.split('/').pop()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
      </div>
    </section>
  );
}
