import type { CrossProductNode, MathMDNode, Plane3DNode } from "@mathmd/ast";
import {
  angleBetweenLines, angleBetweenPlanes, computeCrossProductArea, computeCrossProductDistributivity,
  computeCrossProductScene, computeKinematics, computeParallelepipedVolume, computePlaneFromPoints,
  computePlaneFromVectors, identifyConicFromMode, isFiniteVector, linePlaneAngle, linesDistance,
  pointLineDistance, pointPlaneDistance, sampleParametricTrajectory, sampleSurface,
} from "@mathmd/math";
import type {
  AngleBetweenLinesInfo, CollapseStudy, ConicInfo, CrossProductScene, LinesDistanceInfo,
  ParallelepipedVolumeInfo, Vector3, VectorStudyResult,
} from "@mathmd/math";

function getX(pos: { x: number; y: number; z: number } | [number, number, number]): number {
  return Array.isArray(pos) ? pos[0] : pos.x;
}
function getY(pos: { x: number; y: number; z: number } | [number, number, number]): number {
  return Array.isArray(pos) ? pos[1] : pos.y;
}
function getZ(pos: { x: number; y: number; z: number } | [number, number, number]): number {
  return Array.isArray(pos) ? pos[2] : pos.z;
}

function resolvePlane(node: Plane3DNode): { point: Vector3; normal: Vector3 } | { error: string } {
  const point: Vector3 = node.point ?? [0, 0, 0];
  const mode = node.mode ?? "point-normal";

  if (mode === "three-points" || mode === "point-vectors" || mode === "parametric") {
    const plane = mode === "three-points"
      ? computePlaneFromPoints(node.pointA ?? [0, 0, 0], node.pointB ?? [1, 0, 0], node.pointC ?? [0, 1, 0])
      : computePlaneFromVectors(point, node.vectorU ?? [1, 0, 0], node.vectorV ?? [0, 1, 0]);
    return plane.isValid ? { point: plane.point, normal: plane.normal } : { error: plane.explanation };
  }

  const normal: Vector3 = mode === "general"
    ? [node.A ?? 1, node.B ?? 0, node.C ?? 0]
    : node.normal ?? [1, 1, 1];
  if (!isFiniteVector(normal, 3) || normal.every(component => component === 0)) {
    return { error: "El vector normal debe ser finito y distinto de cero." };
  }
  if (mode === "general") {
    const length = Math.hypot(...normal);
    const signedDistance = -(node.D ?? 0) / length;
    return { point: normal.map(component => (component / length) * signedDistance) as Vector3, normal };
  }
  return { point, normal };
}

export interface PlotlyApi {
  newPlot(element: HTMLElement, data: unknown[], layout: object, config: object): Promise<unknown>;
  react(element: HTMLElement, data: unknown[], layout: object, config: object): Promise<unknown>;
  relayout(element: HTMLElement, update: object): Promise<unknown>;
  purge(element: HTMLElement): void;
  Plots: { resize(element: HTMLElement): void };
}

type PlotlyFrameVector = {
  start: { x: number; y: number; z: number } | Vector3;
  end: { x: number; y: number; z: number } | Vector3;
  color?: string;
};

type PlotlyFrameNode = Extract<MathMDNode, { type: "frame" }> & {
  T?: PlotlyFrameVector & { curvatureType?: string; curvatureValue?: number };
  N?: PlotlyFrameVector & { curvatureType?: string };
  B?: PlotlyFrameVector & { torsionType?: string; torsionValue?: number };
};

type PlotlyRenderNode = (Exclude<MathMDNode, { type: "frame" }> | PlotlyFrameNode) & {
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
  isStationary?: boolean;
  isDegenerate?: boolean;
  vectors?: { position: number[]; vector: number[]; magnitude: number }[];
  dimensions?: 2 | 3;
  chartX?: Array<string | number | boolean | null>;
  chartY?: Array<string | number | boolean | null>;
  trend?: { slope: number; intercept: number; r2: number } | null;
  error?: string;
  crossScene?: CrossProductScene;
};

/**
 * Plotly Renderer for MathMD 3D visualizations
 * Handles surface3d blocks
 */
let nextPlotMountRevision = 1;

export class PlotlyRenderer {
  /** Stable for this mounted Plotly instance, never derived from an implicit AST ID. */
  private readonly mountRevision = "bwjm-mount-" + nextPlotMountRevision++;

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
    // Reset state between renders (important when switching graphs and documents).
    this.layout.showlegend = false;
    this.layout.title = { text: "" };

    switch (node.type) {
      case "calculusviz":
        this.renderCalculusViz(node as any);
        break;

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

      case "vector3d":
        this.renderVector3D(node as any);
        break;

      case "vectorarrow":
        this.renderVectorArrow(node as any);
        break;

      case "crossproduct":
        this.renderCrossProduct(node);
        break;

      case "line3d":
        this.renderLine3D(node);
        break;

      case "plane3d":
        this.renderPlane3D(node);
        break;

      case "anglebetweenlines":
        this.renderAngleBetweenLines(node);
        break;

      case "anglebetweenplanes":
        this.renderAngleBetweenPlanes(node);
        break;

      case "lineplaneangle":
        this.renderLinePlaneAngle(node);
        break;

      case "pointplanedistance":
        this.renderPointPlaneDistance(node);
        break;

      case "pointlinedistance":
        this.renderPointLineDistance(node);
        break;

      case "linesdistance":
        this.renderLinesDistance(node);
        break;

      case "conic":
        this.renderConic(node);
        break;

      default:
        this.renderError(`Unsupported 3D node type: ${node.type}`);
        break;
    }

