'use client';

import React, { useEffect, useRef } from 'react';
import cytoscape, { Core, Layouts } from 'cytoscape';
import { GraphData } from '@/types/graph';
import { getNodeTheme, calculateNodeSize } from '@/lib/nodeTheme';
import { LAYOUT_OPTIONS, LayoutName } from '@/lib/graphLayouts';
import { motionDuration } from '@/lib/motion';
import { FilterState } from '@/components/panels/FilterPanel';
import { GraphViewMode } from '@/components/layout/TopBar';

interface GraphCanvasProps {
  data: GraphData | null;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  layoutName?: LayoutName;
  onCyInit?: (cy: Core) => void;
  filters?: FilterState;
  graphViewMode?: GraphViewMode;
}

const MONO = 'JetBrains Mono';

export default function GraphCanvas({
  data,
  selectedNodeId,
  onSelectNode,
  layoutName = 'force',
  onCyInit,
  filters,
  graphViewMode = 'file_map',
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const layoutRef = useRef<Layouts | null>(null);
  const onSelectRef = useRef(onSelectNode);
  onSelectRef.current = onSelectNode;

  /* ------------------------------------------------------------------ */
  /* Mount / teardown                                                    */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      textureOnViewport: true,
      motionBlur: false,
      hideEdgesOnViewport: false,
      boxSelectionEnabled: false,
      autoungrabify: false,
      minZoom: 0.15,
      maxZoom: 3,
      style: [
        {
          selector: 'node',
          style: {
            width: 'data(size)',
            height: 'data(size)',
            'background-color': 'data(color)',
            'background-opacity': 0.92,
            'border-color': 'data(borderColor)',
            'border-width': 1.5,
            'border-opacity': 0.85,
            label: 'data(label)',
            color: '#c3cfdf',
            'font-family': MONO,
            'font-size': 9,
            'font-weight': 500,
            'min-zoomed-font-size': 7,
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 6,
            'text-wrap': 'ellipsis',
            'text-max-width': '104px',
            'text-background-color': '#05080e',
            'text-background-opacity': 0.72,
            'text-background-shape': 'roundrectangle',
            'text-background-padding': '2px',
            'overlay-opacity': 0,
            'transition-property': 'background-color, border-color, border-width, opacity, width, height',
            'transition-duration': 180,
          } as any,
        },
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'line-color': '#2b3a4d',
            opacity: 0.4,
            width: 1.2,
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#3c4d63',
            'arrow-scale': 0.65,
            'transition-property': 'line-color, target-arrow-color, opacity, width',
            'transition-duration': 180,
            'overlay-opacity': 0,
          } as any,
        },
        {
          selector: 'edge[type="CALLS"]',
          style: { 'line-color': '#a16207', 'target-arrow-color': '#ca8a04', 'line-style': 'dashed' },
        },
        {
          selector: 'edge[type="EXPORTS"]',
          style: { 'line-color': '#4f46e5', 'target-arrow-color': '#6366f1' },
        },
        {
          selector: 'node.highlighted',
          style: {
            'border-color': '#67e8f9',
            'border-width': 2,
            'border-opacity': 1,
            opacity: 1,
            'z-index': 999,
          } as any,
        },
        {
          selector: 'node.selected',
          style: {
            'border-color': '#22d3ee',
            'border-width': 2.5,
            'border-opacity': 1,
            'overlay-color': '#22d3ee',
            'overlay-opacity': 0.09,
            'overlay-padding': 9,
            opacity: 1,
            'z-index': 1000,
          } as any,
        },
        {
          selector: 'edge.highlighted',
          style: {
            'line-color': '#22d3ee',
            'target-arrow-color': '#22d3ee',
            opacity: 0.75,
            width: 1.8,
            'z-index': 998,
          },
        },
        {
          selector: '.faded',
          style: { opacity: 0.12 },
        },
        {
          selector: '.hidden',
          style: { display: 'none' },
        },
      ],
    });

    cyRef.current = cy;
    onCyInit?.(cy);

    /* Interaction ---------------------------------------------------- */
    const clearFocus = () => {
      cy.elements().removeClass('faded highlighted selected');
    };

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        clearFocus();
        onSelectRef.current?.(null);
      }
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      cy.elements().addClass('faded').removeClass('highlighted selected');

      const neighborhood = node.closedNeighborhood();
      neighborhood.removeClass('faded');
      node.addClass('selected');
      node.connectedEdges().addClass('highlighted');
      node.outgoers('node').addClass('highlighted');
      node.incomers('node').addClass('highlighted');

      onSelectRef.current?.(node.id());
    });

    cy.on('mouseover', 'node', (evt) => {
      if (cy.elements('.selected').length > 0) return;
      const node = evt.target;
      node.connectedEdges().addClass('highlighted');
      node.addClass('highlighted');
      containerRef.current?.style.setProperty('cursor', 'pointer');
    });

    cy.on('mouseout', 'node', (evt) => {
      if (cy.elements('.selected').length > 0) return;
      const node = evt.target;
      node.connectedEdges().removeClass('highlighted');
      node.removeClass('highlighted');
      containerRef.current?.style.setProperty('cursor', 'default');
    });

    /* Responsive resize --------------------------------------------- */
    const observer = new ResizeObserver(() => {
      cy.resize();
    });
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      layoutRef.current?.stop();
      layoutRef.current = null;
      cy.destroy();
      cyRef.current = null;
    };
  }, [onCyInit]);

  /* ------------------------------------------------------------------ */
  /* Data + view mode                                                    */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !data) return;

    cy.batch(() => {
      cy.elements().remove();

      const elements: cytoscape.ElementDefinition[] = [];

      (data.nodes || []).forEach((node) => {
        const theme = getNodeTheme(node.language, node.type, node.path);
        const totalDegree = node.metadata?.total_degree || 0;
        const lineCount = node.metadata?.line_count || 0;

        let size = calculateNodeSize(totalDegree, lineCount);
        if (graphViewMode === 'dependency_map') {
          size = Math.max(26, Math.min(76, 28 + totalDegree * 6));
        }

        elements.push({
          group: 'nodes',
          data: {
            id: node.id,
            label: node.label,
            path: node.path,
            language: node.language,
            type: node.type,
            color: theme.color,
            borderColor: theme.borderColor,
            size,
            totalDegree,
          },
        });
      });

      (data.edges || []).forEach((edge) => {
        elements.push({
          group: 'edges',
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type,
          },
        });
      });

      cy.add(elements);
    });

    let effectiveLayout: LayoutName = layoutName;
    if (graphViewMode === 'architecture') effectiveLayout = 'hierarchical';
    else if (graphViewMode === 'dependency_map') effectiveLayout = 'radial';
    else if (graphViewMode === 'folder_map') effectiveLayout = 'grid';

    const options = LAYOUT_OPTIONS[effectiveLayout] || LAYOUT_OPTIONS.force;

    layoutRef.current?.stop();
    const layout = cy.layout({
      ...(options as any),
      animate: true,
      animationDuration: motionDuration(520),
      animationEasing: 'ease-out',
      fit: true,
      padding: 56,
    } as any);
    layoutRef.current = layout;
    layout.run();
  }, [data, layoutName, graphViewMode]);

  /* ------------------------------------------------------------------ */
  /* Filters                                                             */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !filters) return;

    cy.batch(() => {
      cy.nodes().forEach((node) => {
        const d = node.data();
        let visible = true;

        if (filters.languages.length > 0) {
          if (!d.language || !filters.languages.includes(d.language)) visible = false;
        }

        if (visible && filters.directories.length > 0) {
          const matchesDir = filters.directories.some(
            (dir) => d.path.startsWith(dir + '/') || d.path === dir
          );
          if (!matchesDir) visible = false;
        }

        if (visible && filters.nodeTypes.length > 0) {
          let categoryMatch = false;
          if (filters.nodeTypes.includes('Files') && d.type === 'file') categoryMatch = true;
          if (
            filters.nodeTypes.includes('Folders') &&
            ((d.type as string) === 'FOLDER' || (d.type as string) === 'directory')
          )
            categoryMatch = true;
          if (filters.nodeTypes.includes('Tests') && /(^|\/)(tests?|specs?)\//i.test(d.path))
            categoryMatch = true;
          if (
            filters.nodeTypes.includes('Config') &&
            /\.(json|ya?ml|toml|ini)$/i.test(d.path)
          )
            categoryMatch = true;
          if (!categoryMatch) visible = false;
        }

        node.toggleClass('hidden', !visible);
      });

      // Hide edges whose endpoints are hidden
      cy.edges().forEach((edge) => {
        const hidden =
          edge.source().hasClass('hidden') || edge.target().hasClass('hidden');
        edge.toggleClass('hidden', hidden);
      });
    });
  }, [filters]);

  /* ------------------------------------------------------------------ */
  /* External selection                                                  */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    if (!selectedNodeId) {
      cy.elements().removeClass('faded highlighted selected');
      return;
    }

    const node = cy.getElementById(selectedNodeId);
    if (!node || node.length === 0) return;

    cy.elements().addClass('faded').removeClass('highlighted selected');
    node.closedNeighborhood().removeClass('faded');
    node.addClass('selected');
    node.connectedEdges().addClass('highlighted');
    node.outgoers('node').addClass('highlighted');
    node.incomers('node').addClass('highlighted');

    cy.animate(
      { center: { eles: node } },
      { duration: motionDuration(360), easing: 'ease-out' }
    );
  }, [selectedNodeId]);

  return <div ref={containerRef} className="graph-canvas h-full w-full" />;
}
