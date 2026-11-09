import type { MathMDNode } from "@mathmd/ast";
import { sampleSurface, sampleParametricTrajectory, computeKinematics } from "@mathmd/math";

function getX(pos: { x: number; y: number; z: number } | [number, number, number]): number {
  return Array.isArray(pos) ? pos[0] : pos.x;
}
function getY(pos: { x: number; y: number; z: number } | [number, number, number]): number {
  return Array.isArray(pos) ? pos[1] : pos.y;
}
function getZ(pos: { x: number; y: number; z: number } | [number, number, number]): number {
  return Array.isArray(pos) ? pos[2] : pos.z;
}

export interface PlotlyApi {
  newPlot(element: HTMLElement, data: unknown[], layout: object, config: object): Promise<unknown>;
  react(element: HTMLElement, data: unknown[], layout: object, config: object): Promise<unknown>;
  relayout(element: HTMLElement, update: object): Promise<unknown>;
  purge(element: HTMLElement): void;
  Plots: { resize(element: HTMLElement): void };
}

type PlotlyRenderNode = MathMDNode & {
  points?: any;
  scope?: Record<string, number>;
  currentT?: number;
  particle?: boolean;
  showVectors?: boolean;
  showTNB?: boolean;
  samples?: number;
  origin?: number[];
  vector?: number[];
  end?: number[];
  tipPoints?: number[][];
  layer?: string;
  visible?: boolean;
  position?: { x: number; y: number; z: number } | [number, number, number];
  trail?: ({ x: number; y: number; z: number } | [number, number, number])[];
  T?: { start: { x: number; y: number; z: number } | [number, number, number]; end: { x: number; y: number; z: number } | [number, number, number]; color?: string; curvatureType?: string; curvatureValue?: number };
  N?: { start: { x: number; y: number; z: number } | [number, number, number]; end: { x: number; y: number; z: number } | [number, number, number]; color?: string; curvatureType?: string };
  B?: { start: { x: number; y: number; z: number } | [number, number, number]; end: { x: number; y: number; z: number } | [number, number, number]; color?: string; torsionType?: string; torsionValue?: number };
  isStationary?: boolean;
  isDegenerate?: boolean;
  vectors?: { position: number[]; vector: number[]; magnitude: number }[];
  dimensions?: 2 | 3;
  x?: Array<string | number | boolean | null>;
  y?: Array<string | number | boolean | null>;
  trend?: { slope: number; intercept: number; r2: number } | null;
  error?: string;
};

/**
 * Plotly Renderer for MathMD 3D visualizations
 * Handles surface3d blocks
 */
export class PlotlyRenderer {
  private plotlyDiv: HTMLDivElement;
  private layout: any = {};
  private config: any = {};
  private data: any[] = [];
  private plotly: PlotlyApi | null;
  private plotlyPromise: Promise<PlotlyApi> | null = null;
  private hasPlot = false;
  private destroyed = false;