    // Plotly.react preserves camera, axis zoom and legend trace visibility
    // when the revision token remains stable across data/layout revisions.
    this.layout.uirevision = this.mountRevision;
    this.layout.legend = { ...(this.layout.legend ?? {}), uirevision: this.mountRevision };
    void this.updatePlot();
  }

  private renderCalculusViz(node: Extract<PlotlyRenderNode, { type: "calculusviz" }> & {
    mesh?: { x:number[][]; y:number[][]; z:number[][] };
    innerMesh?: { x:number[][]; y:number[][]; z:number[][] };
    error?: string;
  }): void {
    if (node.error) { this.renderError(node.error); return; }
    if (node.mode !== "revolution" || !node.mesh) {
      this.renderError("Esta visualización no tiene malla tridimensional.");
      return;
    }
    const trace = (mesh: {x:number[][];y:number[][];z:number[][]}, color:string, name:string, opacity:number) => ({
      type: "surface", x:mesh.x, y:mesh.y, z:mesh.z,
      colorscale:[[0,color],[1,color]], showscale:false, opacity, name,
      hovertemplate:"x: %{x:.3f}<br>y: %{y:.3f}<br>z: %{z:.3f}<extra></extra>",
    });
    this.data = [trace(node.mesh,"#6366f1","Superficie exterior",0.84)];
    if (node.innerMesh) this.data.push(trace(node.innerMesh,"#38bdf8","Superficie interior",0.48));
    this.layout.title={text:"Sólido de revolución ("+(node.method??"washers")+")",x:0.5};
    this.layout.scene.aspectmode="data";
    this.layout.margin={l:0,r:0,b:0,t:40};
  }

  private renderDataChart(node: Extract<PlotlyRenderNode, { type: "datachart" }>): void {
    if (node.error) {
      this.renderError(node.error);
      return;
    }
    const x = node.chartX ?? [];
    const y = node.chartY ?? [];
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

      if (node.animated === true || node.particle === true) {
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
      // The document card already contains the typeset equation.
      this.layout.title = { text: "" };
      this.layout.margin = { l: 0, r: 0, b: 0, t: 8 };
      this.layout.showlegend = node.showLegend === true;
      this.layout.scene.aspectmode = "data";
    } catch (error: any) {
      this.renderError(`Error rendering curve3d: ${error?.message || String(error)}`);
    }
  }

  /** Spatial vector studies share the existing Plotly camera and a single 3D scene. */
  private renderVector3D(node: Extract<PlotlyRenderNode,{type:"vector3d"}> & {
    study?: VectorStudyResult;
  }): void {
    if (node.error) { this.renderError(node.error); return; }
    const start = node.origin ?? [0, 0, 0];
    const end = node.end ?? start.map((x,i)=>x+(node.vector?.[i]??0));
    const arrows = node.study?.arrows ?? [{
      label: node.label ?? "u", start, end, role: "primary" as const
    }];
    const all = arrows.flatMap(a=>[a.start,a.end]);
    const extent = Math.max(1,...[0,1,2].map(i=>
      Math.max(...all.map(p=>p[i]))-Math.min(...all.map(p=>p[i]))));
    const palette:Record<string,string> = {
      primary: "#2563eb", secondary: "#d97706", result: "#059669", guide: "#64748b"
    };
    const traces:any[]=[];
    for (const vector of arrows) {
      const c=palette[vector.role]??"#2563eb";
      traces.push({
        type:"scatter3d",mode:"lines+markers",
        x:[vector.start[0],vector.end[0]],
        y:[vector.start[1],vector.end[1]],
        z:[vector.start[2],vector.end[2]],
        line:{color:c,width:vector.role==="result"?8:5,
          dash:vector.dashed?"dash":"solid"},
        marker:{color:c,size:3},
        name:vector.label
      });
      const d=vector.end.map((x,i)=>x-vector.start[i]);
      const mag=Math.hypot(...d);
      if (mag>1e-12 && !vector.dashed) {
        traces.push({
          type:"cone",x:[vector.end[0]],y:[vector.end[1]],z:[vector.end[2]],
          u:[d[0]/mag],v:[d[1]/mag],w:[d[2]/mag],
          anchor:"tip",sizemode:"absolute",sizeref:extent*0.18,
          colorscale:[[0,c],[1,c]],showscale:false,
          showlegend:false,hoverinfo:"skip"
        });
      }
    }
    this.data=traces;
    this.layout.scene.aspectmode="data";
    this.layout.title={text:node.study?.topic ?? (node.label??"Vector 3D"),x:0.5};
    this.layout.showlegend=true;
    this.layout.uirevision = this.mountRevision;
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

  /** Render Line3D: r(t) = P + t·v with point, direction, and optional segment. */
  private renderLine3D(node: Extract<PlotlyRenderNode, { type: "line3d" }>): void {
    if (node.error) { this.renderError(node.error); return; }
    const { point = [0, 0, 0], direction = [1, 0, 0], tDomain = [-10, 10], 
      showPoint = true, showDirection = true, showSegment = false, segmentT = [0, 1],
      color = "#0284c7", colorPoint = "#10b981", colorDirection = "#f59e0b",
      labelPoint = "P", labelDirection = "v", label = "r(t) = P + t·v",
      paramName = "t" } = node;

    const [px, py, pz] = point;
    const [vx, vy, vz] = direction;
    const [tMin, tMax] = tDomain;
    const [tSegMin, tSegMax] = segmentT;

    const isZeroDir = vx === 0 && vy === 0 && vz === 0;
    if (isZeroDir) {
      this.layout.title = { text: "Error: Vector director nulo (0, 0, 0). No se puede definir la recta." };
      return;
    }

    this.layout.scene.aspectmode = "data";
    this.layout.uirevision = this.mountRevision;
    this.layout.showlegend = true;

    const traces: any[] = [];

    // Recta completa (línea extendida en tDomain)
    const samples = 50;
    const lineX: number[] = [];
    const lineY: number[] = [];
    const lineZ: number[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = tMin + (i / samples) * (tMax - tMin);
      lineX.push(px + t * vx);
      lineY.push(py + t * vy);
      lineZ.push(pz + t * vz);
    }
    traces.push({
      type: "scatter3d", mode: "lines",
      x: lineX, y: lineY, z: lineZ,
      line: { color, width: 4, dash: "solid" },
      name: `r(${paramName}) = P + ${paramName}·v`,
      hovertemplate: `x: %{x:.3f}<br>y: %{y:.3f}<br>z: %{z:.3f}<br>${paramName}: ${tMin}..${tMax}<extra></extra>`,
      showlegend: true,
    });

    // Segmento opcional
    if (showSegment) {
      const segX: number[] = [];
      const segY: number[] = [];
      const segZ: number[] = [];
      for (let i = 0; i <= 20; i++) {
        const t = tSegMin + (i / 20) * (tSegMax - tSegMin);
        segX.push(px + t * vx);
        segY.push(py + t * vy);
        segZ.push(pz + t * vz);
      }
      traces.push({
        type: "scatter3d", mode: "lines",
        x: segX, y: segY, z: segZ,
        line: { color, width: 8, dash: "solid" },
        name: `Segmento [${tSegMin}, ${tSegMax}]`,
        showlegend: true,
      });
    }

    // Punto P
    if (showPoint) {
      traces.push({
        type: "scatter3d", mode: "markers+text",
        x: [px], y: [py], z: [pz],
        text: [labelPoint], textposition: "top center",
        marker: { color: colorPoint, size: 6 },
        name: `Punto P (${px}, ${py}, ${pz})`,
        showlegend: true,
      });
    }

    // Vector director v (mostrado desde P)
    if (showDirection) {
      const extent = Math.max(Math.abs(vx), Math.abs(vy), Math.abs(vz));
      traces.push({
        type: "scatter3d", mode: "lines+markers+text",
        x: [px, px + vx], y: [py, py + vy], z: [pz, pz + vz],
        text: ["", labelDirection], textposition: "top center",
        line: { color: colorDirection, width: 5 }, marker: { color: colorDirection, size: 3 },
        name: `Vector director v = (${vx}, ${vy}, ${vz})`,
        hovertext: [`P (${px}, ${py}, ${pz})`, `v = (${vx}, ${vy}, ${vz})`],
        hoverinfo: "text",
      });
      if (extent > 0) {
        traces.push({
          type: "cone", x: [px + vx], y: [py + vy], z: [pz + vz],
          u: [vx / extent], v: [vy / extent], w: [vz / extent],
          anchor: "tip", sizemode: "absolute", sizeref: extent * 0.17,
          colorscale: [[0, colorDirection], [1, colorDirection]], showscale: false,
          showlegend: false, hoverinfo: "skip",
        });
      }
    }

    // Ecuaciones en el título
    const symParts: string[] = [];
    if (vx !== 0) symParts.push(`(x − ${px}) / ${vx}`);
    if (vy !== 0) symParts.push(`(y − ${py}) / ${vy}`);
    if (vz !== 0) symParts.push(`(z − ${pz}) / ${vz}`);
    const symmetric = symParts.join(" = ");

    this.layout.title = {
      text: `${label}<br>Vectorial: r(t) = (${px}, ${py}, ${pz}) + t·(${vx}, ${vy}, ${vz})<br>Simétrica: ${symmetric}`,
      x: 0.5,
    };

    this.data = traces;
    void this.updatePlot();
  }

  /** Render Plane3D: supports multiple modes (point-normal, three-points, point-vectors, parametric, general). */
  private renderPlane3D(node: Extract<PlotlyRenderNode, { type: "plane3d" }>): void {
    if (node.error) { this.renderError(node.error); return; }
    
    const geometry = resolvePlane(node);
    if ("error" in geometry) { this.renderError(geometry.error); return; }
    const { point, normal } = geometry;
    const mode = node.mode ?? "point-normal";
    const label = node.label ?? "Plano";
    const labelPoint = mode === "three-points" ? "A" : mode === "general" ? "P₀" : node.labelPoint ?? "P";
    const defaultNormalLabel = mode === "three-points" ? "n = AB × AC" : mode === "general"
      ? "n = (A, B, C)" : mode === "point-normal" ? "n" : "n = u × v";
    const labelNormal = node.labelNormal ?? defaultNormalLabel;
    const labelU = node.labelU ?? "u";
    const labelV = node.labelV ?? "v";

    const { xDomain = [-5, 5], yDomain = [-5, 5],
      showPoint = true, showNormal = true, showIntercepts = true,
      color = "#6366f1", colorPoint = "#10b981", colorNormal = "#f59e0b",
      opacity = 0.3 } = node;

    const [px, py, pz] = point;
    const [nx, ny, nz] = normal;
    const [xMin, xMax] = node.xDomain ?? [-5, 5];
    const [yMin, yMax] = node.yDomain ?? [-5, 5];

    const isZeroNormal = nx === 0 && ny === 0 && nz === 0;
    if (isZeroNormal) {
      this.layout.title = { text: "Error: Vector normal nulo (0, 0, 0). No se puede definir el plano." };
      return;
    }

    this.layout.scene.aspectmode = "data";
    this.layout.uirevision = this.mountRevision;
    this.layout.showlegend = true;

    const traces: any[] = [];

    // Malla del plano (superficie)
    const xSamples = 15;
    const ySamples = 15;
    const meshX: number[][] = [];
    const meshY: number[][] = [];
    const meshZ: number[][] = [];

    for (let i = 0; i <= 15; i++) {
      const x = xMin + (i / 15) * (xMax - xMin);
      const rowX: number[] = [];
      const rowY: number[] = [];
      const rowZ: number[] = [];
      for (let j = 0; j <= 15; j++) {
        const y = yMin + (j / 15) * (yMax - yMin);
        // Ecuación del plano: nx(x - px) + ny(y - py) + nz(z - pz) = 0
        // => z = pz - (nx(x - px) + ny(y - py)) / nz   (si nz ≠ 0)
        let z: number;
        if (Math.abs(nz) > 1e-12) {
          z = pz - (nx * (x - px) + ny * (y - py)) / nz;
        } else if (Math.abs(ny) > 1e-12) {
          // Plano vertical en y, resolver para y
          z = pz;
        } else {
          // n = (nx, 0, 0) => plano x = px
          z = pz;
        }
        rowX.push(x);
        rowY.push(y);
        rowZ.push(z);
      }
      meshX.push(rowX);
      meshY.push(rowY);
      meshZ.push(rowZ);
    }

    traces.push({
      type: "surface",
      x: meshX, y: meshY, z: meshZ,
      colorscale: [[0, color], [1, color]],
      showscale: false,
      opacity,
      name: label,
      hovertemplate: "x: %{x:.3f}<br>y: %{y:.3f}<br>z: %{z:.3f}<extra></extra>",
    });

    // Punto P
    if (node.showPoint !== false) {
      traces.push({
        type: "scatter3d", mode: "markers+text",
        x: [point[0]], y: [point[1]], z: [point[2]],
        text: [node.labelPoint ?? "P"], textposition: "top center",
        marker: { color: "#10b981", size: 6 },
        name: `Punto ${node.labelPoint ?? "P"} (${point.map(v => v.toFixed(3)).join(", ")})`,
        showlegend: true,
      });
    }

    // Vector normal n
    if (node.showNormal !== false) {
      const extent = Math.max(Math.abs(normal[0]), Math.abs(normal[1]), Math.abs(normal[2]));
      traces.push({
        type: "scatter3d", mode: "lines+markers+text",
        x: [point[0], point[0] + normal[0]], y: [point[1], point[1] + normal[1]], z: [point[2], point[2] + normal[2]],
        text: ["", node.labelNormal ?? "n"], textposition: "top center",
        line: { color: "#f59e0b", width: 5 }, marker: { color: "#f59e0b", size: 3 },
        name: `Normal ${node.labelNormal ?? "n"} = (${normal.map(v => v.toFixed(3)).join(", ")})`,
        hovertext: [`P (${point.map(v => v.toFixed(3)).join(", ")})`, `n = (${normal.map(v => v.toFixed(3)).join(", ")})`],
        hoverinfo: "text",
      });
      if (extent > 0) {
        traces.push({
          type: "cone", x: [point[0] + normal[0]], y: [point[1] + normal[1]], z: [point[2] + normal[2]],
          u: [normal[0] / extent], v: [normal[1] / extent], w: [normal[2] / extent],
          anchor: "tip", sizemode: "absolute", sizeref: extent * 0.17,
          colorscale: [[0, "#f59e0b"], [1, "#f59e0b"]], showscale: false,
          showlegend: false, hoverinfo: "skip",
        });
      }
    }

    // Interceptos con ejes
    if (node.showIntercepts !== false) {
      const D = -(normal[0] * point[0] + normal[1] * point[1] + normal[2] * point[2]);
      if (normal[0] !== 0 && normal[1] !== 0 && normal[2] !== 0) {
        const ix = -D / normal[0];
        const iy = -D / normal[1];
        const iz = -D / normal[2];
        traces.push({
          type: "scatter3d", mode: "markers+text",
          x: [ix, 0, 0], y: [0, iy, 0], z: [0, 0, iz],
          text: [`x = ${ix.toFixed(2)}`, `y = ${iy.toFixed(2)}`, `z = ${iz.toFixed(2)}`],
          textposition: "top center",
          marker: { color: "#f59e0b", size: 5, symbol: "diamond" },
          name: "Interceptos ejes",
          showlegend: true,
        });
      }
    }

    // Ecuaciones en el título
    const D = -(normal[0] * point[0] + normal[1] * point[1] + normal[2] * point[2]);
    const normalEq = `(${normal[0]})·(x − ${point[0]}) + (${normal[1]})·(y − ${point[1]}) + (${normal[2]})·(z − ${point[2]}) = 0`;
    const generalEq = `${normal[0]}·x + ${normal[1]}·y + ${normal[2]}·z + ${D} = 0`;

    this.layout.title = {
      text: `${node.label ?? "Plano"}<br>Normal: n·(X − P) = 0 => ${normalEq}<br>General: ${generalEq}`,
      x: 0.5,
    };

    this.data = traces;
    void this.updatePlot();
  }

  private renderAngleBetweenLines(node: Extract<PlotlyRenderNode, { type: "anglebetweenlines" }>): void {
    if (node.error) { this.renderError(node.error); return; }
    const { line1, line2, showArc = true, showProjection = false, 
      colorLine1 = "#0284c7", colorLine2 = "#ea580c", colorArc = "#e11d48",
      labelLine1 = "L₁", labelLine2 = "L₂", labelArc = "Ángulo" } = node;

    const info: AngleBetweenLinesInfo = angleBetweenLines(line1.direction, line2.direction);
    const point1 = line1.point ?? [0, 0, 0];
    const point2 = line2.point ?? [0, 0, 0];
    const [px1, py1, pz1] = point1;
    const [px2, py2, pz2] = point2;

    this.layout.scene.aspectmode = "data";
    this.layout.uirevision = this.mountRevision;
    this.layout.showlegend = true;

    const traces: any[] = [];

    // Recta 1
    const [vx1, vy1, vz1] = line1.direction;
    const tMin1 = line1.tDomain?.[0] ?? -5;
    const tMax1 = line1.tDomain?.[1] ?? 5;
    const line1X: number[] = [];
    const line1Y: number[] = [];
    const line1Z: number[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = tMin1 + (i / 20) * (tMax1 - tMin1);
      line1X.push(px1 + t * vx1);
      line1Y.push(py1 + t * vy1);
      line1Z.push(pz1 + t * vz1);
    }
    traces.push({
      type: "scatter3d", mode: "lines",
      x: line1X, y: line1Y, z: line1Z,
      line: { color: colorLine1, width: 4 },
      name: labelLine1,
      showlegend: true,
    });

    // Recta 2
    const [vx2, vy2, vz2] = line2.direction;
    const tMin2 = line2.tDomain?.[0] ?? -5;
    const tMax2 = line2.tDomain?.[1] ?? 5;
    const line2X: number[] = [];
    const line2Y: number[] = [];
    const line2Z: number[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = tMin2 + (i / 20) * (tMax2 - tMin2);
      line2X.push(px2 + t * vx2);
      line2Y.push(py2 + t * vy2);
      line2Z.push(pz2 + t * vz2);
    }
    traces.push({
      type: "scatter3d", mode: "lines",
      x: line2X, y: line2Y, z: line2Z,
      line: { color: colorLine2, width: 4 },
      name: labelLine2,
      showlegend: true,
    });

    // Arco del ángulo
    if (showArc && info.angleRad > 1e-12 && info.angleRad < Math.PI - 1e-12) {
      const center = [px1, py1, pz1];
      const v1 = line1.direction;
      const v2 = line2.direction;
      const mag1 = Math.hypot(...v1);
      const mag2 = Math.hypot(...v2);
      const u1 = [v1[0]/mag1, v1[1]/mag1, v1[2]/mag1];
      const u2 = [v2[0]/mag2, v2[1]/mag2, v2[2]/mag2];
      const dot = u1[0]*u2[0] + u1[1]*u2[1] + u1[2]*u2[2];
      const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
      const cross = [
        u1[1]*u2[2] - u1[2]*u2[1],
        u1[2]*u2[0] - u1[0]*u2[2],
        u1[0]*u2[1] - u1[1]*u2[0]
      ];
      const crossMag = Math.hypot(...cross);
      if (crossMag > 1e-12) {
        const n = [cross[0]/crossMag, cross[1]/crossMag, cross[2]/crossMag];
        const radius = Math.min(mag1, mag2) * 0.3;
        const arcPoints = 20;
        const arcX: number[] = [];
        const arcY: number[] = [];
        const arcZ: number[] = [];
        for (let step = 0; step <= arcPoints; step++) {
          const angle = (theta * step) / arcPoints;
          const ca = Math.cos(angle);
          const sa = Math.sin(angle);
          arcX.push(center[0] + radius * (ca * u1[0] + sa * n[0]));
          arcY.push(center[1] + radius * (ca * u1[1] + sa * n[1]));
          arcZ.push(center[2] + radius * (ca * u1[2] + sa * n[2]));
        }
        traces.push({
          type: "scatter3d", mode: "lines",
          x: arcX, y: arcY, z: arcZ,
          line: { color: colorArc, width: 6, dash: "solid" },
          name: labelArc,
          showlegend: true,
        });
      }
    }

    // Etiquetas
    traces.push({
      type: "scatter3d", mode: "markers+text",
      x: [px1, px2], y: [py1, py2], z: [pz1, pz2],
      text: [labelLine1, labelLine2], textposition: "top center",
      marker: { color: [colorLine1, colorLine2], size: 5 },
      name: "Puntos base",
      showlegend: false,
    });

    // Título con ángulos
    const acuteDeg = info.acuteAngleDeg.toFixed(1);
    const orientedDeg = info.angleDeg.toFixed(1);
    this.layout.title = {
      text: `Ángulo entre rectas<br>Ángulo agudo: ${acuteDeg}° | Orientado: ${orientedDeg}°${info.isPerpendicular ? " ⊥" : info.isParallel ? " ∥" : ""}`,
      x: 0.5,
    };

    this.data = traces;
    void this.updatePlot();
  }

  private renderAngleBetweenPlanes(node: Extract<PlotlyRenderNode, { type: "anglebetweenplanes" }>): void {
    if (node.error) { this.renderError(node.error); return; }
    const { plane1, plane2, showDiedro = true, showNormals = true,
      colorPlane1 = "#6366f1", colorPlane2 = "#8b5cf6",
      colorNormal1 = "#10b981", colorNormal2 = "#f59e0b",
      colorDiedro = "#e11d48",
      labelPlane1 = "Π₁", labelPlane2 = "Π₂",
      labelNormal1 = "n₁", labelNormal2 = "n₂" } = node;

    const firstPlane = resolvePlane(plane1);
    const secondPlane = resolvePlane(plane2);
    if ("error" in firstPlane) { this.renderError(firstPlane.error); return; }
    if ("error" in secondPlane) { this.renderError(secondPlane.error); return; }
    const info = angleBetweenPlanes(firstPlane.normal, secondPlane.normal);

    this.layout.scene.aspectmode = "data";
    this.layout.uirevision = this.mountRevision;
    this.layout.showlegend = true;

    const traces: any[] = [];

    // Renderizar plano 1
    this.data = traces;
    const plane1Traces = this.renderPlane3D({ ...plane1, type: "plane3d" } as any);
    // This is a simplified version - in practice we'd extract the traces
    // For now, render both planes using the existing logic but with different colors

    // Placeholder - simplified implementation
    this.data = [{
      type: "scatter3d", mode: "text",
      x: [0], y: [0], z: [1],
      text: [`Ángulo entre planos: ${info.acuteAngleDeg.toFixed(1)}° (agudo)`],
      textposition: "middle center",
      showlegend: false,
    }];

    this.layout.title = {
      text: `Ángulo entre planos<br>Ángulo agudo: ${info.acuteAngleDeg.toFixed(1)}° | Entre normales: ${info.angleDeg.toFixed(1)}°`,
      x: 0.5,
    };
    void this.updatePlot();
  }

  private renderLinePlaneAngle(node: Extract<PlotlyRenderNode, { type: "lineplaneangle" }>): void {
    if (node.error) { this.renderError(node.error); return; }
    const { line, plane, showProjection = true, showPerpendicular = false,
      colorLine = "#0284c7", colorPlane = "#6366f1",
      colorProjection = "#10b981", colorPerpendicular = "#f59e0b",
      labelLine = "L", labelPlane = "Π", labelProjection = "Proy" } = node;

    const geometry = resolvePlane(plane);
    if ("error" in geometry) { this.renderError(geometry.error); return; }
    const { point: planePoint, normal: planeNormal } = geometry;
    const linePoint = line.point;
    const lineDir = line.direction;
    const info = linePlaneAngle(lineDir, planeNormal);

    this.layout.scene.aspectmode = "data";
    this.layout.uirevision = this.mountRevision;
    this.layout.showlegend = true;

    const traces: any[] = [];

    // Recta
    const [vx, vy, vz] = lineDir;
    const tMin = line.tDomain?.[0] ?? -5;
    const tMax = line.tDomain?.[1] ?? 5;
    const lineX: number[] = [];
    const lineY: number[] = [];
    const lineZ: number[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = tMin + (i / 20) * (tMax - tMin);
      lineX.push(linePoint[0] + t * lineDir[0]);
      lineY.push(linePoint[1] + t * lineDir[1]);
      lineZ.push(linePoint[2] + t * lineDir[2]);
    }
    traces.push({
      type: "scatter3d", mode: "lines",
      x: lineX, y: lineY, z: lineZ,
      line: { color: colorLine, width: 5 },
      name: labelLine,
      showlegend: true,
    });

    // Plano (usar renderPlane3D simplificado)
    const [xMin, xMax] = plane.xDomain ?? [-5, 5];
    const [yMin, yMax] = plane.yDomain ?? [-5, 5];

    const xSamples = 10;
    const ySamples = 10;
    const meshX: number[][] = [];
    const meshY: number[][] = [];
    const meshZ: number[][] = [];
    for (let i = 0; i <= xSamples; i++) {
      const x = xMin + (i / xSamples) * (xMax - xMin);
      const rowX: number[] = [];
      const rowY: number[] = [];
      const rowZ: number[] = [];
      for (let j = 0; j <= ySamples; j++) {
        const y = yMin + (j / ySamples) * (yMax - yMin);
        let z: number;
        if (Math.abs(planeNormal[2]) > 1e-12) {
          z = planePoint[2] - (planeNormal[0] * (x - planePoint[0]) + planeNormal[1] * (y - planePoint[1])) / planeNormal[2];
        } else {
          z = planePoint[2];
        }
        rowX.push(x);
        rowY.push(y);
        rowZ.push(z);
      }
      meshX.push(rowX);
      meshY.push(rowY);
      meshZ.push(rowZ);
    }
    traces.push({
      type: "surface", x: meshX, y: meshY, z: meshZ,
      colorscale: [[0, colorPlane], [1, colorPlane]],
      showscale: false, opacity: 0.3, name: "Plano",
    });

    // Proyección de la recta sobre el plano
    if (showProjection) {
      // Proyectar la recta sobre el plano
      const projX: number[] = [];
      const projY: number[] = [];
      const projZ: number[] = [];
      for (let i = 0; i <= 20; i++) {
        const t = tMin + (i / 20) * (tMax - tMin);
        const px = linePoint[0] + t * lineDir[0];
        const py = linePoint[1] + t * lineDir[1];
        const pz = linePoint[2] + t * lineDir[2];
        // Proyectar sobre el plano
        const w = [px - planePoint[0], py - planePoint[1], pz - planePoint[2]];
        const nDotW = planeNormal[0]*w[0] + planeNormal[1]*w[1] + planeNormal[2]*w[2];
        const nMagSq = planeNormal[0]**2 + planeNormal[1]**2 + planeNormal[2]**2;
        projX.push(px - (nDotW / nMagSq) * planeNormal[0]);
        projY.push(py - (nDotW / nMagSq) * planeNormal[1]);
        projZ.push(pz - (nDotW / nMagSq) * planeNormal[2]);
      }
      traces.push({
        type: "scatter3d", mode: "lines",
        x: projX, y: projY, z: projZ,
        line: { color: colorProjection, width: 4, dash: "dash" },
        name: "Proyección",
        showlegend: true,
      });
    }

    // Perpendicular
    if (showPerpendicular) {
      // Similar a proyección pero con el vector perpendicular
    }

    this.layout.title = {
      text: `Ángulo recta-plano: ${info.angleDeg.toFixed(1)}°`,
      x: 0.5,
    };
    this.data = traces;
    void this.updatePlot();
  }

  private renderPointPlaneDistance(node: Extract<PlotlyRenderNode, { type: "pointplanedistance" }>): void {
    if (node.error) { this.renderError(node.error); return; }
    const { point, plane, showPerpendicular = true, showFoot = true,
      colorPoint = "#0284c7", colorPlane = "#6366f1", colorPerpendicular = "#f59e0b",
      labelPoint = "P", labelPlane = "Π", labelFoot = "H" } = node;

    const geometry = resolvePlane(plane);
    if ("error" in geometry) { this.renderError(geometry.error); return; }
    const pointCoords: Vector3 = [point.x, point.y, point.z];
    const info = pointPlaneDistance(pointCoords, geometry.point, geometry.normal);

    this.layout.scene.aspectmode = "data";
    this.layout.uirevision = this.mountRevision;
    this.layout.showlegend = true;

    const traces: any[] = [];

    // Plano
    // ... (similar to renderPlane3D but simplified)

    // Punto
    traces.push({
      type: "scatter3d", mode: "markers+text",
      x: [pointCoords[0]], y: [pointCoords[1]], z: [pointCoords[2]],
      text: [labelPoint], textposition: "top center",
      marker: { color: colorPoint, size: 8 },
      name: labelPoint,
      showlegend: true,
    });

    // Perpendicular
    if (showPerpendicular && info.footOfPerpendicular) {
      const foot = info.footOfPerpendicular;
      traces.push({
        type: "scatter3d", mode: "lines+markers+text",
        x: [pointCoords[0], foot[0]], y: [pointCoords[1], foot[1]], z: [pointCoords[2], foot[2]],
        text: ["", labelFoot], textposition: "top center",
        line: { color: colorPerpendicular, width: 4, dash: "dash" },
        marker: { color: colorPerpendicular, size: 4 },
        name: `Perpendicular (dist = ${info.distance.toFixed(3)})`,
        showlegend: true,
      });
    }

    // Plano (simplified)
    // ...

    this.layout.title = {
      text: `Distancia punto-plano: ${info.distance.toFixed(4)}`,
      x: 0.5,
    };
    this.data = traces;
    void this.updatePlot();
  }

  private renderPointLineDistance(node: Extract<PlotlyRenderNode, { type: "pointlinedistance" }>): void {
    if (node.error) { this.renderError(node.error); return; }
    const { point, line, showPerpendicular = true, showFoot = true,
      colorPoint = "#0284c7", colorLine = "#10b981", colorPerpendicular = "#f59e0b",
      labelPoint = "P", labelLine = "L", labelFoot = "H" } = node;

    const pointCoords: Vector3 = [point.x, point.y, point.z];
    const info = pointLineDistance(pointCoords, line.point, line.direction);

    this.layout.scene.aspectmode = "data";
    this.layout.uirevision = this.mountRevision;
    this.layout.showlegend = true;

    const traces: any[] = [];

    // Recta
    const linePoint = line.point ?? [0, 0, 0];
    const lineDir = line.direction;
    const tMin = line.tDomain?.[0] ?? -5;
    const tMax = line.tDomain?.[1] ?? 5;
    const lineX: number[] = [];
    const lineY: number[] = [];
    const lineZ: number[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = tMin + (i / 20) * (tMax - tMin);
      lineX.push(linePoint[0] + t * lineDir[0]);
      lineY.push(linePoint[1] + t * lineDir[1]);
      lineZ.push(linePoint[2] + t * lineDir[2]);
    }
    traces.push({
      type: "scatter3d", mode: "lines",
      x: lineX, y: lineY, z: lineZ,
      line: { color: "#10b981", width: 4 },
      name: labelLine,
      showlegend: true,
    });

    // Punto
    traces.push({
      type: "scatter3d", mode: "markers+text",
      x: [pointCoords[0]], y: [pointCoords[1]], z: [pointCoords[2]],
      text: ["P"], textposition: "top center",
      marker: { color: "#0284c7", size: 8 },
      name: labelPoint,
      showlegend: true,
    });

    // Perpendicular
    if (showPerpendicular && info.footOfPerpendicular) {
      const foot = info.footOfPerpendicular;
      traces.push({
        type: "scatter3d", mode: "lines+markers+text",
        x: [pointCoords[0], foot[0]], y: [pointCoords[1], foot[1]], z: [pointCoords[2], foot[2]],
        text: ["", "H"], textposition: "top center",
        line: { color: "#f59e0b", width: 4, dash: "dash" },
        marker: { color: "#f59e0b", size: 4 },
        name: `Perpendicular (dist = ${info.distance.toFixed(3)})`,
        showlegend: true,
      });
    }

    this.layout.title = {
      text: `Distancia punto-recta: ${info.distance.toFixed(4)}`,
      x: 0.5,
    };
    this.data = traces;
    void this.updatePlot();
  }

  private renderLinesDistance(node: Extract<PlotlyRenderNode, { type: "linesdistance" }>): void {
    if (node.error) { this.renderError(node.error); return; }
    const { line1, line2, showClosestPoints = true, showCommonPerpendicular = true,
      colorLine1 = "#0284c7", colorLine2 = "#ea580c", colorPerpendicular = "#f59e0b",
      labelLine1 = "L₁", labelLine2 = "L₂" } = node;

    const info: LinesDistanceInfo = linesDistance(line1.point, line1.direction, line2.point, line2.direction);

    this.layout.scene.aspectmode = "data";
    this.layout.uirevision = this.mountRevision;
    this.layout.showlegend = true;

    const traces: any[] = [];

    // Recta 1
    const p1 = line1.point ?? [0, 0, 0];
    const v1 = line1.direction;
    const tMin1 = line1.tDomain?.[0] ?? -5;
    const tMax1 = line1.tDomain?.[1] ?? 5;
    const l1X: number[] = [];
    const l1Y: number[] = [];
    const l1Z: number[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = tMin1 + (i / 20) * (tMax1 - tMin1);
      l1X.push(p1[0] + t * v1[0]);
      l1Y.push(p1[1] + t * v1[1]);
      l1Z.push(p1[2] + t * v1[2]);
    }
    traces.push({
      type: "scatter3d", mode: "lines",
      x: l1X, y: l1Y, z: l1Z,
      line: { color: colorLine1, width: 4 },
      name: labelLine1,
      showlegend: true,
    });

    // Recta 2
    const p2 = line2.point ?? [0, 0, 0];
    const v2 = line2.direction;
    const tMin2 = line2.tDomain?.[0] ?? -5;
    const tMax2 = line2.tDomain?.[1] ?? 5;
    const l2X: number[] = [];
    const l2Y: number[] = [];
    const l2Z: number[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = tMin2 + (i / 20) * (tMax2 - tMin2);
      l2X.push(p2[0] + t * v2[0]);
      l2Y.push(p2[1] + t * v2[1]);
      l2Z.push(p2[2] + t * v2[2]);
    }
    traces.push({
      type: "scatter3d", mode: "lines",
      x: l2X, y: l2Y, z: l2Z,
      line: { color: colorLine2, width: 4 },
      name: labelLine2,
      showlegend: true,
    });

    // Perpendicular común
    if (showCommonPerpendicular && info.closestPoints) {
      const cp1 = info.closestPoints.onLine1;
      const cp2 = info.closestPoints.onLine2;
      traces.push({
        type: "scatter3d", mode: "lines+markers+text",
        x: [cp1[0], cp2[0]], y: [cp1[1], cp2[1]], z: [cp1[2], cp2[2]],
        text: ["H₁", "H₂"], textposition: "top center",
        line: { color: "#f59e0b", width: 4, dash: "dash" },
        marker: { color: "#f59e0b", size: 5 },
        name: `Perpendicular común (dist = ${info.distance.toFixed(3)})`,
        showlegend: true,
      });
    }

    // Puntos más cercanos
    if (showClosestPoints && info.closestPoints) {
      const cp1 = info.closestPoints.onLine1;
      const cp2 = info.closestPoints.onLine2;
      traces.push({
        type: "scatter3d", mode: "markers+text",
        x: [cp1[0], cp2[0]], y: [cp1[1], cp2[1]], z: [cp1[2], cp2[2]],
        text: ["H₁", "H₂"], textposition: "top center",
        marker: { color: "#f59e0b", size: 6 },
        name: "Puntos más cercanos",
        showlegend: true,
      });
    }

    this.layout.title = {
      text: `Distancia entre rectas: ${info.distance.toFixed(4)}`,
      x: 0.5,
    };
    this.data = traces;
    void this.updatePlot();
  }

  private renderConic(node: Extract<PlotlyRenderNode, { type: "conic" }>): void {
    if (node.error) { this.renderError(node.error); return; }
    const { 
      conicType = "ellipse", mode = "center-radius",
      xDomain = [-5, 5], yDomain = [-5, 5],
      showFocus = true, showDirectrix = true, showCenter = true,
      showVertices = true, showAxes = true, showAsymptotes = true, showDirectrices = true,
      color = "#6366f1", colorFocus = "#10b981", colorDirectrix = "#f59e0b",
      colorCenter = "#10b981", colorVertices = "#f59e0b", colorAxes = "#6366f1",
      colorAsymptotes = "#ec4899",
      opacity = 0.3, labelFocus = "F", labelDirectrix = "D", labelCenter = "C",
      labelVertices = "V", label = "Cónica" } = node;

    let info: ConicInfo;
    try {
      info = identifyConicFromMode(mode, node);
    } catch (error) {
      this.renderError(error instanceof Error ? error.message : String(error));
      return;
    }
    if (!info.isValid) { this.renderError(info.explanation); return; }
    const colorDirectrices = node.colorDirectrix ?? "#64748b";

    // For now, render a basic ellipse/circle/parabola/hyperbola
    const [xMin, xMax] = node.xDomain ?? [-5, 5];
    const [yMin, yMax] = node.yDomain ?? [-5, 5];
    
    const isCircle = info.type === "circle";
    const isEllipse = info.type === "ellipse";
    const isParabola = info.type === "parabola";
    const isHyperbola = info.type === "hyperbola";

    this.layout.scene.aspectmode = "data";
    this.layout.uirevision = this.mountRevision;
    this.layout.showlegend = true;

    const traces: any[] = [];

    if (isCircle || isEllipse) {
      // Render ellipse/circle using parametric form
      const center = info.center ?? [0, 0];
      const a = info.radius ?? info.semiMajorAxis ?? 1;
      const b = info.radius ?? info.semiMinorAxis ?? 1;
      const rotation = info.rotation ?? 0;
      const [cx, cy] = center;
      const xData: number[] = [];
      const yData: number[] = [];
      for (let i = 0; i <= 100; i++) {
        const t = (i / 100) * 2 * Math.PI;
        const x = a * Math.cos(t);
        const y = b * Math.sin(t);
        const xr = cx + x * Math.cos(rotation) - y * Math.sin(rotation);
        const yr = cy + x * Math.sin(rotation) + y * Math.cos(rotation);
        xData.push(xr);
        yData.push(yr);
      }
      
      traces.push({
        type: "scatter", mode: "lines",
        x: xData, y: yData,
        line: { color: color, width: 3 },
        name: label,
        showlegend: true,
      });

      // Center
      if (node.showCenter !== false) {
        traces.push({
          type: "scatter", mode: "markers+text",
          x: [cx], y: [cy],
          text: [node.labelCenter ?? "C"], textposition: "top center",
          marker: { color: node.colorCenter ?? "#10b981", size: 8 },
          name: "Centro",
          showlegend: true,
        });
      }

      // Foci
      if (node.showFocus !== false && info.foci) {
        info.foci.forEach((f, i) => {
          traces.push({
            type: "scatter", mode: "markers+text",
            x: [f[0]], y: [f[1]],
            text: [`F${i+1}`], textposition: "top center",
            marker: { color: "#f59e0b", size: 8 },
            name: `Foco ${i+1}`,
            showlegend: true,
          });
        });
      }

      // Vertices
      if (node.showVertices !== false && info.vertices) {
        info.vertices.forEach((v, i) => {
          traces.push({
            type: "scatter", mode: "markers+text",
            x: [v[0]], y: [v[1]],
            text: [`V${i+1}`], textposition: "top center",
            marker: { color: "#f59e0b", size: 6 },
            name: `Vértice ${i+1}`,
            showlegend: true,
          });
        });
      }
    } else if (isParabola) {
      // Parabola rendering - y² = 4px or x² = 4py form
      const vertex = info.vertices?.[0] ?? [0, 0];
      const focus = info.focus ?? [0, 0];
      const directrix = info.directrix;
      const p = info.focalDistance ?? 1; // focal parameter
      
      // Determine orientation from focus-directrix
      const isVertical = directrix && directrix.A === 0; // horizontal directrix -> vertical parabola
      const focalLength = p;
      
      // Parabola: y² = 4px (horizontal) or x² = 4py (vertical)
      const samples = 100;
      const xData: number[] = [];
      const yData: number[] = [];
      
      if (isVertical) {
        // x² = 4py
        const p = focalLength;
        for (let i = -samples; i <= samples; i++) {
          const y = (i / samples) * 10 * Math.sign(p);
          const x = Math.sqrt(Math.abs(4 * p * y)) * (i >= samples/2 ? 1 : -1);
          xData.push(vertex[0] + x);
          yData.push(vertex[1] + y);
        }
      } else {
        // y² = 4px
        const p = focalLength;
        for (let i = -samples; i <= samples; i++) {
          const x = (i / samples) * 10 * Math.sign(p);
          const y = Math.sqrt(Math.abs(4 * p * x)) * (i >= samples/2 ? 1 : -1);
          xData.push(vertex[0] + x);
          yData.push(vertex[1] + y);
        }
      }
      
      traces.push({
        type: "scatter", mode: "lines",
        x: xData, y: yData,
        line: { color: color, width: 3 },
        name: label,
        showlegend: true,
      });
      
      // Focus
      if (node.showFocus !== false) {
        traces.push({
          type: "scatter", mode: "markers+text",
          x: [focus[0]], y: [focus[1]],
          text: [labelFocus ?? "F"], textposition: "top center",
          marker: { color: colorFocus ?? "#10b981", size: 8 },
          name: "Foco",
          showlegend: true,
        });
      }
      
      // Directrix
      if (node.showDirectrix !== false && directrix) {
        const { A, B, C } = directrix;
        if (Math.abs(B) > 1e-12) {
          const xMin = -5, xMax = 5;
          const x1 = -5, x2 = 5;
          const y1 = -(A * x1 + C) / B;
          const y2 = -(A * x2 + C) / B;
          traces.push({
            type: "scatter", mode: "lines",
            x: [x1, x2], y: [y1, y2],
            line: { color: colorDirectrix, width: 2, dash: "dash" },
            name: "Directriz",
            showlegend: true,
          });
        }
      }
    } else if (isHyperbola) {
      // Hyperbola rendering
      const center = info.center ?? [0, 0];
      const a = info.semiMajorAxis ?? 1;
      const b = info.semiMinorAxis ?? 1;
      const rotation = info.rotation ?? 0;
      const [cx, cy] = center;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      
      // Hyperbola: x²/a² - y²/b² = 1 (or y²/a² - x²/b² = 1)
      // Two branches
      const samples = 100;
      const branch1X: number[] = [];
      const branch1Y: number[] = [];
      const branch2X: number[] = [];
      const branch2Y: number[] = [];
      
      // Determine orientation
      const isHorizontal = info.asymptotes && info.asymptotes[0].slope !== Infinity;
      
      for (let i = -samples; i <= samples; i++) {
        const t = (i / samples) * 5; // parameter
        let x, y;
        if (isHorizontal) {
          x = a * Math.cosh(t);
          y = b * Math.sinh(t);
        } else {
          x = a * Math.sinh(t);
          y = b * Math.cosh(t);
        }
        // Rotate
        const xr = cx + x * cos - y * sin;
        const yr = cy + x * sin + y * cos;
        branch1X.push(xr);
        branch1Y.push(yr);
        branch2X.push(cx - x * cos + y * sin);
        branch2Y.push(cy - x * sin - y * cos);
      }
      
      traces.push({
        type: "scatter", mode: "lines",
        x: branch1X, y: branch1Y,
        line: { color: color, width: 3 },
        name: `${label} (rama 1)`,
        showlegend: true,
      });
      traces.push({
        type: "scatter", mode: "lines",
        x: branch2X, y: branch2Y,
        line: { color: color, width: 3 },
        name: `${label} (rama 2)`,
        showlegend: true,
      });
      
      // Asymptotes
      if (node.showAsymptotes !== false && info.asymptotes) {
        info.asymptotes.forEach((asym, i) => {
          const xMin = xDomain[0], xMax = xDomain[1];
          const y1 = asym.slope * (xDomain[0] - center[0]) + center[1] + asym.intercept;
          const y2 = asym.slope * (xDomain[1] - center[0]) + center[1] + asym.intercept;
          traces.push({
            type: "scatter", mode: "lines",
            x: [xDomain[0], xDomain[1]], y: [y1, y2],
            line: { color: colorAsymptotes ?? "#ec4899", width: 2, dash: "dash" },
            name: `Asíntota ${i+1}`,
            showlegend: true,
          });
        });
      }
      
      // Directrices
      if (node.showDirectrices !== false && info.directrices) {
        info.directrices.forEach((dir, i) => {
          const { A, B, C } = dir;
          if (Math.abs(B) > 1e-12) {
            const x1 = xDomain[0], x2 = xDomain[1];
            const y1 = -(A * x1 + C) / B;
            const y2 = -(A * x2 + C) / B;
            traces.push({
              type: "scatter", mode: "lines",
              x: [x1, x2], y: [y1, y2],
              line: { color: colorDirectrices, width: 1, dash: "dot" },
              name: `Directriz ${i+1}`,
              showlegend: true,
            });
          }
        });
      }
      
      // Center
      if (node.showCenter !== false) {
        traces.push({
          type: "scatter", mode: "markers+text",
          x: [center[0]], y: [center[1]],
          text: [node.labelCenter ?? "C"], textposition: "top center",
          marker: { color: colorCenter ?? "#10b981", size: 8 },
          name: "Centro",
          showlegend: true,
        });
      }
      
      // Foci
      if (node.showFocus !== false && info.foci) {
        info.foci.forEach((f, i) => {
          traces.push({
            type: "scatter", mode: "markers+text",
            x: [f[0]], y: [f[1]],
            text: [`F${i+1}`], textposition: "top center",
            marker: { color: colorFocus ?? "#f59e0b", size: 8 },
            name: `Foco ${i+1}`,
            showlegend: true,
          });
        });
      }
      
      // Vertices
      if (node.showVertices !== false && info.vertices) {
        info.vertices.forEach((v, i) => {
          traces.push({
            type: "scatter", mode: "markers+text",
            x: [v[0]], y: [v[1]],
            text: [`V${i+1}`], textposition: "top center",
            marker: { color: colorVertices ?? "#f59e0b", size: 6 },
            name: `Vértice ${i+1}`,
            showlegend: true,
          });
        });
      }
      
      // Asymptotes (for both hyperbola and parabola if applicable)
      if (isHyperbola && node.showAsymptotes !== false && info.asymptotes) {
        info.asymptotes.forEach((asym, i) => {
          const xMin = xDomain[0], xMax = xDomain[1];
          const y1 = asym.slope * (xDomain[0] - center[0]) + center[1] + asym.intercept;
          const y2 = asym.slope * (xDomain[1] - center[0]) + center[1] + asym.intercept;
          traces.push({
            type: "scatter", mode: "lines",
            x: [xDomain[0], xDomain[1]], y: [y1, y2],
            line: { color: colorAsymptotes ?? "#ec4899", width: 2, dash: "dash" },
            name: `Asíntota ${i+1}`,
            showlegend: true,
          });
        });
      }
      
      // Directrices for hyperbola
      if (isHyperbola && node.showDirectrices !== false && info.directrices) {
        info.directrices.forEach((dir, i) => {
          const { A, B, C } = dir;
          if (Math.abs(B) > 1e-12) {
            const x1 = xDomain[0], x2 = xDomain[1];
            const y1 = -(A * x1 + C) / B;
            const y2 = -(A * x2 + C) / B;
            traces.push({
              type: "scatter", mode: "lines",
              x: [xDomain[0], xDomain[1]], y: [y1, y2],
              line: { color: colorDirectrices, width: 1, dash: "dot" },
              name: `Directriz ${i+1}`,
              showlegend: true,
            });
          }
        });
      }
      
      // Vertices for hyperbola
      if (node.showVertices !== false && info.vertices) {
        info.vertices.forEach((v, i) => {
          traces.push({
            type: "scatter", mode: "markers+text",
            x: [v[0]], y: [v[1]],
            text: [`V${i+1}`], textposition: "top center",
            marker: { color: colorVertices ?? "#f59e0b", size: 6 },
            name: `Vértice ${i+1}`,
            showlegend: true,
          });
        });
      }
      
      // Foci for hyperbola
      if (node.showFocus !== false && info.foci) {
        info.foci.forEach((f, i) => {
          traces.push({
            type: "scatter", mode: "markers+text",
            x: [f[0]], y: [f[1]],
            text: [`F${i+1}`], textposition: "top center",
            marker: { color: colorFocus ?? "#f59e0b", size: 8 },
            name: `Foco ${i+1}`,
            showlegend: true,
          });
        });
      }
    }

    this.layout.title = {
      text: `${node.label ?? "Cónica"}: ${info.type} (${info.mode})`,
      x: 0.5,
    };

    this.data = traces;
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

  /** Draw both vectors, their oriented normal and the generated parallelogram. */
  private renderCrossProduct(node: CrossProductNode & { 
    crossScene?: CrossProductScene, 
    volumeInfo?: ParallelepipedVolumeInfo,
    collapseInfo?: CollapseStudy,
    effectiveW?: Vector3
  }): void {
    const { u, v, w, origin = [0, 0, 0], showPlane = true, showNormal = true, showArea = true, showTriangle = false, showVolume = false,
      showCollapse = false, collapseFactor = 0, collapseTarget = "coplanar",
      colorU = "#0284c7", colorNormal = "#10b981", colorPlane = "#cbd5e1", colorTriangle = "#f59e0b", colorVolume = "#8b5cf6",
      planeOpacity = 0.4, labelU = "u", labelV = "v", labelW = "w", labelNormal, reverseOrder = false,
      showRightHand = false, showAnticommutative = false, showDistributive = false } = node;
    const [ox, oy, oz] = origin && isFiniteVector(origin, 3) ? origin : [0, 0, 0];
    const operation = reverseOrder ? "v × u" : "u × v";
    const normalLabel = reverseOrder && labelNormal && labelNormal !== "u × v"
      ? labelNormal + " (" + operation + ")" : (reverseOrder ? operation : labelNormal ?? operation);
    
    // Usar effectiveW si está disponible (para animación de colapso), sino w original
    const effectiveW = node.effectiveW ?? w;
    const scene = node.crossScene ?? computeCrossProductScene(u, v, reverseOrder, effectiveW, origin);
    this.layout.scene.aspectmode = "data";
    this.layout.uirevision = this.mountRevision;
    this.layout.showlegend = true;
    if (scene.error !== undefined) {
      this.layout.title = { text: scene.error };
      return;
    }

    const arrows: Array<{ end: Vector3; color: string; label: string }> = [
      { end: u, color: colorU, label: labelU },
      { end: v, color: "#ea580c", label: labelV },
    ];
    if (showNormal && scene.opposite) {
      arrows.push({ end: scene.normal, color: colorNormal, label: normalLabel });
    }
    for (const { end: [x, y, z], color, label } of arrows) {
      const isNormal = scene.opposite && label === normalLabel;
      const hover = isNormal
        ? `${label}: (${x}, ${y}, ${z}) | ⊥ plano (u·n = 0, v·n = 0)`
        : `${label}: (${x}, ${y}, ${z})`;
      this.data.push({
        type: "scatter3d", mode: "lines+markers+text",
        x: [ox, ox + x], y: [oy, oy + y], z: [oz, oz + z],
        text: ["", label], textposition: "top center",
        hovertext: [`(${ox}, ${oy}, ${oz})`, hover],
        hoverinfo: "text",
        line: { color, width: 5 }, marker: { color, size: 3 }, name: label,
      });
      const extent = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
      if (extent > 0) {
        this.data.push({
          type: "cone", x: [ox + x], y: [oy + y], z: [oz + z],
          u: [x / extent], v: [y / extent], w: [z / extent],
          anchor: "tip", sizemode: "absolute", sizeref: extent * 0.17,
          colorscale: [[0, color], [1, color]], showscale: false,
          showlegend: false, hoverinfo: "skip",
        });
      }
    }

    if (showNormal && showAnticommutative && scene.opposite) {
      const oppOrder = reverseOrder ? "u × v" : "v × u";
      const oppLabel = `${oppOrder} = −(${operation})`;
      const oppNormal: Vector3 = [-scene.normal[0], -scene.normal[1], -scene.normal[2]];
      const oppColor = "#a855f7";
      this.data.push({
        type: "scatter3d", mode: "lines+markers+text",
        x: [ox, ox + oppNormal[0]], y: [oy, oy + oppNormal[1]], z: [oz, oz + oppNormal[2]],
        text: ["", oppLabel], textposition: "top center",
        hovertext: [`(${ox}, ${oy}, ${oz})`, `${oppLabel}: (${oppNormal[0]}, ${oppNormal[1]}, ${oppNormal[2]}) | Anticonmutatividad: intercambio de orden`],
        hoverinfo: "text",
        line: { color: oppColor, width: 5, dash: "dash" },
        marker: { color: oppColor, size: 3 },
        name: `Normal opuesta (${oppOrder})`,
      });
      const extent = Math.max(Math.abs(oppNormal[0]), Math.abs(oppNormal[1]), Math.abs(oppNormal[2]));
      if (extent > 0) {
        this.data.push({
          type: "cone", x: [ox + oppNormal[0]], y: [oy + oppNormal[1]], z: [oz + oppNormal[2]],
          u: [oppNormal[0] / extent], v: [oppNormal[1] / extent], w: [oppNormal[2] / extent],
          anchor: "tip", sizemode: "absolute", sizeref: extent * 0.17,
          colorscale: [[0, oppColor], [1, oppColor]], showscale: false,
          showlegend: false, hoverinfo: "skip",
        });
      }
    }

    if (showDistributive) {
      const vecW: Vector3 = (w && isFiniteVector(w, 3)) ? w : [0, 1, 1];
      const vPlusW: Vector3 = [v[0] + vecW[0], v[1] + vecW[1], v[2] + vecW[2]];
      const dist = computeCrossProductDistributivity(u, v, vecW);

      this.data.push({
        type: "scatter3d", mode: "lines+markers+text",
        x: [ox, ox + vecW[0]], y: [oy, oy + vecW[1]], z: [oz, oz + vecW[2]],
        text: ["", labelW], textposition: "top center",
        hovertext: [`(${ox}, ${oy}, ${oz})`, `${labelW}: (${vecW[0]}, ${vecW[1]}, ${vecW[2]})`],
        hoverinfo: "text",
        line: { color: "#06b6d4", width: 4 }, marker: { color: "#06b6d4", size: 3 }, name: labelW,
      });
      const extentW = Math.max(Math.abs(vecW[0]), Math.abs(vecW[1]), Math.abs(vecW[2]));
      if (extentW > 0) {
        this.data.push({
          type: "cone", x: [ox + vecW[0]], y: [oy + vecW[1]], z: [oz + vecW[2]],
          u: [vecW[0] / extentW], v: [vecW[1] / extentW], w: [vecW[2] / extentW],
          anchor: "tip", sizemode: "absolute", sizeref: extentW * 0.17,
          colorscale: [[0, "#06b6d4"], [1, "#06b6d4"]], showscale: false,
          showlegend: false, hoverinfo: "skip",
        });
      }

      const labelVPlusW = `${labelV} + ${labelW}`;
      this.data.push({
        type: "scatter3d", mode: "lines+markers+text",
        x: [ox, ox + vPlusW[0]], y: [oy, oy + vPlusW[1]], z: [oz, oz + vPlusW[2]],
        text: ["", labelVPlusW], textposition: "top center",
        hovertext: [`(${ox}, ${oy}, ${oz})`, `${labelVPlusW}: (${vPlusW[0]}, ${vPlusW[1]}, ${vPlusW[2]}) | Suma vectorial`],
        hoverinfo: "text",
        line: { color: "#d97706", width: 4, dash: "dot" }, marker: { color: "#d97706", size: 3 }, name: labelVPlusW,
      });
      const extentVW = Math.max(Math.abs(vPlusW[0]), Math.abs(vPlusW[1]), Math.abs(vPlusW[2]));
      if (extentVW > 0) {
        this.data.push({
          type: "cone", x: [ox + vPlusW[0]], y: [oy + vPlusW[1]], z: [oz + vPlusW[2]],
          u: [vPlusW[0] / extentVW], v: [vPlusW[1] / extentVW], w: [vPlusW[2] / extentVW],
          anchor: "tip", sizemode: "absolute", sizeref: extentVW * 0.17,
          colorscale: [[0, "#d97706"], [1, "#d97706"]], showscale: false,
          showlegend: false, hoverinfo: "skip",
        });
      }

      const uCrossVW = dist.uCrossSum;
      const extentUCross = Math.max(Math.abs(uCrossVW[0]), Math.abs(uCrossVW[1]), Math.abs(uCrossVW[2]));
      if (extentUCross > 0) {
        this.data.push({
          type: "scatter3d", mode: "lines+markers+text",
          x: [ox, ox + uCrossVW[0]], y: [oy, oy + uCrossVW[1]], z: [oz, oz + uCrossVW[2]],
          text: ["", "u × (v + w)"], textposition: "top center",
          hovertext: [`(${ox}, ${oy}, ${oz})`, `u × (v + w): (${uCrossVW[0]}, ${uCrossVW[1]}, ${uCrossVW[2]}) = (u × v) + (u × w)`],
          hoverinfo: "text",
          line: { color: "#059669", width: 5 }, marker: { color: "#059669", size: 3 }, name: "u × (v + w) (Distributividad)",
        });
        this.data.push({
          type: "cone", x: [ox + uCrossVW[0]], y: [oy + uCrossVW[1]], z: [oz + uCrossVW[2]],
          u: [uCrossVW[0] / extentUCross], v: [uCrossVW[1] / extentUCross], w: [uCrossVW[2] / extentUCross],
          anchor: "tip", sizemode: "absolute", sizeref: extentUCross * 0.17,
          colorscale: [[0, "#059669"], [1, "#059669"]], showscale: false,
          showlegend: false, hoverinfo: "skip",
        });
      }
    }

    if (showPlane && scene.opposite) {
      const [x, y, z] = scene.opposite;
      this.data.push({
        type: "mesh3d",
        x: [ox, ox + u[0], ox + x, ox + v[0]], y: [oy, oy + u[1], oy + y, oy + v[1]], z: [oz, oz + u[2], oz + z, oz + v[2]],
        i: [0, 0], j: reverseOrder ? [2, 3] : [1, 2], k: reverseOrder ? [1, 2] : [2, 3],
        color: colorPlane, opacity: planeOpacity, flatshading: true,
        name: "Plano generado", showlegend: true,
      });

      if (showArea && scene.area > 0) {
        this.data.push({
          type: "scatter3d", mode: "text",
          x: [ox + x / 2], y: [oy + y / 2], z: [oz + z / 2],
          text: [`Área = ${Number(scene.area.toPrecision(5))}`],
          textposition: "middle center",
          name: "Etiqueta de área",
          showlegend: false,
          hoverinfo: "text",
        });
      }
    }

    if (showTriangle && scene.opposite) {
      this.data.push({
        type: "mesh3d",
        x: [ox, ox + u[0], ox + v[0]], y: [oy, oy + u[1], oy + v[1]], z: [oz, oz + u[2], oz + v[2]],
        i: [0], j: reverseOrder ? [2] : [1], k: reverseOrder ? [1] : [2],
        color: colorTriangle, opacity: 0.55, flatshading: true,
        name: "Triángulo sustentado", showlegend: true,
      });

      if (showArea && scene.area > 0) {
        const triArea = Number(scene.triangleArea.toPrecision(5));
        this.data.push({
          type: "scatter3d", mode: "text",
          x: [ox + (u[0] + v[0]) / 3], y: [oy + (u[1] + v[1]) / 3], z: [oz + (u[2] + v[2]) / 3],
          text: [`Área triángulo = ${triArea}`],
          textposition: "middle center",
          name: "Etiqueta área triángulo",
          showlegend: false,
          hoverinfo: "text",
        });
      }
    }

    // Visualización del paralelepípedo con el tercer vector w
    if (showVolume && w && scene.opposite && isFiniteVector(w, 3)) {
      const [px, py, pz] = [ox + u[0], oy + u[1], oz + u[2]];
      const [qx, qy, qz] = [ox + v[0], oy + v[1], oz + v[2]];
      const [rx, ry, rz] = [ox + w[0], oy + w[1], oz + w[2]];
      const [sx, sy, sz] = [ox + u[0] + v[0] + w[0], oy + u[1] + v[1] + w[1], oz + u[2] + v[2] + w[2]];
      const [tx, ty, tz] = [ox + u[0] + w[0], oy + u[1] + w[1], oz + u[2] + w[2]];
      const [ux, uy, uz] = [ox + v[0] + w[0], oy + v[1] + w[1], oz + v[2] + w[2]];

      // 6 caras del paralelepípedo (8 vértices: O, P, Q, R, S, T, U, S)
      // Vértices: O(ox,oy,oz), P(px,py,pz), Q(qx,qy,qz), R(rx,ry,rz)
      //           S(sx,sy,sz), T(tx,ty,tz), U(ux,uy,uz)
      const faces = [
        // Cara base: u, v en el origen (O, P, S, T)
        { x: [ox, px, sx, tx], y: [oy, py, sy, ty], z: [oz, pz, sz, tz], name: "Base (u,v)" },
        // Cara superior: u, v desplazada por w (R, Q, U, S) - wait, let me reorder
        // Actually: top face is Q (v), R (w), U (v+w), S (u+v+w)
        // But we need the face parallel to base: R (w), U (v+w), S (u+v+w), T (u+w)
        { x: [rx, ux, sx, tx], y: [ry, uy, sy, ty], z: [rz, uz, sz, tz], name: "Superior (u,v)+w" },
        // Cara lateral: u, w en v=0 (O, P, T, R)
        { x: [ox, px, tx, rx], y: [oy, py, ty, ry], z: [oz, pz, tz, rz], name: "Lateral (u,w)" },
        // Cara lateral opuesta: u, w en v (Q, S, U, U?) -> Q, S, U, R? wait
        // The face parallel to u,w at v: Q(v), S(u+v), U(u+v+w), R(w) -> Q, S, U, R
        { x: [qx, sx, ux, rx], y: [qy, sy, uy, ry], z: [qz, sz, uz, rz], name: "Lateral (u,w)+v" },
        // Cara lateral: v, w en u=0 (O, Q, U, R)
        { x: [ox, qx, ux, rx], y: [oy, qy, uy, ry], z: [oz, qz, uz, rz], name: "Lateral (v,w)" },
        // Cara lateral opuesta: v, w en u (P, S, U, T)
        { x: [px, sx, ux, tx], y: [py, sy, uy, ty], z: [pz, sz, uz, tz], name: "Lateral (v,w)+u" },
      ];

      for (const face of faces) {
        const faceVertices: number[] = [];
        face.x.forEach((xi, i) => faceVertices.push(xi));
        this.data.push({
          type: "mesh3d",
          x: face.x, y: face.y, z: face.z,
          i: [0, 0], j: [1, 2], k: [2, 3],
          color: colorVolume, opacity: 0.25, flatshading: true,
          name: face.name, showlegend: true,
        });
      }

      // El renderizador también admite nodos directos sin los datos precalculados de Core.
      const volInfo = node.volumeInfo ?? computeParallelepipedVolume(u, v, w);
      const centroidX = (ox + px + qx + rx + tx + ux + sx) / 7;
      const centroidY = (oy + py + qy + ry + ty + uy + sy) / 7;
      const centroidZ = (oz + pz + qz + rz + tz + uz + sz) / 7;
      const volText = volInfo.orientation === "positive"
        ? `V = ${Number(volInfo.volumeAbsolute.toPrecision(5))} (FIRMADO > 0)`
        : volInfo.orientation === "negative"
          ? `V = ${Number(volInfo.volumeAbsolute.toPrecision(5))} (FIRMADO < 0)`
          : `V = 0 (degenerado)`;
      this.data.push({
        type: "scatter3d", mode: "text",
        x: [centroidX], y: [centroidY], z: [centroidZ],
        text: [volText],
        textposition: "middle center",
        name: "Volumen paralelepípedo",
        showlegend: false,
        hoverinfo: "text",
      });
    }

    // Visualización de animación de colapso (T017)
    if (showCollapse && node.collapseInfo && effectiveW && scene.opposite) {
      const collapseInfo: CollapseStudy = node.collapseInfo;
      const percent = collapseInfo.volumeOriginal > 0 
        ? (collapseInfo.volumeAtFactor / collapseInfo.volumeOriginal * 100).toFixed(1)
        : "0";
      
      // Flecha del vector w interpolado (mostrar estado actual)
      const wExtent = Math.max(Math.abs(effectiveW[0]), Math.abs(effectiveW[1]), Math.abs(effectiveW[2]));
      if (wExtent > 1e-12) {
        this.data.push({
          type: "scatter3d", mode: "lines+markers+text",
          x: [ox, ox + effectiveW[0]], y: [oy, oy + effectiveW[1]], z: [oz, oz + effectiveW[2]],
          text: ["", `${labelW} (${(collapseInfo.factor * 100).toFixed(0)}%)`], textposition: "top center",
          hovertext: [`(${ox}, ${oy}, ${oz})`, `w interpolado: (${effectiveW[0].toFixed(3)}, ${effectiveW[1].toFixed(3)}, ${effectiveW[2].toFixed(3)})`],
          hoverinfo: "text",
          line: { color: "#f59e0b", width: 4, dash: "dash" }, marker: { color: "#f59e0b", size: 3 }, name: `w (${(collapseInfo.factor * 100).toFixed(0)}%)`,
        });
        this.data.push({
          type: "cone", x: [ox + effectiveW[0]], y: [oy + effectiveW[1]], z: [oz + effectiveW[2]],
          u: [effectiveW[0] / wExtent], v: [effectiveW[1] / wExtent], w: [effectiveW[2] / wExtent],
          anchor: "tip", sizemode: "absolute", sizeref: wExtent * 0.17,
          colorscale: [[0, "#f59e0b"], [1, "#f59e0b"]], showscale: false,
          showlegend: false, hoverinfo: "skip",
        });
      }
      
      // Etiqueta de estado de colapso
      const centroidX = (ox + (ox + u[0] + v[0] + effectiveW[0]) / 2) / 2;
      const centroidY = (oy + (oy + u[1] + v[1] + effectiveW[1]) / 2) / 2;
      const centroidZ = (oz + (oz + u[2] + v[2] + effectiveW[2]) / 2) / 2;
      this.data.push({
        type: "scatter3d", mode: "text",
        x: [centroidX], y: [centroidY], z: [centroidZ],
        text: [`Colapso: ${(collapseInfo.factor * 100).toFixed(1)}% | Vol: ${collapseInfo.volumeAtFactor.toFixed(4)} (${percent}%)`],
        textposition: "middle center",
        name: "Estado colapso",
        showlegend: false,
        hoverinfo: "text",
        textfont: { color: collapseInfo.isCollapsed ? "#ef4444" : "#f59e0b", size: 12 },
      });

      // Si está colapsado, mostrar mensaje
      if (collapseInfo.isCollapsed) {
        this.data.push({
          type: "scatter3d", mode: "text",
          x: [ox], y: [oy], z: [oz + 1],
          text: ["⚠ PARELEPÍPEDO COLAPSADO: Volumen = 0 (coplanar)"],
          textposition: "middle center",
          name: "Advertencia colapso",
          showlegend: false,
          hoverinfo: "text",
          textfont: { color: "#ef4444", size: 14 },
        });
      }
    }

    if (showRightHand && scene.opposite) {
      const firstVec = reverseOrder ? v : u;
      const secondVec = reverseOrder ? u : v;
      const magA = Math.hypot(...firstVec);
      const magB = Math.hypot(...secondVec);
      const magN = Math.hypot(...scene.normal);
      if (magA > 1e-12 && magB > 1e-12 && magN > 1e-12) {
        const aHat: Vector3 = [firstVec[0] / magA, firstVec[1] / magA, firstVec[2] / magA];
        const dotAB = (firstVec[0] * secondVec[0] + firstVec[1] * secondVec[1] + firstVec[2] * secondVec[2]) / (magA * magB);
        const clampedDot = Math.max(-1, Math.min(1, dotAB));
        const theta = Math.acos(clampedDot);
        const dotASecond = secondVec[0] * aHat[0] + secondVec[1] * aHat[1] + secondVec[2] * aHat[2];
        const perpVec: Vector3 = [
          secondVec[0] - dotASecond * aHat[0],
          secondVec[1] - dotASecond * aHat[1],
          secondVec[2] - dotASecond * aHat[2],
        ];
        const magPerp = Math.hypot(...perpVec);
        if (magPerp > 1e-12 && theta > 1e-4) {
          const aPerpHat: Vector3 = [perpVec[0] / magPerp, perpVec[1] / magPerp, perpVec[2] / magPerp];
          const radius = Math.min(magA, magB) * 0.45;
          const arcPoints = 24;
          const arcX: number[] = [];
          const arcY: number[] = [];
          const arcZ: number[] = [];
          for (let step = 0; step <= arcPoints; step++) {
            const angle = (theta * step) / arcPoints;
            const ca = Math.cos(angle);
            const sa = Math.sin(angle);
            arcX.push(ox + radius * (ca * aHat[0] + sa * aPerpHat[0]));
            arcY.push(oy + radius * (ca * aHat[1] + sa * aPerpHat[1]));
            arcZ.push(oz + radius * (ca * aHat[2] + sa * aPerpHat[2]));
          }
          const arcName = reverseOrder ? "Giro v → u" : "Giro u → v";
          const arcColor = "#e11d48";
          this.data.push({
            type: "scatter3d", mode: "lines",
            x: arcX, y: arcY, z: arcZ,
            line: { color: arcColor, width: 6, dash: "solid" },
            name: arcName,
            hoverinfo: "name",
          });

          const endX = arcX[arcX.length - 1];
          const endY = arcY[arcY.length - 1];
          const endZ = arcZ[arcZ.length - 1];
          const tanX = -Math.sin(theta) * aHat[0] + Math.cos(theta) * aPerpHat[0];
          const tanY = -Math.sin(theta) * aHat[1] + Math.cos(theta) * aPerpHat[1];
          const tanZ = -Math.sin(theta) * aHat[2] + Math.cos(theta) * aPerpHat[2];
          const magTan = Math.hypot(tanX, tanY, tanZ);
          if (magTan > 0) {
            this.data.push({
              type: "cone", x: [endX], y: [endY], z: [endZ],
              u: [tanX / magTan], v: [tanY / magTan], w: [tanZ / magTan],
              anchor: "tip", sizemode: "absolute", sizeref: radius * 0.25,
              colorscale: [[0, arcColor], [1, arcColor]], showscale: false,
              showlegend: false, hoverinfo: "skip",
            });
          }

          const thumbLength = radius * 1.3;
          const nHat: Vector3 = [scene.normal[0] / magN, scene.normal[1] / magN, scene.normal[2] / magN];
          const thumbTip: Vector3 = [ox + thumbLength * nHat[0], oy + thumbLength * nHat[1], oz + thumbLength * nHat[2]];
          this.data.push({
            type: "scatter3d", mode: "lines+markers+text",
            x: [ox, thumbTip[0]], y: [oy, thumbTip[1]], z: [oz, thumbTip[2]],
            text: ["", "Pulgar"], textposition: "top center",
            line: { color: arcColor, width: 6 },
            marker: { color: arcColor, size: 4 },
            name: "Pulgar (mano derecha)",
          });
          this.data.push({
            type: "cone", x: [thumbTip[0]], y: [thumbTip[1]], z: [thumbTip[2]],
            u: [nHat[0]], v: [nHat[1]], w: [nHat[2]],
            anchor: "tip", sizemode: "absolute", sizeref: radius * 0.25,
            colorscale: [[0, arcColor], [1, arcColor]], showscale: false,
            showlegend: false, hoverinfo: "skip",
          });
        }
      }
    }

    let areaSubtitle = "";
    if (showArea) {
      const area = computeCrossProductArea(u, v, origin, scene);
      if (area.isZero) {
        areaSubtitle = "<br>Área: ‖u×v‖ = 0 (magnitud nula)";
      } else if (area.isParallel) {
        areaSubtitle = "<br>Área: ‖u×v‖ = 0 (vectores paralelos, sen(θ) = 0): no hay normal única por esos vectores";
      } else {
        areaSubtitle = `<br>Área: ‖u×v‖ = ‖u‖·‖v‖·sen(θ) = ${Number(area.area.toPrecision(7))} (θ ≈ ${area.thetaDeg.toFixed(1)}°)`;
        if (showTriangle) {
          areaSubtitle += ` | Área triángulo = ${Number(area.triangleArea.toPrecision(7))}`;
        }
      }
    }

    const warningText = scene.warning ?? `Los vectores son paralelos o nulos (${operation} = 0): no hay normal única por esos vectores`;
    const title = scene.opposite
      ? (node.showSteps || reverseOrder ? `Producto cruz (${operation})` : "Producto cruz")
      : warningText;
    this.layout.title = {
      text: showArea ? `${title}${areaSubtitle}` : title,
    };
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
