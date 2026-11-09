import type { MathMDNode } from "@mathmd/ast";
import { sampleSurface, sampleParametricTrajectory, computeKinematics } from "@mathmd/math";

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
    // Create div for Plotly
    this.plotlyDiv = document.createElement("div");
    this.plotlyDiv.style.width = "100%";
    this.plotlyDiv.style.height = "100%";
    this.plotlyDiv.style.position = "relative";
    container.appendChild(this.plotlyDiv);

    // Default layout
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

    // Default config
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
      case "surface3d":
        this.renderSurface3D(node as any);
        break;

      case "curve3d":
        this.renderCurve3D(node as any);
        break;

      default:
        this.renderError(`Unsupported 3D node type: ${node.type}`);
        break;
    }

    void this.updatePlot();
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
      // Sample the surface using the math engine
      const surfaceData = node.points ?? sampleSurface(
        equation,
        xDomain,
        yDomain,
        samples,
        samples
      );
      
      const { x, y, z } = surfaceData;
      
      // Create surface trace
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
      
      // Update layout title with equation
      this.layout.title = {
        text: `Surface: ${equation}`,
        x: 0.5,
        xanchor: 'center'
      };
      
      // Update scene aspect ratio based on domains
      const xRange = xDomain[1] - xDomain[0];
      const yRange = yDomain[1] - yDomain[0];
      // Z range would need to be calculated from data, but we'll approximate
      this.layout.scene.aspectmode = "manual";
      this.layout.scene.aspectratio = { 
        x: xRange, 
        y: yRange, 
        z: Math.max(xRange, yRange) 
      };
      
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
