import { parseMathMD } from '@mathmd/parser';
import { MathMDCore } from '@mathmd/core';

/**
 * Export MathMD document to SVG string (for 2D nodes only).
 * Returns a concatenated SVG of all 2D nodes stacked vertically.
 */
export function mathmdToSVG(markdown: string): string {
  const doc = parseMathMD(markdown);
  const core = new MathMDCore(doc);
  
  const svgParts: string[] = [];
  let yOffset = 0;
  const nodeHeight = 400; // height per node
  
  doc.children.forEach((node) => {
    if (node.type === 'plot2d' || node.type === 'vector2d' || node.type === 'point2d') {
      // We'll create an off-screen SVG element to render to string
      const svgNS = 'http://www.w3.org/2000/svg';
      const width = 600;
      const height = nodeHeight;
      
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('width', width.toString());
      svg.setAttribute('height', height.toString());
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      
      // Add basic styling (could be extracted to a common CSS)
      const style = document.createElementNS(svgNS, 'style');
      style.textContent = `
        .axis { stroke: #333; stroke-width: 1; }
        .grid { stroke: #eee; stroke-width: 0.5; }
        .plot-line { stroke: #0066cc; stroke-width: 2; fill: none; }
        .vector { stroke: #cc0000; stroke-width: 2; fill: #cc0000; }
        .vector-head { fill: #cc0000; }
        .point { fill: #009900; }
        .label { font-family: Arial, sans-serif; font-size: 12px; fill: #333; }
      `;
      svg.appendChild(style);
      
      // Create a renderer-like object that appends to this svg
      // We'll reuse the logic from SVGRenderer but append to svg instead of container
      // For simplicity, we'll copy the essential rendering logic here for each type.
      // In a real implementation, we would refactor SVGRenderer to be DOM-agnostic.
      
      if (node.type === 'plot2d') {
        renderPlot2DToSVG(svg, width, height, node, core);
      } else if (node.type === 'vector2d') {
        renderVector2DToSVG(svg, width, height, node, core);
      } else if (node.type === 'point2d') {
        renderPoint2DToSVG(svg, width, height, node, core);
      }
      
      // Convert SVG element to string
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      svgParts.push(svgString);
      yOffset += nodeHeight;
    }
  });
  
  // Wrap all SVGs in a container SVG? Or just return concatenated strings.
  // For simplicity, return concatenated SVGs (note: this is not a single valid SVG unless wrapped).
  // Better to return a single SVG with all content grouped.
  // We'll create a master SVG and append each node's SVG as a <g> transform.
  const masterSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  masterSVG.setAttribute('width', '600');
  masterSVG.setAttribute('height', (yOffset).toString());
  
  svgParts.forEach((part, index) => {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(part, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;
    // Adjust y position
    svgElement.setAttribute('transform', `translate(0, ${index * nodeHeight})`);
    masterSVG.appendChild(svgElement);
  });
  
  const masterSerializer = new XMLSerializer();
  return masterSerializer.serializeToString(masterSVG);
}

/**
 * Render plot2d node to SVG element (adapted from SVGRenderer)
 */
function renderPlot2DToSVG(svg: SVGElement, width: number, height: number, node: any, core: MathMDCore) {
  const { color = '#0066cc' } = node;
  
  // Create defs for styles (we'll reuse inline styles for simplicity)
  // For brevity, we'll skip implementing full grid/axes and just plot a line.
  // In a real implementation, we would copy the logic from SVGRenderer.
  
  // Sample points
  const processed = core.getNodeData(node.id);
  const points = processed.points as number[][]; // assuming we have points property
  
  if (!points || points.length === 0) return;
  
  // Calculate bounds from points (should match node's domains but we use processed)
  const xValues = points.map(p => p[0]);
  const yValues = points.map(p => p[1]);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  
  // Add padding
  const padding = 0.1;
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const viewXMin = xMin - padding * xRange;
  const viewXMax = xMax + padding * xRange;
  const viewYMin = yMin - padding * yRange;
  const viewYMax = yMax + padding * yRange;
  
  // Create transformation from data to SVG coordinates
  const xScale = width / (viewXMax - viewXMin);
  const yScale = height / (viewYMax - viewYMin);
  
  const transformX = (x: number) => (x - viewXMin) * xScale;
  const transformY = (y: number) => height - (y - viewYMin) * yScale; // SVG y down
  
  // Create path data
  if (points.length >= 2) {
    const pathData = points
      .map(p => `${transformX(p[0])},${transformY(p[1])}`)
      .join(' ');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${pathData}`);
    path.setAttribute('class', 'plot-line');
    path.setAttribute('stroke', color);
    svg.appendChild(path);
  }
  
  // TODO: Add grid, axes, labels as needed for completeness.
}

/**
 * Render vector2d node to SVG element
 */
function renderVector2DToSVG(_svg: SVGElement, _width: number, _height: number, _node: any, _core: MathMDCore) {
  // TODO: Implement vector rendering
}

/**
 * Render point2d node to SVG element
 */
function renderPoint2DToSVG(_svg: SVGElement, _width: number, _height: number, _node: any, _core: MathMDCore) {
  // TODO: Implement point rendering
}

export default { mathmdToSVG };