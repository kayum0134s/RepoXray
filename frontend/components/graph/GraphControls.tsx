'use client';

import React from 'react';
import { LayoutName } from '@/lib/graphLayouts';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Compass,
  HelpCircle,
  Expand,
  Shrink,
  LayoutGrid,
  Crosshair,
} from 'lucide-react';

interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
  onCenter: () => void;
  currentLayout: LayoutName;
  onChangeLayout: (layout: LayoutName) => void;
  onToggleShortcuts: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;
}

const LAYOUTS: Array<{ value: LayoutName; label: string }> = [
  { value: 'force', label: 'Force directed' },
  { value: 'hierarchical', label: 'Hierarchical' },
  { value: 'radial', label: 'Radial' },
  { value: 'grid', label: 'Grid' },
];

export default function GraphControls({
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
  onCenter,
  currentLayout,
  onChangeLayout,
  onToggleShortcuts,
  isFullscreen,
  onToggleFullscreen,
  showGrid,
  onToggleGrid,
}: GraphControlsProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-black/40 p-0.5">
      {/* Layout picker */}
      <div className="group/picker relative flex items-center">
        <Compass className="pointer-events-none absolute left-1.5 h-3 w-3 text-cyan-300/70" />
        <select
          value={currentLayout}
          onChange={(e) => onChangeLayout(e.target.value as LayoutName)}
          aria-label="Graph layout engine"
          className="h-6 cursor-pointer appearance-none rounded-md bg-transparent py-0 pl-6 pr-4 font-mono text-[9.5px] text-slate-300 outline-none transition-colors hover:bg-white/[0.05] focus-visible:ring-1 focus-visible:ring-cyan-400/50"
          title="Layout engine"
        >
          {LAYOUTS.map((l) => (
            <option key={l.value} value={l.value} className="bg-[#0b1018] text-slate-200">
              {l.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-1.5 text-[7px] text-slate-600">▾</span>
      </div>

      <span className="mx-0.5 h-4 w-px bg-white/[0.07]" />

      <button onClick={onZoomIn} className="icon-btn h-6 w-6" title="Zoom in (+)">
        <ZoomIn className="h-3 w-3" />
      </button>
      <button onClick={onZoomOut} className="icon-btn h-6 w-6" title="Zoom out (−)">
        <ZoomOut className="h-3 w-3" />
      </button>
      <button onClick={onFit} className="icon-btn h-6 w-6" title="Fit to viewport (F)">
        <Maximize2 className="h-3 w-3" />
      </button>
      <button onClick={onCenter} className="icon-btn h-6 w-6" title="Center selection">
        <Crosshair className="h-3 w-3" />
      </button>
      <button onClick={onReset} className="icon-btn h-6 w-6" title="Re-run layout (R)">
        <RotateCcw className="h-3 w-3" />
      </button>

      <span className="mx-0.5 h-4 w-px bg-white/[0.07]" />

      {onToggleGrid && (
        <button
          onClick={onToggleGrid}
          aria-pressed={showGrid}
          className={`icon-btn h-6 w-6 ${showGrid ? 'text-cyan-300/80' : 'text-slate-600'}`}
          title="Toggle dot grid"
        >
          <LayoutGrid className="h-3 w-3" />
        </button>
      )}

      {onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className="icon-btn h-6 w-6"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen canvas'}
        >
          {isFullscreen ? <Shrink className="h-3 w-3" /> : <Expand className="h-3 w-3" />}
        </button>
      )}

      <button
        onClick={onToggleShortcuts}
        className="icon-btn h-6 w-6 text-slate-500"
        title="Keyboard shortcuts (?)"
      >
        <HelpCircle className="h-3 w-3" />
      </button>
    </div>
  );
}