  constructor(container: HTMLElement, plotly: PlotlyApi | null = null) {
    this.plotly = plotly;
    this.plotlyDiv = document.createElement("div");
    this.plotlyDiv.style.width = "100%";
    this.plotlyDiv.style.height = "100%";
    this.plotlyDiv.style.position = "relative";
    container.appendChild(this.plotlyDiv);

    this.layout = {
      title: "",
      scene: {
        xaxis: { title: "X", showgrid: true, zeroline: true, showbackground: true },
        yaxis: { title: "Y", showgrid: true, zeroline: true, showbackground: true },
        zaxis: { title: "Z", showgrid: true, zeroline: true, showbackground: true },
        camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } },
        aspectmode: "cube"
      },
      margin: { l: 0, r: 0, b: 0, t: 30 }
    };

    this.config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: [
        "sendDataToCloud",
        "autoScale2d",
        "resetScale2d",
        "hoverClosestCartesian",
        "hoverCompareCartesian"
      ]
    };
  }

  /**
   * Render a MathMD node to Plotly
   */
  render(node: PlotlyRenderNode): void {
    this.data = [];

    switch (node.type) {
      case "datachart":
        this.renderDataChart(node as any);
        break;

      case "surface3d":
        this.renderSurface3D(node as any);
        break;

      case "curve3d":
        this.renderCurve3D(node as any);
        break;

      case "trajectory":
        this.renderTrajectory(node as any);
        break;

      case "particle":
        this.renderParticle(node as any);
        break;

      case "frame":
        this.renderFrame(node as any);
        break;

      case "field":
        this.renderField(node as any);
        break;

      case "region":
        this.renderRegion(node as any);
        break;

      case "camera":
        this.renderCamera(node as any);
        break;

      case "vectorarrow":
        this.renderVectorArrow(node as any);
        break;

      default:
        this.renderError(`Unsupported 3D node type: ${node.type}`);
        break;
    }

    void this.updatePlot();
  }

  private renderDataChart(node: Extract<PlotlyRenderNode, { type: "datachart" }>): void {
    if (node.error) {
      this.renderError(node.error);
      return;
    }
    const x = node.x ?? [];
    const y = node.y ?? [];
    const kind = node.kind;
    const color = node.color ?? "#2563eb";
    const name = node.title ?? node.yColumn ?? node.xColumn;
    const trace: any = {
      name,
      x: [...x],
      y: [...y],
      marker: { color },
      line: { color, width: 2.5 },
    };
    if (kind === "scatter") {
      trace.type = "scatter";
      trace.mode = "markers";
    } else if (kind === "line" || kind === "area" || kind === "step") {
      trace.type = "scatter";
      trace.mode = "lines+markers";
      if (kind === "area") trace.fill = "tozeroy";
      if (kind === "step") trace.line.shape = "hv";
    } else if (kind === "bar") {
      trace.type = "bar";
    } else if (kind === "histogram") {
      trace.type = "histogram";
      trace.nbinsx = node.bins ?? 20;
      delete trace.y;
    } else if (kind === "box") {
      trace.type = "box";
      trace.y = [...x];
      delete trace.x;
    } else if (kind === "pie") {
      trace.type = "pie";
      trace.labels = [...x];
      trace.values = [...y];
      delete trace.x;
      delete trace.y;
    }
    this.data = [trace];
    if (node.trend && (kind === "scatter" || kind === "line")) {
      const nums = x.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      if (nums.length >= 2) {
        const xMin = Math.min(...nums);
        const xMax = Math.max(...nums);
        this.data.push({ type: "scatter", mode: "lines", name: "Regresión lineal",
          x: [xMin, xMax], y: [node.trend.intercept + node.trend.slope * xMin, node.trend.intercept + node.trend.slope * xMax],
          line: { color: "#e11d48", dash: "dash", width: 2 } });
      }
    }
    this.layout.title = { text: name, x: 0.5 };
    this.layout.xaxis = { title: node.xColumn, zeroline: true, showgrid: true };
    this.layout.yaxis = { title: node.yColumn ?? "", zeroline: true, showgrid: true };
    this.layout.margin = { l: 55, r: 18, b: 55, t: 54 };
    this.layout.showlegend = this.data.length > 1;
  }

  private renderCurve3D(node: Extract<PlotlyRenderNode, { type: "curve3d" }>): void {
    const { x, y, z, tDomain, color } = node;
    const samples = node.samples || 200;
    const scope = node.scope || {};
    try {
      const trajectory = node.points ?? sampleParametricTrajectory(
        { x, y, z },
        tDomain,
        samples,
        scope
      );

      const xs = trajectory.map((p: any) => Array.isArray(p) ? p[0] : p.x);
      const ys = trajectory.map((p: any) => Array.isArray(p) ? p[1] : p.y);
      const zs = trajectory.map((p: any) => Array.isArray(p) ? p[2] : p.z);

      const curveTrace = {
        type: "scatter3d",
        mode: "lines",
        x: xs,
        y: ys,
        z: zs,
        line: {
          color: color || "#38bdf8",
          width: 5
        },
        name: `r(t)`
      };

      const traces: any[] = [curveTrace];

      if (node.currentT !== undefined || node.particle) {
        const particleT = node.currentT ?? tDomain[1];
        const kin = computeKinematics({ x, y, z }, particleT, scope);
        traces.push({
          type: "scatter3d",
          mode: "markers",
          x: [kin.position.x],
          y: [kin.position.y],
          z: [kin.position.z],
          marker: {
            size: 8,
            color: "#f43f5e"
          },
          name: "Particula"
        });

        if (node.showVectors) {
          const vScale = 0.5;
          traces.push({
            type: "scatter3d",
            mode: "lines",
            x: [kin.position.x, kin.position.x + kin.velocity.x * vScale],
            y: [kin.position.y, kin.position.y + kin.velocity.y * vScale],
            z: [kin.position.z, kin.position.z + kin.velocity.z * vScale],
            line: { color: "#10b981", width: 4 },
            name: "v(t)"
          });
          traces.push({
            type: "scatter3d",
            mode: "lines",
            x: [kin.position.x, kin.position.x + kin.acceleration.x * vScale],
            y: [kin.position.y, kin.position.y + kin.acceleration.y * vScale],
            z: [kin.position.z, kin.position.z + kin.acceleration.z * vScale],
            line: { color: "#f59e0b", width: 4 },
            name: "a(t)"
          });
        }

        if (node.showTNB) {
          const frameLen = 0.8;
          traces.push({
            type: "scatter3d",
            mode: "lines",
            x: [kin.position.x, kin.position.x + kin.tangent.x * frameLen],
            y: [kin.position.y, kin.position.y + kin.tangent.y * frameLen],
            z: [kin.position.z, kin.position.z + kin.tangent.z * frameLen],
            line: { color: "#06b6d4", width: 5 },
            name: "T"
          });
          traces.push({
            type: "scatter3d",
            mode: "lines",
            x: [kin.position.x, kin.position.x + kin.normal.x * frameLen],
            y: [kin.position.y, kin.position.y + kin.normal.y * frameLen],
            z: [kin.position.z, kin.position.z + kin.normal.z * frameLen],
            line: { color: "#a855f7", width: 5 },
            name: "N"
          });
          traces.push({
            type: "scatter3d",
            mode: "lines",
            x: [kin.position.x, kin.position.x + kin.binormal.x * frameLen],
            y: [kin.position.y, kin.position.y + kin.binormal.y * frameLen],
            z: [kin.position.z, kin.position.z + kin.binormal.z * frameLen],
            line: { color: "#ec4899", width: 5 },
            name: "B"
          });
        }
      }

      this.data = traces;
      this.layout.title = {
        text: `Curva Parametrica 3D r(t) = (${x}, ${y}, ${z})`,
        x: 0.5,
        xanchor: "center"
      };
      this.layout.scene.aspectmode = "data";
    } catch (error: any) {
      this.renderError(`Error rendering curve3d: ${error?.message || String(error)}`);
    }
  }

  private renderVectorArrow(node: Extract<PlotlyRenderNode, { type: "vectorarrow" }>): void {
    if (node.visible === false) {
      this.renderError("Vector arrow hidden");
      return;
    }
    try {
      const { origin, end, tipPoints, color } = node;
      const o = origin ?? [0, 0, 0];
      const e = end ?? [1, 0, 0];
      const vecColor = color ?? "#0284c7";
      
      const traces: any[] = [];
      
      traces.push({
        type: "scatter3d",
        mode: "lines",
        x: [o[0], e[0]],
        y: [o[1], e[1]],
        z: [o[2], e[2]],
        line: {
          color: vecColor,
          width: 6
        },
        name: node.label ?? "Vector"
      });
      
      if (tipPoints && tipPoints.length > 0) {
        const tipXs = tipPoints.map((p: number[]) => p[0]);
        const tipYs = tipPoints.map((p: number[]) => p[1]);
        const tipZs = tipPoints.map((p: number[]) => p[2]);
        
        traces.push({
          type: "scatter3d",
          mode: "lines",
          x: tipXs,
          y: tipYs,
          z: tipZs,
          line: {
            color: vecColor,
            width: 6
          },
          name: `${node.label ?? "Vector"} tip`,
          showlegend: false
        });
      }
      
      traces.push({
        type: "scatter3d",
        mode: "markers",
        x: [o[0]],
        y: [o[1]],
        z: [o[2]],
        marker: {
          size: 5,
          color: vecColor,
          symbol: "circle"
        },
        name: "Origen",
        showlegend: false
      });

      this.data = traces;
      this.layout.title = {
        text: `Vector ${node.label ?? ""}`,
        x: 0.5,
        xanchor: "center"
      };
      this.layout.scene.aspectmode = "data";
    } catch (error: any) {
      this.renderError(`Error rendering vectorarrow: ${error?.message || String(error)}`);
    }
  }

  private renderTrajectory(node: Extract<PlotlyRenderNode, { type: "trajectory" }>): void {
    const { x, y, z, tDomain, color, samples } = node;
    const scope = node.scope || {};
    const sampleCount = samples || 200;
    try {
      const trajectory = node.points ?? sampleParametricTrajectory(
        { x, y, z },
        tDomain,
        sampleCount,
        scope
      );

      const xs = trajectory.map((p: any) => Array.isArray(p) ? p[0] : p.x);
      const ys = trajectory.map((p: any) => Array.isArray(p) ? p[1] : p.y);
      const zs = trajectory.map((p: any) => Array.isArray(p) ? p[2] : p.z);

      const curveTrace = {
        type: "scatter3d",
        mode: "lines",
        x: xs,
        y: ys,
        z: zs,
        line: {
          color: color || "#38bdf8",
          width: 5
        },
        name: `r(t)`
      };

      this.data = [curveTrace];
      this.layout.title = {
        text: `Trayectoria r(t) = (${x}, ${y}, ${z})`,
        x: 0.5,
        xanchor: "center"
      };
      this.layout.scene.aspectmode = "data";
    } catch (error: any) {
      this.renderError(`Error rendering trajectory: ${error?.message || String(error)}`);
    }
  }

  private renderParticle(node: Extract<PlotlyRenderNode, { type: "particle" }>): void {
    try {
      const { position, trail, currentT, size, color, showTrail } = node;
      const traces: any[] = [];

      if (position) {
        traces.push({
          type: "scatter3d",
          mode: "markers",
          x: [getX(position)],
          y: [getY(position)],
          z: [getZ(position)],
          marker: {
            size: size ?? 8,
            color: color ?? "#f43f5e"
          },
          name: `Partícula (t=${currentT?.toFixed(2) ?? "?"})`
        });
      }

      if (showTrail !== false && trail && trail.length > 0) {
        const trailXs = trail.map(getX);
        const trailYs = trail.map(getY);
        const trailZs = trail.map(getZ);
        
        traces.push({
          type: "scatter3d",
          mode: "lines",
          x: trailXs,
          y: trailYs,
          z: trailZs,
          line: {
            color: color ?? "#f43f5e",
            width: 3,
            dash: "dot"
          },
          name: "Estela",
          showlegend: false
        });
      }

      this.data = traces;
      this.layout.title = {
        text: `Partícula en t=${currentT?.toFixed(2) ?? "?"}`,
        x: 0.5,
        xanchor: "center"
      };
      this.layout.scene.aspectmode = "data";
    } catch (error: any) {
      this.renderError(`Error rendering particle: ${error?.message || String(error)}`);
    }
  }

  private renderFrame(node: Extract<PlotlyRenderNode, { type: "frame" }>): void {
    try {
      const { T, N, B, position, currentT, isStationary, isDegenerate } = node;
      const traces: any[] = [];

      if (position) {
        traces.push({
          type: "scatter3d",
          mode: "markers",
          x: [getX(position)],
          y: [getY(position)],
          z: [getZ(position)],
          marker: { size: 6, color: "#6366f1" },
          name: `Posición t=${currentT?.toFixed(2) ?? "?"}`,
          showlegend: false
        });
      }

      const addVector = (vec: any, name: string, color: string, showLegend = true) => {
        if (!vec) return;
        traces.push({
          type: "scatter3d",
          mode: "lines",
          x: [getX(vec.start), getX(vec.end)],
          y: [getY(vec.start), getY(vec.end)],
          z: [getZ(vec.start), getZ(vec.end)],
          line: { color, width: 5 },
          name,
          showlegend: showLegend
        });
      };

      if (T) addVector(T, `T (κ=${T.curvatureType ?? "num"}: ${T.curvatureValue?.toFixed(3) ?? "?"})`, "#06b6d4");
      if (N) addVector(N, `N (${N.curvatureType ?? "num"})`, "#a855f7");
      if (B) addVector(B, `B (τ=${B.torsionType ?? "num"}: ${B.torsionValue?.toFixed(3) ?? "?"})`, "#ec4899");

      if (isStationary) {
        traces.push({
          type: "scatter3d",
          mode: "text",
          x: [position ? getX(position) : 0],
          y: [position ? getY(position) : 0],
          z: [position ? getZ(position) + 0.5 : 0.5],
          text: ["Punto estacionario - Frenet indefinido"],
          textfont: { color: "#f59e0b", size: 12 },
          showlegend: false
        });
      } else if (isDegenerate) {
        traces.push({
          type: "scatter3d",
          mode: "text",
          x: [position ? getX(position) : 0],
          y: [position ? getY(position) : 0],
          z: [position ? getZ(position) + 0.5 : 0.5],
          text: ["Curvatura/torsión degenerada - marco auxiliar"],
          textfont: { color: "#f59e0b", size: 12 },
          showlegend: false
        });
      }

      this.data = traces;
      this.layout.title = {
        text: `Marco de Frenet en t=${currentT?.toFixed(2) ?? "?"}`,
        x: 0.5,
        xanchor: "center"
      };
      this.layout.scene.aspectmode = "data";
    } catch (error: any) {
      this.renderError(`Error rendering frame: ${error?.message || String(error)}`);
    }
  }

  private renderField(node: Extract<PlotlyRenderNode, { type: "field" }>): void {
    try {
      const { vectors, dimensions, color } = node;
      const traces: any[] = [];
      const vecColor = color ?? "#0284c7";

      if (vectors && vectors.length > 0) {
        const maxVectors = 500;
        const step = Math.max(1, Math.floor(vectors.length / maxVectors));
        
        const lineSegments: { x: number[]; y: number[]; z: number[] }[] = [];
        
        for (let i = 0; i < vectors.length; i += step) {
          const v = vectors[i];
          const pos = v.position;
          const vec = v.vector;
          const mag = v.magnitude;
          
          if (mag === 0) continue;
          
          const scale = 0.3 / Math.max(0.1, mag); // Normalize length
          const end = [
            pos[0] + vec[0] * scale,
            pos[1] + vec[1] * scale,
            pos[2] + vec[2] * scale
          ];
          
          lineSegments.push({
            x: [pos[0], end[0], NaN],
            y: [pos[1], end[1], NaN],
            z: [pos[2], end[2], NaN]
          });
        }
        
        if (lineSegments.length > 0) {
          const allX = lineSegments.flatMap(s => s.x);
          const allY = lineSegments.flatMap(s => s.y);
          const allZ = lineSegments.flatMap(s => s.z);
          
          traces.push({
            type: "scatter3d",
            mode: "lines",
            x: allX,
            y: allY,
            z: allZ,
            line: { color: vecColor, width: 2 },
            name: `Campo ${dimensions}D`,
            showlegend: true
          });
        }
      }

      this.data = traces;
      this.layout.title = {
        text: `Campo Vectorial ${dimensions}D`,
        x: 0.5,
        xanchor: "center"
      };
      this.layout.scene.aspectmode = "data";
    } catch (error: any) {
      this.renderError(`Error rendering field: ${error?.message || String(error)}`);
    }
  }

  private renderRegion(node: Extract<PlotlyRenderNode, { type: "region" }>): void {
    try {
      const { boundary, fillColor, fillOpacity, orientation } = node;
      const traces: any[] = [];
      
      let regionType = "unknown";
      let center: [number, number] = [0, 0];
      let radius = 1;
      let xRange: [number, number] = [-1, 1];
      let yRange: [number, number] = [-1, 1];
      
      if (boundary.startsWith("disk")) {
        regionType = "disk";
        const match = boundary.match(/disk\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/);
        if (match) {
          center = [parseFloat(match[1]), parseFloat(match[2])];
          radius = parseFloat(match[3]);
        }
      } else if (boundary.startsWith("rectangle")) {
        regionType = "rectangle";
        const match = boundary.match(/rectangle\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/);
        if (match) {
          xRange = [parseFloat(match[1]), parseFloat(match[2])];
          yRange = [parseFloat(match[3]), parseFloat(match[4])];
        }
      }
      
      const regionFillColor = fillColor ?? "#6366f1";
      const regionFillOpacity = fillOpacity ?? 0.2;
      
      if (regionType === "disk") {
        const thetaCount = 32;
        const rCount = 8;
        const verticesX: number[] = [];
        const verticesY: number[] = [];
        const verticesZ: number[] = [];
        const facesI: number[] = [];
        const facesJ: number[] = [];
        const facesK: number[] = [];
        
        verticesX.push(center[0]);
        verticesY.push(center[1]);
        verticesZ.push(0);
        
        for (let r = 1; r <= rCount; r++) {
          const rVal = (r / rCount) * radius;
          for (let t = 0; t < thetaCount; t++) {
            const theta = (t / thetaCount) * 2 * Math.PI;
            verticesX.push(center[0] + rVal * Math.cos(theta));
            verticesY.push(center[1] + rVal * Math.sin(theta));
            verticesZ.push(0);
          }
        }
        
        for (let t = 0; t < thetaCount; t++) {
          const nextT = (t + 1) % thetaCount;
          facesI.push(0);
          facesJ.push(1 + t);
          facesK.push(1 + nextT);
        }
        
        for (let r = 1; r < rCount; r++) {
          for (let t = 0; t < thetaCount; t++) {
            const nextT = (t + 1) % thetaCount;
            const base = 1 + (r - 1) * thetaCount;
            const nextBase = 1 + r * thetaCount;
            
            facesI.push(base + t);
            facesJ.push(nextBase + t);
            facesK.push(base + nextT);
            
            facesI.push(base + nextT);
            facesJ.push(nextBase + t);
            facesK.push(nextBase + nextT);
          }
        }
        
        traces.push({
          type: "mesh3d",
          x: verticesX,
          y: verticesY,
          z: verticesZ,
          i: facesI,
          j: facesJ,
          k: facesK,
          color: regionFillColor,
          opacity: regionFillOpacity,
          flatshading: true,
          name: `Región: ${boundary}`,
          showlegend: true
        });
        
        const boundaryCount = 64;
        const boundaryX: number[] = [];
        const boundaryY: number[] = [];
        const boundaryZ: number[] = [];
        for (let i = 0; i <= boundaryCount; i++) {
          const theta = (i / boundaryCount) * 2 * Math.PI;
          boundaryX.push(center[0] + radius * Math.cos(theta));
          boundaryY.push(center[1] + radius * Math.sin(theta));
          boundaryZ.push(0);
        }
        traces.push({
          type: "scatter3d",
          mode: "lines",
          x: boundaryX,
          y: boundaryY,
          z: boundaryZ,
          line: { color: "#6366f1", width: 4 },
          name: "Frontera",
          showlegend: false
        });
        
      } else if (regionType === "rectangle") {
        const verticesX = [xRange[0], xRange[1], xRange[1], xRange[0]];
        const verticesY = [yRange[0], yRange[0], yRange[1], yRange[1]];
        const verticesZ = [0, 0, 0, 0];
        
        traces.push({
          type: "mesh3d",
          x: verticesX,
          y: verticesY,
          z: verticesZ,
          i: [0],
          j: [1],
          k: [2],
          color: regionFillColor,
          opacity: regionFillOpacity,
          flatshading: true,
          name: `Región: ${boundary}`,
          showlegend: true
        });
        
        traces.push({
          type: "mesh3d",
          x: verticesX,
          y: verticesY,
          z: verticesZ,
          i: [0],
          j: [2],
          k: [3],
          color: regionFillColor,
          opacity: regionFillOpacity,
          flatshading: true,
          showlegend: false
        });
        
        const boundaryX = [xRange[0], xRange[1], xRange[1], xRange[0], xRange[0]];
        const boundaryY = [yRange[0], yRange[0], yRange[1], yRange[1], yRange[0]];
        const boundaryZ = [0, 0, 0, 0, 0];
        traces.push({
          type: "scatter3d",
          mode: "lines",
          x: boundaryX,
          y: boundaryY,
          z: boundaryZ,
          line: { color: "#6366f1", width: 4 },
          name: "Frontera",
          showlegend: false
        });
        
      } else {
        traces.push({
          type: "scatter3d",
          mode: "text",
          x: [0],
          y: [0],
          z: [0],
          text: [`Región: ${boundary}\nOrientación: ${orientation ?? "ccw"}\n(Formato: disk(cx,cy,r) o rectangle(xmin,xmax,ymin,ymax))`],
          textfont: { color: fillColor ?? "#6366f1", size: 14 },
          showlegend: false
        });
      }
      
      this.data = traces;
      this.layout.title = {
        text: `Región para Green/Stokes (${orientation ?? "ccw"})`,
        x: 0.5,
        xanchor: "center"
      };
      this.layout.scene.aspectmode = "data";
    } catch (error: any) {
      this.renderError(`Error rendering region: ${error?.message || String(error)}`);
    }
  }

  private renderCamera(node: Extract<PlotlyRenderNode, { type: "camera" }>): void {
    try {
      const { mode, target, eye, up } = node;
      const traces: any[] = [];
      
      const cameraMode = mode ?? "fixed";
      let cameraLayout: any = {};
      
      if (cameraMode === "follow" && target) {
        traces.push({
          type: "scatter3d",
          mode: "text",
          x: [0],
          y: [0],
          z: [0],
          text: [`Cámara: follow\nTarget: ${target}\n(Seguimiento dinámico pendiente)`],
          textfont: { color: "#6366f1", size: 12 },
          showlegend: false
        });
        cameraLayout = {
          eye: eye ? { x: eye[0], y: eye[1], z: eye[2] } : { x: 1.5, y: 1.5, z: 1.5 },
          up: up ? { x: up[0], y: up[1], z: up[2] } : { x: 0, y: 0, z: 1 }
        };
      } else if (cameraMode === "orbit") {
        traces.push({
          type: "scatter3d",
          mode: "text",
          x: [0],
          y: [0],
          z: [0],
          text: [`Cámara: orbit\nTarget: ${target ?? "origin"}\n(Órbita automática pendiente)`],
          textfont: { color: "#6366f1", size: 12 },
          showlegend: false
        });
        cameraLayout = {
          eye: eye ? { x: eye[0], y: eye[1], z: eye[2] } : { x: 2, y: 2, z: 2 },
          up: up ? { x: up[0], y: up[1], z: up[2] } : { x: 0, y: 0, z: 1 }
        };
      } else {
        traces.push({
          type: "scatter3d",
          mode: "text",
          x: [0],
          y: [0],
          z: [0],
          text: [`Cámara: fixed\nPosición fija`],
          textfont: { color: "#6366f1", size: 12 },
          showlegend: false
        });
        cameraLayout = {
          eye: eye ? { x: eye[0], y: eye[1], z: eye[2] } : { x: 1.5, y: 1.5, z: 1.5 },
          up: up ? { x: up[0], y: up[1], z: up[2] } : { x: 0, y: 0, z: 1 }
        };
      }
      
      this.data = traces;
      this.layout.title = {
        text: `Cámara (${cameraMode})`,
        x: 0.5,
        xanchor: "center"
      };
      if (Object.keys(cameraLayout).length > 0) {
        this.layout.scene.camera = cameraLayout;
      }
      this.layout.scene.aspectmode = "data";
    } catch (error: any) {
      this.renderError(`Error rendering camera: ${error?.message || String(error)}`);
    }
  }

  /**
   * Render a surface3d node
   */
  private renderSurface3D(node: Extract<PlotlyRenderNode, { 
    type: "surface3d"; 
    equation: string; 
    xDomain: [number, number]; 
    yDomain: [number, number]; 
    samples?: number; 
    contours?: boolean; 
    color?: string;
  }>): void {
    const { equation, xDomain, yDomain, samples = 50, contours = false, color } = node;
    const { showscale = false, colorscale, reversescale = false, opacity } = node as any;
    
    try {
      const surfaceData = node.points ?? sampleSurface(
        equation,
        xDomain,
        yDomain,
        samples,
        samples
      );
      
      const { x, y, z } = surfaceData;
      
      const surfaceTrace = {
        type: "surface",
        x: x,
        y: y,
        z: z,
        colorscale: colorscale || (color ? [[0, color], [1, color]] : "Viridis"),
        showscale: showscale,
        reversescale: reversescale,
        opacity: opacity,
        contours: contours ? {
          x: { show: true, usemap: true, color: "gold", width: 2 },
          y: { show: true, usemap: true, color: "gold", width: 2 },
          z: { show: true, usemap: true, color: "gold", width: 2 }
        } : undefined
      };
      
      this.data = [surfaceTrace];
      
      // Formula is typeset by the document header with KaTeX; do not display raw math here.
      this.layout.title = { text: "" };
      this.layout.margin = { l: 0, r: 0, b: 0, t: 8 };
      
      // Plotly computes the actual 3D ratio including z, avoiding distorted flat surfaces.
      this.layout.scene.aspectmode = "data";
      
    } catch (error: any) {
      this.renderError(`Error rendering surface3d: ${error?.message || String(error)}`);
    }
  }
  
  /**
   * Render error message
   */
  private renderError(message: string): void {
    this.data = [{
      type: "scatter3d",
      x: [0],
      y: [0],
      z: [0],
      mode: "text",
      text: [message],
      textposition: "middle center",
      showlegend: false
    }];
    
    this.layout.title = { text: "Render Error", x: 0.5 };
    this.layout.scene = { 
      xaxis: { visible: false }, 
      yaxis: { visible: false }, 
      zaxis: { visible: false } 
    };
  }
  
  /**
   * Update the Plotly plot
   */
  private loadPlotly(): Promise<PlotlyApi> {
    if (!this.plotlyPromise) {
      this.plotlyPromise = import("plotly.js-dist-min").then((module) => module.default);
    }
    return this.plotlyPromise;
  }

  private applyPlot(plotly: PlotlyApi): void {
    if (this.hasPlot) {
      void plotly.react(this.plotlyDiv, this.data, this.layout, this.config);
    } else {
      this.hasPlot = true;
      void plotly.newPlot(this.plotlyDiv, this.data, this.layout, this.config);
    }
  }

  private updatePlot(): void {
    if (this.plotly) {
      this.applyPlot(this.plotly);
      return;
    }

    void this.loadPlotly().then((plotly) => {
      this.plotly = plotly;
      if (!this.destroyed) this.applyPlot(plotly);
    });
  }
  
  /**
   * Reset camera to default position
   */
  resetCamera(): void {
    if (this.hasPlot && this.plotly) {
      this.layout.scene.camera = { eye: { x: 1.5, y: 1.5, z: 1.5 } };
      void this.plotly.relayout(this.plotlyDiv, this.layout);
    }
  }
  
  /**
   * Get the Plotly div for external manipulation
   */
  getElement(): HTMLDivElement {
    return this.plotlyDiv;
  }
  
  /**
   * Resize the renderer
   */
  resize(width: number, height: number): void {
    this.plotlyDiv.style.width = `${width}px`;
    this.plotlyDiv.style.height = `${height}px`;
    if (this.hasPlot && this.plotly) {
      this.plotly.Plots.resize(this.plotlyDiv);
    }
  }
  
  /**
   * Destroy the renderer and clean up
   */
  destroy(): void {
    this.destroyed = true;
    if (this.hasPlot && this.plotly) {
      this.plotly.purge(this.plotlyDiv);
      this.hasPlot = false;
    }
  }
}
