import { MathMDNode } from "@mathmd/ast";

interface SurfaceGrid {
  x: number[][];
  y: number[][];
  z: number[][];
}

interface RenderedVectorField {
  vectors: Array<{ position: [number, number]; vector: [number, number] }>;
}

type RenderedContour = Extract<MathMDNode, { type: "contour" }> & { surface?: SurfaceGrid };
type RenderedVectorFieldNode = Extract<MathMDNode, { type: "vectorfield2d" }> & Partial<RenderedVectorField>;

const CONTOUR_SEGMENTS: Readonly<Record<number, ReadonlyArray<readonly [number, number]>>> = {
  1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]],
  5: [[3, 2], [0, 1]], 6: [[0, 2]], 7: [[3, 2]], 8: [[2, 3]],
  9: [[0, 2]], 10: [[0, 3], [1, 2]], 11: [[1, 2]], 12: [[1, 3]],
  13: [[0, 1]], 14: [[3, 0]],
};

/**
 * SVG Renderer for MathMD 2D visualizations
 * Handles plot2d, vector2d, and other 2D elements
 */
export class SVGRenderer {
  private svgElement: SVGSVGElement;
  private width: number;
  private height: number;
  
  constructor(container: HTMLElement, width: number = 800, height: number = 600) {
    this.width = width;
    this.height = height;
    
    // Create SVG element
    this.svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svgElement.setAttribute("width", width.toString());
    this.svgElement.setAttribute("height", height.toString());
    this.svgElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
    this.svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    
    // Add default styling
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `
      .axis { stroke: #333; stroke-width: 1; }
      .grid { stroke: #eee; stroke-width: 0.5; }
      .plot-line { stroke: #0066cc; stroke-width: 2; fill: none; }
      .vector { stroke: #cc0000; stroke-width: 2; fill: #cc0000; }
      .vector-head { fill: #cc0000; }
      .point { fill: #009900; }
      .label { font-family: Arial, sans-serif; font-size: 12px; fill: #333; }
    `;
    this.svgElement.appendChild(style);
    
    container.appendChild(this.svgElement);
  }
  
  /**
   * Render a MathMD node to SVG
   */
  render(node: MathMDNode): void {
    // Clear previous content (except defs/style)
    while (this.svgElement.children.length > 1) {
      this.svgElement.removeChild(this.svgElement.lastChild!);
    }
    
    switch (node.type) {
      case "calculusviz":
        this.renderCalculusViz(node as any);
        break;

      case "flow2d":
        this.renderFlow2D(node as any);
        break;

      case "parametric2d":
        this.renderParametric2D(node as any);
        break;

      case "plot2d":
        this.renderPlot2D(node);
        break;
        
      case "vector2d":
        this.renderVector2D(node);
        break;
        
      case "point2d":
        this.renderPoint2D(node);
        break;
        
      case "contour":
        this.renderContour(node as RenderedContour);
        break;
        
      case "vectorfield2d":
        this.renderVectorField2D(node as RenderedVectorFieldNode);
        break;
        
      default:
        // For unsupported node types, render placeholder
        this.renderPlaceholder(node);
        break;
    }
  }
  
