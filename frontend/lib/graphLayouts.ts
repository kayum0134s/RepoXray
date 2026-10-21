import { LayoutOptions } from 'cytoscape';

export type LayoutName = 'force' | 'hierarchical' | 'radial' | 'grid';

export interface LayoutConfig {
  name: LayoutName;
  label: string;
  options: LayoutOptions;
}

export const LAYOUT_OPTIONS: Record<LayoutName, LayoutOptions> = {
  force: {
    name: 'cose',
    animate: true,
    animationDuration: 500,
    refresh: 20,
    fit: true,
    padding: 50,
    randomize: false,
    componentSpacing: 80,
    nodeRepulsion: () => 400000,
    nodeOverlap: 10,
    idealEdgeLength: () => 100,
    edgeElasticity: () => 100,
    nestingFactor: 5,
    gravity: 80,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
  } as LayoutOptions,

  hierarchical: {
    name: 'breadthfirst',
    animate: true,
    animationDuration: 500,
    fit: true,
    padding: 50,
    directed: true,
    spacingFactor: 1.25,
    maximal: false,
  } as LayoutOptions,

  radial: {
    name: 'concentric',
    animate: true,
    animationDuration: 500,
    fit: true,
    padding: 50,
    startAngle: (3 * Math.PI) / 2,
    sweep: undefined,
    clockwise: true,
    equidistant: false,
    minNodeSpacing: 30,
    concentric: (node: any) => node.data('totalDegree') || 1,
    levelWidth: () => 2,
  } as LayoutOptions,

  grid: {
    name: 'grid',
    animate: true,
    animationDuration: 500,
    fit: true,
    padding: 50,
    rows: undefined,
    cols: undefined,
    position: undefined,
  } as LayoutOptions,
};
