import type { MathMDDocument, MathMDNode } from '@mathmd/ast';
import { MathMDCore } from '@mathmd/core';
import { sampleSurface } from '@mathmd/math';
import { parseMathMD } from '@mathmd/parser';

const SVG_WIDTH = 600;
const SVG_NODE_HEIGHT = 400;
const SVG_PADDING = 36;

type Supported2DNode = Extract<MathMDNode, { type: 'plot2d' | 'vector2d' | 'point2d' }>;
type Surface3DNode = Extract<MathMDNode, { type: 'surface3d' }>;

interface ProcessedPlot2D {
  points: ReadonlyArray<readonly [number, number]>;
}

interface ProcessedVector2D {
  origin: readonly [number, number];
  end: readonly [number, number];
}

interface ProcessedPoint2D {
  x: number;
  y: number;
}

export interface MathMDGeneratedAsset {
  path: string;
  mediaType: 'image/svg+xml' | 'model/stl';
  nodeIds: string[];
  content: string;
}

export interface MathMDFallbackManifest {
  version: 1;
  source: string;
  assets: Array<Omit<MathMDGeneratedAsset, 'content'>>;
}

export interface MathMDFallbackBundle {
  assets: MathMDGeneratedAsset[];
  manifest: MathMDFallbackManifest;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return /^(?:#[0-9a-fA-F]{3,8}|[a-zA-Z]{1,32})$/.test(value) ? value : fallback;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Number(value.toFixed(6)).toString();
}

function createScale(points: ReadonlyArray<readonly [number, number]>): {
  x: (value: number) => number;
  y: (value: number) => number;
} {
  const finitePoints = points.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  const xValues = finitePoints.map(([x]) => x);
  const yValues = finitePoints.map(([, y]) => y);
  const rawXMin = xValues.length > 0 ? Math.min(...xValues) : -1;
  const rawXMax = xValues.length > 0 ? Math.max(...xValues) : 1;
  const rawYMin = yValues.length > 0 ? Math.min(...yValues) : -1;
  const rawYMax = yValues.length > 0 ? Math.max(...yValues) : 1;
  const xPadding = rawXMin === rawXMax ? 1 : (rawXMax - rawXMin) * 0.05;
  const yPadding = rawYMin === rawYMax ? 1 : (rawYMax - rawYMin) * 0.05;
  const xMin = rawXMin - xPadding;
  const xMax = rawXMax + xPadding;
  const yMin = rawYMin - yPadding;
  const yMax = rawYMax + yPadding;
  const innerWidth = SVG_WIDTH - SVG_PADDING * 2;
  const innerHeight = SVG_NODE_HEIGHT - SVG_PADDING * 2;

  return {
    x: (value) => SVG_PADDING + ((value - xMin) / (xMax - xMin)) * innerWidth,
    y: (value) => SVG_NODE_HEIGHT - SVG_PADDING - ((value - yMin) / (yMax - yMin)) * innerHeight,
  };
}

function renderPlot2D(node: Extract<Supported2DNode, { type: 'plot2d' }>, core: MathMDCore): string {
  const processed = core.getNodeData(node.id) as ProcessedPlot2D;
  const points = processed.points.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  const scale = createScale(points);
  const coordinates = points
    .map(([x, y]) => `${formatNumber(scale.x(x))},${formatNumber(scale.y(y))}`)
    .join(' ');
  const color = safeColor(node.color, '#0066cc');
  return coordinates
    ? `<polyline points="${coordinates}" fill="none" stroke="${color}" stroke-width="2"/>`
    : '<text x="300" y="200" text-anchor="middle">No finite points</text>';
}

function renderVector2D(node: Extract<Supported2DNode, { type: 'vector2d' }>, core: MathMDCore): string {
  const processed = core.getNodeData(node.id) as ProcessedVector2D;
  const scale = createScale([processed.origin, processed.end]);
  const color = safeColor(node.color, '#cc0000');
  const markerId = `arrow-${escapeXml(node.id)}`;
  return `<defs><marker id="${markerId}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${color}"/></marker></defs><line x1="${formatNumber(scale.x(processed.origin[0]))}" y1="${formatNumber(scale.y(processed.origin[1]))}" x2="${formatNumber(scale.x(processed.end[0]))}" y2="${formatNumber(scale.y(processed.end[1]))}" stroke="${color}" stroke-width="2" marker-end="url(#${markerId})"/>`;
}

function renderPoint2D(node: Extract<Supported2DNode, { type: 'point2d' }>, core: MathMDCore): string {
  const processed = core.getNodeData(node.id) as ProcessedPoint2D;
  const scale = createScale([[processed.x, processed.y]]);
  const color = safeColor(node.color, '#009900');
  const label = node.label
    ? `<text x="${formatNumber(scale.x(processed.x) + 8)}" y="${formatNumber(scale.y(processed.y) - 8)}">${escapeXml(node.label)}</text>`
    : '';
  return `<circle cx="${formatNumber(scale.x(processed.x))}" cy="${formatNumber(scale.y(processed.y))}" r="5" fill="${color}"/>${label}`;
}

function render2DNode(node: Supported2DNode, core: MathMDCore): string {
  switch (node.type) {
    case 'plot2d':
      return renderPlot2D(node, core);
    case 'vector2d':
      return renderVector2D(node, core);
    case 'point2d':
      return renderPoint2D(node, core);
  }
}

function documentToSVG(document: MathMDDocument): string {
  const core = new MathMDCore(document);
  const nodes = document.children.filter(
    (node): node is Supported2DNode =>
      node.type === 'plot2d' || node.type === 'vector2d' || node.type === 'point2d',
  );
  const height = Math.max(nodes.length * SVG_NODE_HEIGHT, 1);
  const groups = nodes.map((node, index) => {
    const title = `${node.type}: ${node.id}`;
    return `<g transform="translate(0 ${index * SVG_NODE_HEIGHT})"><rect width="${SVG_WIDTH}" height="${SVG_NODE_HEIGHT}" fill="white"/><text x="12" y="22" font-family="sans-serif" font-size="14">${escapeXml(title)}</text>${render2DNode(node, core)}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${height}" viewBox="0 0 ${SVG_WIDTH} ${height}" role="img">${groups.join('')}</svg>`;
}

function vector(a: readonly number[], b: readonly number[]): [number, number, number] {
  return [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
}

function normal(a: readonly number[], b: readonly number[], c: readonly number[]): [number, number, number] {
  const u = vector(a, b);
  const v = vector(a, c);
  const x = u[1] * v[2] - u[2] * v[1];
  const y = u[2] * v[0] - u[0] * v[2];
  const z = u[0] * v[1] - u[1] * v[0];
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

function facet(a: readonly number[], b: readonly number[], c: readonly number[]): string {
  const n = normal(a, b, c);
  const vertex = (point: readonly number[]) => `      vertex ${point.map(formatNumber).join(' ')}\n`;
  return `  facet normal ${n.map(formatNumber).join(' ')}\n    outer loop\n${vertex(a)}${vertex(b)}${vertex(c)}    endloop\n  endfacet\n`;
}

function surfaceToSTL(node: Surface3DNode): string {
  const samples = node.samples ?? 50;
  const surface = sampleSurface(node.equation, node.xDomain, node.yDomain, samples, samples);
  let output = `solid ${node.id}\n`;
  for (let row = 0; row < samples - 1; row += 1) {
    for (let column = 0; column < samples - 1; column += 1) {
      const point = (r: number, c: number): [number, number, number] => [
        surface.x[r][c],
        surface.y[r][c],
        surface.z[r][c],
      ];
      const p1 = point(row, column);
      const p2 = point(row, column + 1);
      const p3 = point(row + 1, column);
      const p4 = point(row + 1, column + 1);
      output += facet(p1, p2, p3) + facet(p2, p4, p3);
    }
  }
  return `${output}endsolid ${node.id}\n`;
}

export function mathmdToSVG(markdown: string): string {
  return documentToSVG(parseMathMD(markdown));
}

export function mathmdToSTL(markdown: string): string {
  const document = parseMathMD(markdown);
  const surface = document.children.find((node): node is Surface3DNode => node.type === 'surface3d');
  return surface ? surfaceToSTL(surface) : '# No surface3d blocks found in document\n';
}

export function createGithubFallbackBundle(markdown: string, sourceName = 'document.md'): MathMDFallbackBundle {
  const document = parseMathMD(markdown);
  if (document.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    throw new Error('Cannot generate fallbacks for a document with MathMD errors');
  }

  const assets: MathMDGeneratedAsset[] = [];
  const twoDimensionalNodes = document.children.filter(
    (node): node is Supported2DNode =>
      node.type === 'plot2d' || node.type === 'vector2d' || node.type === 'point2d',
  );
  if (twoDimensionalNodes.length > 0) {
    assets.push({
      path: 'mathmd-2d.svg',
      mediaType: 'image/svg+xml',
      nodeIds: twoDimensionalNodes.map((node) => node.id),
      content: documentToSVG(document),
    });
  }

  const surfaces = document.children.filter((node): node is Surface3DNode => node.type === 'surface3d');
  surfaces.forEach((node, index) => {
    assets.push({
      path: `surface-${index + 1}.stl`,
      mediaType: 'model/stl',
      nodeIds: [node.id],
      content: surfaceToSTL(node),
    });
  });

  return {
    assets,
    manifest: {
      version: 1,
      source: sourceName,
      assets: assets.map(({ content: _content, ...asset }) => asset),
    },
  };
}
