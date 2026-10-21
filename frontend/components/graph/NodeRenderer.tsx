'use client';

import React from 'react';
import { GraphNode } from '@/types/graph';

interface NodeRendererProps {
  node: GraphNode;
  isSelected: boolean;
  onSelect: (node: GraphNode) => void;
}

export default function NodeRenderer({ node, isSelected, onSelect }: NodeRendererProps) {
  return (
    <div
      onClick={() => onSelect(node)}
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'bg-blue-950/60 border-blue-500 shadow-lg shadow-blue-500/20'
          : 'bg-gray-900/60 border-gray-800 hover:border-gray-700 hover:bg-gray-800/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono font-medium text-gray-200 truncate">{node.label}</span>
        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
          {node.type}
        </span>
      </div>
      <p className="text-[11px] font-mono text-gray-500 truncate mt-1">{node.path}</p>
    </div>
  );
}
