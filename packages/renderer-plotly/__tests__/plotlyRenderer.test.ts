import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlotlyRenderer, type PlotlyApi } from '../src/plotlyRenderer.js';

// Mock DOM elements for testing in node environment
const createMockElement = (tag: string = 'div'): any => {
  const el: any = {
    tagName: tag.toUpperCase(),
    style: {},
    appendChild: (child: any) => {
      child.parentElement = el;
      el.children.push(child);
      return child;
    },
    removeChild: (child: any) => {
      const idx = el.children.indexOf(child);
      if (idx !== -1) el.children.splice(idx, 1);
      return child;
    },
    children: [],
    setAttribute: () => {},
    getAttribute: () => null
  };
  return el;
};

if (typeof document === 'undefined') {
  (globalThis as any).document = {
    createElement: (tag: string) => createMockElement(tag),
    createElementNS: (_ns: string, tag: string) => createMockElement(tag)
  };
}
if (typeof window === 'undefined') {
  (globalThis as any).window = globalThis;
}

// Mock HTMLDivElement
if (typeof HTMLDivElement === 'undefined') {
  (globalThis as any).HTMLDivElement = function () {};
}

// Mock HTMLElement for testing
const createMockContainer = (): HTMLElement => {
  const div = document.createElement('div') as any;
  div.style.width = '800px';
  div.style.height = '600px';
  return div;
};

describe('PlotlyRenderer', () => {
  let renderer: PlotlyRenderer;
  let container: HTMLElement;
  let plotly: PlotlyApi;
  let newPlot: PlotlyApi["newPlot"];

  beforeEach(() => {
    vi.clearAllMocks();
    newPlot = vi.fn(() => Promise.resolve());
    plotly = {
      newPlot,
      react: vi.fn(() => Promise.resolve()),
      relayout: vi.fn(() => Promise.resolve()),
      purge: vi.fn(),
      Plots: { resize: vi.fn() },
    };
    container = createMockContainer();
    renderer = new PlotlyRenderer(container, plotly);
  });

  afterEach(() => {
    renderer.destroy();
  });

  it('should create a renderer instance', () => {
    expect(renderer).toBeInstanceOf(PlotlyRenderer);
    expect(renderer.getElement()).toBeDefined();
    expect(renderer.getElement().parentElement).toBe(container);
  });

  it('should handle surface3d node', () => {
    const surfaceNode = {
      type: 'surface3d',
      equation: 'x^2 + y^2',
      xDomain: [-5, 5],
      yDomain: [-5, 5],
      samples: 10,
      contours: true
    } as any;

    // This should not throw
    expect(() => renderer.render(surfaceNode)).not.toThrow();
    expect(newPlot).toHaveBeenCalledOnce();
  });

  it('uses surface samples prepared by the core for reactive equations', () => {
    const points = {
      x: [[-1, 1], [-1, 1]],
      y: [[-1, -1], [1, 1]],
      z: [[-2, 0], [0, 2]],
    };

    renderer.render({
      type: 'surface3d',
      equation: 'a * (x + y)',
      xDomain: [-1, 1],
      yDomain: [-1, 1],
      points,
    } as never);

    expect(newPlot).toHaveBeenCalledWith(
      expect.anything(),
      [expect.objectContaining({ type: 'surface', z: points.z })],
      expect.anything(),
      expect.anything(),
    );
  });

  it('renders curve3d node with trajectory line and particle', () => {
    const curveNode = {
      type: 'curve3d',
      x: 'cos(t)',
      y: 'sin(t)',
      z: 't / 3',
      tDomain: [0, 6.28],
      currentT: 1.5,
      showVectors: true,
      showTNB: true
    } as any;

    expect(() => renderer.render(curveNode)).not.toThrow();
    expect(newPlot).toHaveBeenCalledOnce();
  });

  it('renders a 3D curve without particles, legend or duplicate plot title when static', () => {
    renderer.render({
      type: 'curve3d',
      x: 'cos(t)', y: 'sin(t)', z: 't/3',
      tDomain: [0, 6.28],
      animated: false, showVectors: true, showTNB: true,
      showLegend: false,
    } as never);
    const args = vi.mocked(newPlot).mock.calls[0];
    const traces = args[1] as Array<{ name?: string }>;
    const layout = args[2] as { title?: { text?: string }; showlegend?: boolean };
    expect(traces).toHaveLength(1);
    expect(layout.title?.text).toBe('');
    expect(layout.showlegend).toBe(false);
  });

  it('shows particle, Frenet vectors and legend when animation is explicitly enabled', () => {
    renderer.render({
      type: 'curve3d',
      x: 'cos(t)', y: 'sin(t)', z: 't/3',
      tDomain: [0, 6.28], currentT: 1,
      animated: true, showVectors: true, showTNB: true,
      showLegend: true,
    } as never);
    const args = vi.mocked(newPlot).mock.calls[0];
    const traces = args[1] as Array<{ name?: string }>;
    const layout = args[2] as { title?: { text?: string }; showlegend?: boolean };
    expect(traces.length).toBeGreaterThan(1);
    expect(traces.some(trace => trace.name === 'Particula')).toBe(true);
    expect(traces.some(trace => trace.name === 'T')).toBe(true);
    expect(layout.showlegend).toBe(true);
    expect(layout.title?.text).toBe('');
  });

  it('should handle unsupported node types', () => {
    const unsupportedNode = {
      type: 'unsupportedType'
    } as any;

    // This should not throw but should show error
    expect(() => renderer.render(unsupportedNode)).not.toThrow();
  });

  it('should reset camera', async () => {
    const surfaceNode = {
      type: 'surface3d',
      equation: 'x^2 + y^2',
      xDomain: [-5, 5],
      yDomain: [-5, 5]
    } as any;

    renderer.render(surfaceNode);
    await Promise.resolve();
    expect(() => renderer.resetCamera()).not.toThrow();
    expect(plotly.relayout).toHaveBeenCalledOnce();
  });

  it('should resize', async () => {
    const surfaceNode = {
      type: 'surface3d',
      equation: 'x^2 + y^2',
      xDomain: [-5, 5],
      yDomain: [-5, 5]
    } as any;

    renderer.render(surfaceNode);
    await Promise.resolve();
    expect(() => renderer.resize(1024, 768)).not.toThrow();
    expect(plotly.Plots.resize).toHaveBeenCalledOnce();
  });
});