  /** Scientific 2D domains, guides and boundaries for ten calculus insertion modes. */
  private renderCalculusViz(node: Extract<MathMDNode, { type: "calculusviz" }> & {
    polygons?: Array<{ points: number[][]; fill?: string }>;
    curves?: Array<{ points: number[][]; color?: string; label?: string }>;
    guides?: Array<{ a: [number, number]; b: [number, number]; label?: string }>;
    error?: string;
  }): void {
    if (node.error) {
      const message = document.createElementNS("http://www.w3.org/2000/svg", "text");
      message.setAttribute("x", "25");
      message.setAttribute("y", "55");
      message.setAttribute("font-size", "14");
      message.setAttribute("fill", "#be123c");
      message.textContent = "No se pudo construir la región: " + node.error.slice(0, 100);
      this.svgElement.appendChild(message);
      return;
    }
    const polygons = node.polygons ?? [];
    const curves = node.curves ?? [];
    const guides = node.guides ?? [];
    const points = [
      ...polygons.flatMap(polygon => polygon.points),
      ...curves.flatMap(curve => curve.points),
      ...guides.flatMap(guide => [guide.a, guide.b]),
    ].filter(p => p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (points.length === 0) return;
    const xValues = points.map(p => p[0]), yValues = points.map(p => p[1]);
    const minX = Math.min(...xValues), maxX = Math.max(...xValues);
    const minY = Math.min(...yValues), maxY = Math.max(...yValues);
    const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
    const ratio = this.width / this.height;
    const spanX = Math.max(maxX - minX, (maxY - minY) * ratio, 0.5) * 1.2;
    const spanY = spanX / ratio;
    const loX = midX - spanX / 2, hiX = midX + spanX / 2;
    const loY = midY - spanY / 2, hiY = midY + spanY / 2;
    const transform = this.createTransform(loX, hiX, loY, hiY);
    this.renderGrid(transform,loX,hiX,loY,hiY,.25);
    this.renderAxes(transform,loX,hiX,loY,hiY);
    const pointString = (p:number[]) => transform.x(p[0]).toFixed(2) + "," + transform.y(p[1]).toFixed(2);
    for (const polygon of polygons) {
      if (polygon.points.length < 3) continue;
      const item = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      item.setAttribute("points", polygon.points.map(pointString).join(" "));
      item.setAttribute("fill", polygon.fill ?? "#93c5fd");
      item.setAttribute("fill-opacity", "0.38");
      item.setAttribute("stroke", "#64748b");
      item.setAttribute("stroke-opacity", "0.4");
      item.setAttribute("stroke-width", "1");
      this.svgElement.appendChild(item);
    }
    for (const guide of guides) {
      const item = document.createElementNS("http://www.w3.org/2000/svg", "line");
      item.setAttribute("x1", String(transform.x(guide.a[0])));
      item.setAttribute("y1", String(transform.y(guide.a[1])));
      item.setAttribute("x2", String(transform.x(guide.b[0])));
      item.setAttribute("y2", String(transform.y(guide.b[1])));
      item.setAttribute("stroke", guide.label ? "#d97706" : "#64748b");
      item.setAttribute("stroke-width", guide.label ? "1.8" : "1");
      item.setAttribute("stroke-dasharray", guide.label ? "3 3" : "4 6");
      this.svgElement.appendChild(item);
    }
    for (const curve of curves) {
      const finite = curve.points.filter(p => p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]));
      if (finite.length < 2) continue;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      path.setAttribute("points", finite.map(pointString).join(" "));
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", curve.color ?? "#2563eb");
      path.setAttribute("stroke-width", "2.6");
      this.svgElement.appendChild(path);
    }
  }

  /**
   * Streamline geometry computed with RK4 by @mathmd/math.
   */
  private renderFlow2D(node: Extract<MathMDNode, { type: "flow2d" }> & {
    flowlines: number[][][];
    vectors: Array<{ position: [number, number]; vector: [number, number] }>;
    currentT: number;
  }): void {
    const [xMin, xMax] = node.xDomain, [yMin, yMax] = node.yDomain;
    const tx = this.createTransform(xMin, xMax, yMin, yMax);
    this.renderGrid(tx, xMin, xMax, yMin, yMax, 0.3);
    this.renderAxes(tx, xMin, xMax, yMin, yMax);
    if (node.showVectors) {
      for (const item of node.vectors) {
        const [vx, vy] = item.vector;
        const magnitude = Math.hypot(vx, vy);
        if (!Number.isFinite(magnitude) || magnitude < 1e-9) continue;
        const [x, y] = item.position;
        const length = Math.min(14, 5 + 4 * magnitude);
        const x1 = tx.x(x), y1 = tx.y(y);
        const x2 = x1 + vx / magnitude * length, y2 = y1 - vy / magnitude * length;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", String(x1)); line.setAttribute("y1", String(y1));
        line.setAttribute("x2", String(x2)); line.setAttribute("y2", String(y2));
        line.setAttribute("stroke", "#93a4b8"); line.setAttribute("stroke-width", "1.2");
        this.svgElement.appendChild(line);
      }
    }
    for (const line of node.flowlines) {
      const visible = line.filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
      if (visible.length < 2) continue;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", visible.map((p, i) => (i === 0 ? "M " : "L ") +
        tx.x(p[0]).toFixed(2) + " " + tx.y(p[1]).toFixed(2)).join(" "));
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", node.color ?? "#2563eb");
      path.setAttribute("stroke-width", "2.5");
      this.svgElement.appendChild(path);
      if (node.showParticles) {
        const index = Math.max(0, Math.min(visible.length - 1, Math.floor(node.currentT / (node.stepSize ?? 0.04))));
        const [x, y] = visible[index];
        const particle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        particle.setAttribute("cx", String(tx.x(x)));
        particle.setAttribute("cy", String(tx.y(y)));
        particle.setAttribute("r", "5.5"); particle.setAttribute("fill", "#e11d48");
        particle.setAttribute("stroke", "#fff"); particle.setAttribute("stroke-width", "1.6");
        this.svgElement.appendChild(particle);
      }
    }
  }

  /**
   * Render a moving 2D parametric curve with a particle and Frenet vectors.
   * Measurements and derivatives are computed by @mathmd/math, not the renderer.
   */
  private renderParametric2D(node: Extract<MathMDNode, { type: "parametric2d" }> & {
    points: number[][];
    currentT: number;
    kinematics: { position: { x: number; y: number }; velocity: { x: number; y: number };
      acceleration: { x: number; y: number }; tangent: { x: number; y: number }; normal: { x: number; y: number } };
  }): void {
    const pairs = node.points.filter(p => p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (pairs.length < 2) return;
    const xs = pairs.map(p => p[0]), ys = pairs.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const span = Math.max(maxX - minX, maxY - minY, 0.001);
    const pad = span * 0.18;
    const pos = node.kinematics.position;
    const finiteParticle = Number.isFinite(pos.x) && Number.isFinite(pos.y);
    const xLow = node.followParticle && finiteParticle ? pos.x - span * 0.5 - pad : minX - pad;
    const xHigh = node.followParticle && finiteParticle ? pos.x + span * 0.5 + pad : maxX + pad;
    const yLow = node.followParticle && finiteParticle ? pos.y - span * 0.5 - pad : minY - pad;
    const yHigh = node.followParticle && finiteParticle ? pos.y + span * 0.5 + pad : maxY + pad;
    const tx = this.createTransform(xLow, xHigh, yLow, yHigh);
    this.renderGrid(tx, xLow, xHigh, yLow, yHigh, 0.3);
    this.renderAxes(tx, xLow, xHigh, yLow, yHigh);
    const makePath = (points: number[][]): SVGPathElement => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", points.map((p, i) => (i === 0 ? "M " : " L ") +
        tx.x(p[0]).toFixed(2) + " " + tx.y(p[1]).toFixed(2)).join(""));
      path.setAttribute("fill", "none");
      return path;
    };
    const path = makePath(pairs);
    path.setAttribute("stroke", node.color ?? "#2563eb");
    path.setAttribute("stroke-width", "2.5");
    this.svgElement.appendChild(path);
    if (node.animated === false) return; // Static curve only; no moving marker or Frenet vectors.
    const frac = Math.max(0, Math.min(1, (node.currentT - node.tDomain[0]) /
      (node.tDomain[1] - node.tDomain[0])));
    if (node.showTrail) {
      const count = Math.max(1, Math.floor(frac * (pairs.length - 1)));
      const start = Math.max(0, count - (node.trailLength ?? pairs.length));
      const trail = makePath(pairs.slice(start, count + 1));
      trail.setAttribute("stroke", "#e11d48");
      trail.setAttribute("stroke-width", "4");
      trail.setAttribute("stroke-linecap", "round");
      this.svgElement.appendChild(trail);
    }
    if (!finiteParticle) return;
    const px = tx.x(pos.x), py = tx.y(pos.y);
    const drawVector = (vec: { x: number; y: number }, color: string, name: string) => {
      const norm = Math.hypot(vec.x, vec.y);
      if (!Number.isFinite(norm) || norm < 1e-10) return;
      const distance = Math.min(span * 0.3, span * 0.2 * norm);
      const ex = tx.x(pos.x + vec.x / norm * distance);
      const ey = tx.y(pos.y + vec.y / norm * distance);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(px)); line.setAttribute("y1", String(py));
      line.setAttribute("x2", String(ex)); line.setAttribute("y2", String(ey));
      line.setAttribute("stroke", color); line.setAttribute("stroke-width", "2.6");
      this.svgElement.appendChild(line);
      const angle = Math.atan2(ey - py, ex - px);
      const arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      const tip1 = [ex - 10 * Math.cos(angle - 0.48), ey - 10 * Math.sin(angle - 0.48)];
      const tip2 = [ex - 10 * Math.cos(angle + 0.48), ey - 10 * Math.sin(angle + 0.48)];
      arrow.setAttribute("points", `${ex},${ey} ${tip1[0]},${tip1[1]} ${tip2[0]},${tip2[1]}`);
      arrow.setAttribute("fill", color);
      this.svgElement.appendChild(arrow);
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", String(ex + 5)); label.setAttribute("y", String(ey - 5));
      label.setAttribute("font-size", "13"); label.setAttribute("fill", color);
      label.textContent = name;
      this.svgElement.appendChild(label);
    };
    if (node.showVelocity) drawVector(node.kinematics.velocity, "#059669", "v");
    if (node.showAcceleration) drawVector(node.kinematics.acceleration, "#d97706", "a");
    if (node.showTangent) drawVector(node.kinematics.tangent, "#0284c7", "T");
    if (node.showNormal) drawVector(node.kinematics.normal, "#9333ea", "N");
    const particle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    particle.setAttribute("cx", String(px)); particle.setAttribute("cy", String(py));
    particle.setAttribute("r", "7");
    particle.setAttribute("fill", "#e11d48");
    particle.setAttribute("stroke", "#ffffff");
    particle.setAttribute("stroke-width", "2");
    this.svgElement.appendChild(particle);
  }

  /**
   * Render a contour node
   */
  private renderContour(node: RenderedContour): void {
    const { color = '#0066cc', surface } = node;
    if (!surface) {
      this.renderPlaceholder(node);
      return;
    }

    const zValues = surface.z.flat().filter(Number.isFinite);
    if (zValues.length === 0) return;
    const minZ = Math.min(...zValues);
    const maxZ = Math.max(...zValues);
    const levelCount = typeof node.levels === "number" ? node.levels : 10;
    const levels = Array.isArray(node.levels)
      ? node.levels
      : Array.from({ length: levelCount }, (_, index) =>
          minZ + ((index + 1) / (levelCount + 1)) * (maxZ - minZ));
    const transform = this.createTransform(
      node.xDomain[0], node.xDomain[1], node.yDomain[0], node.yDomain[1],
    );

    for (const level of levels) {
      for (let row = 0; row < surface.z.length - 1; row += 1) {
        for (let column = 0; column < surface.z[row].length - 1; column += 1) {
          const corners = [
            [surface.x[row][column], surface.y[row][column], surface.z[row][column]],
            [surface.x[row][column + 1], surface.y[row][column + 1], surface.z[row][column + 1]],
            [surface.x[row + 1][column + 1], surface.y[row + 1][column + 1], surface.z[row + 1][column + 1]],
            [surface.x[row + 1][column], surface.y[row + 1][column], surface.z[row + 1][column]],
          ] as const;
          const mask = corners.reduce((value, corner, index) =>
            value | (corner[2] >= level ? 1 << index : 0), 0);
          const segments = CONTOUR_SEGMENTS[mask] ?? [];
          const edges = [[0, 1], [1, 2], [2, 3], [3, 0]] as const;

          for (const [firstEdge, secondEdge] of segments) {
            const interpolate = (edgeIndex: number): [number, number] => {
              const [firstIndex, secondIndex] = edges[edgeIndex];
              const first = corners[firstIndex];
              const second = corners[secondIndex];
              const denominator = second[2] - first[2];
              const ratio = denominator === 0 ? 0.5 : (level - first[2]) / denominator;
              return [
                first[0] + ratio * (second[0] - first[0]),
                first[1] + ratio * (second[1] - first[1]),
              ];
            };
            const start = interpolate(firstEdge);
            const end = interpolate(secondEdge);
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", transform.x(start[0]).toString());
            line.setAttribute("y1", transform.y(start[1]).toString());
            line.setAttribute("x2", transform.x(end[0]).toString());
            line.setAttribute("y2", transform.y(end[1]).toString());
            line.setAttribute("stroke", color);
            line.setAttribute("stroke-width", "1.5");
            this.svgElement.appendChild(line);
          }
        }
      }
    }
  }
  
  /**
   * Render a vectorfield2d node
   */
  private renderVectorField2D(node: RenderedVectorFieldNode): void {
    const { xDomain, yDomain, density = 15, color = '#cc0000', vectors = [] } = node;
    const [xMin, xMax] = xDomain;
    const [yMin, yMax] = yDomain;
    const transform = this.createTransform(xMin, xMax, yMin, yMax);
    const dataScale = Math.min(xMax - xMin, yMax - yMin) / Math.max(density, 2) * 0.7;

    for (const { position: [x, y], vector: [vecX, vecY] } of vectors) {
        const magnitude = Math.hypot(vecX, vecY);
        if (!Number.isFinite(magnitude) || magnitude === 0) continue;
        const endX = x + (vecX / magnitude) * dataScale;
        const endY = y + (vecY / magnitude) * dataScale;
        
        // Create line for vector
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", transform.x(x).toString());
        line.setAttribute("y1", transform.y(y).toString());
        line.setAttribute("x2", transform.x(endX).toString());
        line.setAttribute("y2", transform.y(endY).toString());
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", "1");
        this.svgElement.appendChild(line);
        
        // Create arrow head (simple polygon)
        const renderedStartX = transform.x(x);
        const renderedStartY = transform.y(y);
        const renderedEndX = transform.x(endX);
        const renderedEndY = transform.y(endY);
        const angle = Math.atan2(renderedEndY - renderedStartY, renderedEndX - renderedStartX);
        const headSize = 3;
        const point1x = renderedEndX - headSize * Math.cos(angle - Math.PI/6);
        const point1y = renderedEndY - headSize * Math.sin(angle - Math.PI/6);
        const point2x = renderedEndX - headSize * Math.cos(angle + Math.PI/6);
        const point2y = renderedEndY - headSize * Math.sin(angle + Math.PI/6);
        
        const head = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        head.setAttribute(
          "points",
          `${renderedEndX},${renderedEndY} ${point1x},${point1y} ${point2x},${point2y}`
        );
        head.setAttribute("fill", color);
        this.svgElement.appendChild(head);
    }
  }
  
  /**
   * Render a plot2d node
   */
  private renderPlot2D(node: Extract<MathMDNode, { type: "plot2d" }> & { points?: number[][] }): void {
    const { points, grid = true, axes = true, label, color = "#0066cc" } = node;
    
    if (!points || points.length === 0) return;
    
    // Calculate bounds from points
    const xValues = points.map(p => p[0]);
    const yValues = points.map(p => p[1]);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    
    // Add padding
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
    const paddingX = xRange * 0.1;
    const paddingY = yRange * 0.1;
    const viewXMin = xMin - paddingX;
    const viewXMax = xMax + paddingX;
    const viewYMin = yMin - paddingY;
    const viewYMax = yMax + paddingY;
    
    // Create transformation from data to SVG coordinates
    const transform = this.createTransform(viewXMin, viewXMax, viewYMin, viewYMax);
    
    // Render grid
    if (grid) {
      this.renderGrid(transform, viewXMin, viewXMax, viewYMin, viewYMax);
    }
    
    // Render axes
    if (axes) {
      this.renderAxes(transform, viewXMin, viewXMax, viewYMin, viewYMax);
    }
    
    // Render plot line
    if (points.length >= 2) {
      const pathData = points
        .map(p => `${transform.x(p[0])},${transform.y(p[1])}`)
        .join(" ");
      
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M${pathData}`);
      path.setAttribute("class", "plot-line");
      path.setAttribute("stroke", color);
      this.svgElement.appendChild(path);
    }
    
    // Render label if provided
    if (label) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("class", "label");
      text.setAttribute("x", "10");
      text.setAttribute("y", "20");
      text.textContent = label;
      this.svgElement.appendChild(text);
    }
  }
  
  /**
   * Render a vector2d node
   */
  private renderVector2D(node: Extract<MathMDNode, { type: "vector2d" }> & { origin: [number, number]; vector: [number, number]; end?: [number, number] }): void {
    const { origin, vector, label, color = "#cc0000" } = node;
    const end = node.end ?? [origin[0] + vector[0], origin[1] + vector[1]];
    
    // Calculate bounds to include vector and some padding
    const points = [origin, end];
    const xValues = points.map(p => p[0]);
    const yValues = points.map(p => p[1]);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    
    // Add padding
    const range = Math.max(xMax - xMin, yMax - yMin) || 1;
    const padding = range * 0.2;
    const viewXMin = xMin - padding;
    const viewXMax = xMax + padding;
    const viewYMin = yMin - padding;
    const viewYMax = yMax + padding;
    
    // Create transformation
    const transform = this.createTransform(viewXMin, viewXMax, viewYMin, viewYMax);
    
    // Render grid and axes (lighter for vectors)
    this.renderGrid(transform, viewXMin, viewXMax, viewYMin, viewYMax, 0.2);
    this.renderAxes(transform, viewXMin, viewXMax, viewYMin, viewYMax);
    
    // Render vector line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", transform.x(origin[0]).toString());
    line.setAttribute("y1", transform.y(origin[1]).toString());
    line.setAttribute("x2", transform.x(end[0]).toString());
    line.setAttribute("y2", transform.y(end[1]).toString());
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", "2");
    this.svgElement.appendChild(line);
    
    // Render vector head (arrow)
    const headSize = Math.min(8, range * 0.05);
    const angle = Math.atan2(vector[1], vector[0]);
    const headX1 = transform.x(end[0]) - headSize * Math.cos(angle - Math.PI/6);
    const headY1 = transform.y(end[1]) - headSize * Math.sin(angle - Math.PI/6);
    const headX2 = transform.x(end[0]) - headSize * Math.cos(angle + Math.PI/6);
    const headY2 = transform.y(end[1]) - headSize * Math.sin(angle + Math.PI/6);
    
    const head = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    head.setAttribute(
      "points",
      `${transform.x(end[0])},${transform.y(end[1])} ${headX1},${headY1} ${headX2},${headY2}`
    );
    head.setAttribute("class", "vector-head");
    head.setAttribute("fill", color);
    this.svgElement.appendChild(head);
    
    // Render label if provided
    if (label) {
      const midX = (origin[0] + end[0]) / 2;
      const midY = (origin[1] + end[1]) / 2;
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("class", "label");
      text.setAttribute("x", transform.x(midX).toString());
      text.setAttribute("y", transform.y(midY).toString());
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dy", "-0.5em");
      text.textContent = label;
      this.svgElement.appendChild(text);
    }
  }
  
  /**
   * Render a point2d node
   */
  private renderPoint2D(node: Extract<MathMDNode, { type: "point2d" }> & { x: number; y: number; label?: string; color?: string }): void {
    const { x, y, label, color = "#009900" } = node;
    
    // Create a view around the point
    const range = 5; // Show 5 units around point by default
    const viewXMin = x - range;
    const viewXMax = x + range;
    const viewYMin = y - range;
    const viewYMax = y + range;
    
    // Create transformation
    const transform = this.createTransform(viewXMin, viewXMax, viewYMin, viewYMax);
    
    // Render grid and axes
    this.renderGrid(transform, viewXMin, viewXMax, viewYMin, viewYMax, 0.2);
    this.renderAxes(transform, viewXMin, viewXMax, viewYMin, viewYMax);
    
    // Render point
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", transform.x(x).toString());
    circle.setAttribute("cy", transform.y(y).toString());
    circle.setAttribute("r", "4");
    circle.setAttribute("fill", color);
    this.svgElement.appendChild(circle);
    
    // Render label if provided
    if (label) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("class", "label");
      text.setAttribute("x", transform.x(x).toString());
      text.setAttribute("y", transform.y(y).toString());
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dy", "-1.5em");
      text.textContent = label;
      this.svgElement.appendChild(text);
    }
  }
  
  /**
   * Render placeholder for unsupported nodes
   */
  private renderPlaceholder(node: MathMDNode): void {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("class", "label");
    text.setAttribute("x", "50%");
    text.setAttribute("y", "50%");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-size", "16");
    text.setAttribute("fill", "#999");
    text.textContent = `[Unsupported node type: ${node.type}]`;
    this.svgElement.appendChild(text);
  }
  
  /**
   * Create coordinate transformation from data space to SVG space
   */
  private createTransform(xMin: number, xMax: number, yMin: number, yMax: number): {
    x: (dataX: number) => number;
    y: (dataY: number) => number;
  } {
    const width = this.width;
    const height = this.height;
    const padding = 20; // pixels
    
    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;
    
    const xScale = plotWidth / (xMax - xMin);
    const yScale = plotHeight / (yMax - yMin); // Note: SVG y increases downward
    
    return {
      x: (dataX: number) => padding + (dataX - xMin) * xScale,
      y: (dataY: number) => height - padding - (dataY - yMin) * yScale
    };
  }
  
  /**
   * Render grid lines
   */
  private renderGrid(
    transform: { x: (x: number) => number; y: (y: number) => number },
    xMin: number, xMax: number,
    yMin: number, yMax: number,
    opacity: number = 0.5
  ): void {
    // Vertical grid lines
    const tickCount = 10;
    for (let i = 0; i <= tickCount; i++) {
      const x = xMin + (xMax - xMin) * (i / tickCount);
      const x1 = transform.x(x);
      const y1 = transform.y(yMin);
      const y2 = transform.y(yMax);
      
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1.toString());
      line.setAttribute("y1", y1.toString());
      line.setAttribute("x2", x1.toString());
      line.setAttribute("y2", y2.toString());
      line.setAttribute("class", "grid");
      line.setAttribute("stroke-opacity", opacity.toString());
      this.svgElement.appendChild(line);
    }
    
    // Horizontal grid lines
    for (let i = 0; i <= tickCount; i++) {
      const y = yMin + (yMax - yMin) * (i / tickCount);
      const x1 = transform.x(xMin);
      const y1 = transform.y(y);
      const x2 = transform.x(xMax);
      const y2 = y1;
      
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1.toString());
      line.setAttribute("y1", y1.toString());
      line.setAttribute("x2", x2.toString());
      line.setAttribute("y2", y2.toString());
      line.setAttribute("class", "grid");
      line.setAttribute("stroke-opacity", opacity.toString());
      this.svgElement.appendChild(line);
    }
  }
  
  /**
   * Render axes with labels and ticks
   */
  private renderAxes(
    transform: { x: (x: number) => number; y: (y: number) => number },
    xMin: number, xMax: number,
    yMin: number, yMax: number
  ): void {
    // X axis
    const xAxisY = transform.y(0);
    if (0 >= yMin && 0 <= yMax) {
      const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
      xAxis.setAttribute("x1", transform.x(xMin).toString());
      xAxis.setAttribute("y1", xAxisY.toString());
      xAxis.setAttribute("x2", transform.x(xMax).toString());
      xAxis.setAttribute("y2", xAxisY.toString());
      xAxis.setAttribute("class", "axis");
      this.svgElement.appendChild(xAxis);
    }
    
    // Y axis
    const yAxisX = transform.x(0);
    if (0 >= xMin && 0 <= xMax) {
      const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
      yAxis.setAttribute("x1", yAxisX.toString());
      yAxis.setAttribute("y1", transform.y(yMin).toString());
      yAxis.setAttribute("x2", yAxisX.toString());
      yAxis.setAttribute("y2", transform.y(yMax).toString());
      yAxis.setAttribute("class", "axis");
      this.svgElement.appendChild(yAxis);
    }
    
    // Add tick marks and labels
    const tickCount = 5;
    for (let i = 0; i <= tickCount; i++) {
      // X ticks
      const x = xMin + (xMax - xMin) * (i / tickCount);
      if (0 >= yMin && 0 <= yMax) {
        const xPos = transform.x(x);
        const tickSize = 6;
        
        const tickLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        tickLine.setAttribute("x1", xPos.toString());
        tickLine.setAttribute("y1", (xAxisY - tickSize/2).toString());
        tickLine.setAttribute("x2", xPos.toString());
        tickLine.setAttribute("y2", (xAxisY + tickSize/2).toString());
        tickLine.setAttribute("class", "axis");
        this.svgElement.appendChild(tickLine);
        
        if (Math.abs(x) > 1e-6) { // Avoid labeling 0 if it's crowded
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.setAttribute("class", "label");
          text.setAttribute("x", xPos.toString());
          text.setAttribute("y", (xAxisY - 10).toString());
          text.setAttribute("text-anchor", "middle");
          text.textContent = x.toFixed(2);
          this.svgElement.appendChild(text);
        }
      }
      
      // Y ticks
      const y = yMin + (yMax - yMin) * (i / tickCount);
      if (0 >= xMin && 0 <= xMax) {
        const yPos = transform.y(y);
        const tickSize = 6;
        
        const tickLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        tickLine.setAttribute("x1", (yAxisX - tickSize/2).toString());
        tickLine.setAttribute("y1", yPos.toString());
        tickLine.setAttribute("x2", (yAxisX + tickSize/2).toString());
        tickLine.setAttribute("y2", yPos.toString());
        tickLine.setAttribute("class", "axis");
        this.svgElement.appendChild(tickLine);
        
        if (Math.abs(y) > 1e-6) { // Avoid labeling 0 if it's crowded
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.setAttribute("class", "label");
          text.setAttribute("x", (yAxisX - 10).toString());
          text.setAttribute("y", yPos.toString());
          text.setAttribute("text-anchor", "end");
          text.textContent = y.toFixed(2);
          this.svgElement.appendChild(text);
        }
      }
    }
  }
  
  /**
   * Get the SVG element for external manipulation
   */
  getElement(): SVGSVGElement {
    return this.svgElement;
  }
  
  /**
   * Resize the SVG renderer
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.svgElement.setAttribute("width", width.toString());
    this.svgElement.setAttribute("height", height.toString());
    this.svgElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }
}
