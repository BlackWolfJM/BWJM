import type { MathMDNode } from "@mathmd/ast";
import { sampleSurface } from "@mathmd/math";

export interface PlotlyApi {
  newPlot(element: HTMLElement, data: unknown[], layout: object, config: object): Promise<unknown>;
  react(element: HTMLElement, data: unknown[], layout: object, config: object): Promise<unknown>;
  relayout(element: HTMLElement, update: object): Promise<unknown>;
  purge(element: HTMLElement): void;
  Plots: { resize(element: HTMLElement): void };
}

type SurfaceSamples = ReturnType<typeof sampleSurface>;
type PlotlyRenderNode = MathMDNode & { points?: SurfaceSamples };

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
    // Clear previous data
    this.data = [];
    
    switch (node.type) {
      case "surface3d":
        this.renderSurface3D(node);
        break;
        
      default:
        // For unsupported node types, render error message
        this.renderError(`Unsupported 3D node type: ${node.type}`);
        break;
    }
    
    // Update the plot
    void this.updatePlot();
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
