import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MathMDCore } from '@mathmd/core';
import { parseMathMD } from '@mathmd/parser';
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

  it('draws the two triangles and three arrows from parsed cross-product inputs', () => {
    const source = ['```crossproduct', 'id: cross', 'u: [1, 0, 0]', 'v: [0, 1, 0]', '```'].join('\n');
    const core = new MathMDCore(parseMathMD(source));
    const data = core.getNodeData('cross');
    expect(data.crossScene).toEqual({ normal: [0, 0, 1], area: 1, triangleArea: 0.5, opposite: [1, 1, 0] });
    renderer.render(data);
    expect(newPlot).toHaveBeenCalledWith(expect.anything(), expect.arrayContaining([
      expect.objectContaining({ type: 'mesh3d', i: [0, 0], j: [1, 2], k: [2, 3] }),
      expect.objectContaining({ type: 'scatter3d', name: 'u × v', z: [0, 1] }),
      expect.objectContaining({ type: 'cone', x: [1], y: [0], z: [0] }),
      expect.objectContaining({ type: 'cone', x: [0], y: [1], z: [0] }),
      expect.objectContaining({ type: 'cone', x: [0], y: [0], z: [1] }),
    ]), expect.objectContaining({ uirevision: expect.stringMatching(/^bwjm-mount-/), title: { text: expect.stringContaining('= 1') } }),
    expect.anything());
  });

  it('honors cross-product layer switches and suppresses the degenerate normal', () => {
    const source = ['```crossproduct', 'id: cross', 'u: [1, 0, 0]', 'v: [0, 1, 0]', '```'].join('\n');
    const [node] = parseMathMD(source).children;
    if (node.type !== 'crossproduct') throw new Error('Missing cross-product block');
    renderer.render({ ...node, showPlane: false, showNormal: false, showArea: false });
    const hidden = vi.mocked(newPlot).mock.calls[0];
    expect(hidden[1]).not.toEqual(expect.arrayContaining([expect.objectContaining({ type: 'mesh3d' })]));
    expect(hidden[1]).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: 'u × v' })]));
    expect(hidden[2]).toMatchObject({ title: { text: 'Producto cruz' } });

    renderer.render({ ...node, v: [2, 0, 0] });
    expect(plotly.react).toHaveBeenCalledWith(
      expect.anything(), expect.not.arrayContaining([expect.objectContaining({ name: 'u × v' })]),
      expect.objectContaining({ title: { text: expect.stringContaining('paralelos o nulos') } }), expect.anything(),
    );
  });

  it('renders the reversed normal from the same calculator data and reverses the plane winding', () => {
    const source = ['```crossproduct', 'id: cross', 'u: [2, 1, 3]', 'v: [1, 4, -2]',
      'showSteps: false', 'reverseOrder: true', '```'].join('\n');
    const data = new MathMDCore(parseMathMD(source)).getNodeData('cross');
    expect(data.crossStudy.operation).toBe('v × u');
    expect(data.crossStudy.resultText).toBe('= (14, -7, -7)');
    expect(data.crossScene).toBe(data.crossStudy.scene);
    renderer.render(data);
    expect(newPlot).toHaveBeenCalledWith(expect.anything(), expect.arrayContaining([
      expect.objectContaining({ name: 'u', x: [0, 2], z: [0, 3], line: { color: '#0284c7', width: 5 } }),
      expect.objectContaining({ name: 'v', x: [0, 1], z: [0, -2], line: { color: '#ea580c', width: 5 } }),
      expect.objectContaining({ name: 'v × u', x: [0, 14], y: [0, -7], z: [0, -7] }),
      expect.objectContaining({ type: 'mesh3d', i: [0, 0], j: [2, 3], k: [1, 2] }),
    ]), expect.anything(), expect.anything());
  });

  it('renders the 3D right-hand rule arc and thumb, and reverses orientation on reverseOrder', () => {
    const source = ['```crossproduct', 'id: cross', 'u: [1, 0, 0]', 'v: [0, 1, 0]',
      'showRightHand: true', '```'].join('\n');
    const data = new MathMDCore(parseMathMD(source)).getNodeData('cross');
    renderer.render(data);
    expect(newPlot).toHaveBeenCalledWith(expect.anything(), expect.arrayContaining([
      expect.objectContaining({ type: 'scatter3d', name: 'Giro u → v' }),
      expect.objectContaining({ type: 'scatter3d', name: 'Pulgar (mano derecha)' }),
    ]), expect.anything(), expect.anything());

    // When reverseOrder: true
    const reverseSource = ['```crossproduct', 'id: cross', 'u: [1, 0, 0]', 'v: [0, 1, 0]',
      'showRightHand: true', 'reverseOrder: true', '```'].join('\n');
    const revData = new MathMDCore(parseMathMD(reverseSource)).getNodeData('cross');
    renderer.render(revData);
    expect(plotly.react).toHaveBeenCalledWith(expect.anything(), expect.arrayContaining([
      expect.objectContaining({ type: 'scatter3d', name: 'Giro v → u' }),
      expect.objectContaining({ type: 'scatter3d', name: 'Pulgar (mano derecha)' }),
    ]), expect.anything(), expect.anything());

    // When parallel, no right-hand arc or thumb is rendered
    const parallelSource = ['```crossproduct', 'id: cross', 'u: [1, 0, 0]', 'v: [2, 0, 0]',
      'showRightHand: true', '```'].join('\n');
    const parallelData = new MathMDCore(parseMathMD(parallelSource)).getNodeData('cross');
    renderer.render(parallelData);
    expect(plotly.react).toHaveBeenCalledWith(expect.anything(), expect.not.arrayContaining([
      expect.objectContaining({ name: 'Giro u → v' }),
      expect.objectContaining({ name: 'Pulgar (mano derecha)' }),
    ]), expect.anything(), expect.anything());
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

  it('renders parallelogram area depending on sine of angle and toggles correctly', () => {
    // With showArea: true
    renderer.render({
      type: 'crossproduct',
      id: 'cross-test-area',
      u: [2, 3, 1],
      v: [4, 1, 5],
      showPlane: true,
      showArea: true,
    } as never);
    expect(newPlot).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([expect.objectContaining({ name: 'Etiqueta de área' })]),
      expect.objectContaining({ title: { text: expect.stringMatching(/sen\(θ\).*θ ≈ 48\.7°/) } }),
      expect.anything(),
    );

    // With showArea: false
    renderer.render({
      type: 'crossproduct',
      id: 'cross-test-no-area',
      u: [2, 3, 1],
      v: [4, 1, 5],
      showPlane: true,
      showArea: false,
    } as never);
    expect(plotly.react).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.arrayContaining([expect.objectContaining({ name: 'Etiqueta de área' })]),
      expect.objectContaining({ title: { text: expect.not.stringContaining('Área:') } }),
      expect.anything(),
    );

    // Parallel vectors: zero area without division by zero
    renderer.render({
      type: 'crossproduct',
      id: 'cross-test-parallel',
      u: [1, 2, 3],
      v: [2, 4, 6],
      showArea: true,
    } as never);
    expect(plotly.react).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.arrayContaining([expect.objectContaining({ name: 'Etiqueta de área' })]),
      expect.objectContaining({ title: { text: expect.stringContaining('Área: ‖u×v‖ = 0 (vectores paralelos, sen(θ) = 0)') } }),
      expect.anything(),
    );
  });

  it('renders perpendicular normal with zero dot products hover and warns if non-unique when parallel', () => {
    // Normal perpendicular with hovertext indicating u·n = 0, v·n = 0
    renderer.render({
      type: 'crossproduct',
      id: 'cross-test-perp',
      u: [2, 3, 1],
      v: [4, 1, 5],
      showPlane: true,
      showNormal: true,
      showArea: false,
    } as never);

    expect(newPlot).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({
          type: 'scatter3d',
          name: 'u × v',
          hovertext: expect.arrayContaining([expect.stringContaining('⊥ plano (u·n = 0, v·n = 0)')]),
        }),
      ]),
      expect.anything(),
      expect.anything(),
    );

    // Parallel case warns that there is no unique normal
    renderer.render({
      type: 'crossproduct',
      id: 'cross-test-perp-parallel',
      u: [1, 2, 3],
      v: [2, 4, 6],
      showPlane: true,
      showNormal: true,
      showArea: false,
    } as never);

    expect(plotly.react).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.arrayContaining([expect.objectContaining({ name: 'u × v' })]),
      expect.objectContaining({
        title: { text: expect.stringContaining('no hay normal única por esos vectores') },
      }),
      expect.anything(),
    );
  });

  it('T011 MED-03.06-V: renders anticommutative opposite normal and distributive expansion layers', () => {
    // Render with showAnticommutative: true
    renderer.render({
      type: 'crossproduct',
      id: 'cross-anti-demo',
      u: [1, 2, 0],
      v: [0, 3, 1],
      showPlane: true,
      showNormal: true,
      showArea: false,
      showAnticommutative: true,
    } as never);

    expect(newPlot).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({
          type: 'scatter3d',
          name: 'u × v',
        }),
        expect.objectContaining({
          type: 'scatter3d',
          name: 'Normal opuesta (v × u)',
          text: expect.arrayContaining([expect.stringContaining('v × u = −(u × v)')]),
        }),
      ]),
      expect.anything(),
      expect.anything(),
    );

    // Render with showDistributive: true and vector w
    renderer.render({
      type: 'crossproduct',
      id: 'cross-dist-demo',
      u: [1, 2, 0],
      v: [0, 3, 1],
      w: [1, 0, 2],
      showPlane: true,
      showNormal: true,
      showArea: false,
      showDistributive: true,
      labelW: 'w',
    } as never);

    expect(plotly.react).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({
          type: 'scatter3d',
          name: 'w',
        }),
        expect.objectContaining({
          type: 'scatter3d',
          name: 'v + w',
        }),
        expect.objectContaining({
          type: 'scatter3d',
          name: 'u × (v + w) (Distributividad)',
          text: expect.arrayContaining(['u × (v + w)']),
        }),
      ]),
      expect.anything(),
      expect.anything(),
    );
  });

  it('T013 MED-03.07-V: renders shaded triangle and parallelogram with translated origin and area labels', () => {
    renderer.render({
      type: 'crossproduct',
      id: 'cross-triangle-test',
      u: [2, 0, 1],
      v: [0, 3, 2],
      origin: [1, 1, 0],
      showPlane: true,
      showTriangle: true,
      showNormal: true,
      showArea: true,
      colorTriangle: '#f59e0b',
    } as never);

    expect(newPlot).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        // Translated vectors starting at origin [1, 1, 0]
        expect.objectContaining({
          type: 'scatter3d',
          name: 'u',
          x: [1, 3],
          y: [1, 1],
          z: [0, 1],
        }),
        expect.objectContaining({
          type: 'scatter3d',
          name: 'v',
          x: [1, 1],
          y: [1, 4],
          z: [0, 2],
        }),
        // Parallelogram mesh
        expect.objectContaining({
          type: 'mesh3d',
          name: 'Plano generado',
          x: [1, 3, 3, 1],
          y: [1, 1, 4, 4],
          z: [0, 1, 3, 2],
        }),
        // Shaded triangle mesh
        expect.objectContaining({
          type: 'mesh3d',
          name: 'Triángulo sustentado',
          x: [1, 3, 1],
          y: [1, 1, 4],
          z: [0, 1, 2],
          color: '#f59e0b',
          i: [0],
        }),
        // Parallelogram area label
        expect.objectContaining({
          type: 'scatter3d',
          name: 'Etiqueta de área',
          text: [expect.stringContaining('Área = ')],
        }),
        // Triangle area label
        expect.objectContaining({
          type: 'scatter3d',
          name: 'Etiqueta área triángulo',
          text: [expect.stringContaining('Área triángulo = ')],
        }),
      ]),
      expect.anything(),
      expect.anything(),
    );
  });

  it('T013 uses the same nonzero areas in the title and both labels at small scales', () => {
    renderer.render({
      type: 'crossproduct',
      id: 'cross-small-triangle',
      u: [1e-7, 0, 0],
      v: [0, 1e-7, 0],
      origin: [1, 1, 0],
      showTriangle: true,
    } as never);

    expect(newPlot).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({ name: 'Etiqueta de área', text: ['Área = 1e-14'] }),
        expect.objectContaining({ name: 'Etiqueta área triángulo', text: ['Área triángulo = 5e-15'] }),
      ]),
      expect.objectContaining({
        title: { text: expect.stringMatching(/= 1e-14 \(θ ≈ 90\.0°\) \| Área triángulo = 5e-15/) },
      }),
      expect.anything(),
    );
  });

  it('T015 renders parallelepiped volume when showVolume and w are provided', () => {
    renderer.render({
      type: 'crossproduct',
      id: 'cross-volume',
      u: [1, 0, 0],
      v: [0, 1, 0],
      w: [0, 0, 1],
      showVolume: true,
    } as never);

    expect(newPlot).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        // Parallelepiped faces (3 mesh3d for base + 2 laterals)
        expect.objectContaining({ type: 'mesh3d', name: 'Base (u,v)' }),
        expect.objectContaining({ type: 'mesh3d', name: 'Lateral (u,w)' }),
        expect.objectContaining({ type: 'mesh3d', name: 'Lateral (v,w)' }),
        // Volume label
        expect.objectContaining({
          type: 'scatter3d',
          name: 'Volumen paralelepípedo',
          text: [expect.stringContaining('V = ')],
        }),
      ]),
      expect.anything(),
      expect.anything(),
    );
  });

  it('T015 shows negative signed volume with correct orientation', () => {
    renderer.render({
      type: 'crossproduct',
      id: 'cross-volume-neg',
      u: [1, 0, 0],
      v: [0, 0, 1],  // v = k
      w: [0, 1, 0],  // w = j => v×w = -i, u·(-i) = -1
      showVolume: true,
    } as never);

    expect(newPlot).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({
          type: 'scatter3d',
          name: 'Volumen paralelepípedo',
          text: [expect.stringContaining('FIRMADO < 0')],
        }),
      ]),
      expect.anything(),
      expect.anything(),
    );
  });

  it('T015 does not render volume when showVolume is false or w is missing', () => {
    // Without showVolume
    renderer.render({
      type: 'crossproduct',
      id: 'cross-no-volume',
      u: [1, 0, 0],
      v: [0, 1, 0],
      w: [0, 0, 1],
      showVolume: false,
    } as never);

    expect(newPlot).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.arrayContaining([
        expect.objectContaining({ name: 'Volumen paralelepípedo' }),
      ]),
      expect.anything(),
      expect.anything(),
    );

    // Without w
    renderer.render({
      type: 'crossproduct',
      id: 'cross-no-w',
      u: [1, 0, 0],
      v: [0, 1, 0],
      showVolume: true,
    } as never);

    expect(newPlot).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.arrayContaining([
        expect.objectContaining({ name: 'Volumen paralelepípedo' }),
      ]),
      expect.anything(),
      expect.anything(),
    );
  });
});
