import { describe, expect, it, vi } from "vitest";
import { MathMDCore } from "@mathmd/core";
import { parseMathMD } from "@mathmd/parser";
import { computeCollapseStudy, computeParallelepipedVolume } from "@mathmd/math";
import { PlotlyRenderer, type PlotlyApi } from "../src/plotlyRenderer.js";
import type { Vector3 } from "@mathmd/math";

const makeElement = (): any => {
  const element: any = {
    style: {}, children: [], parentElement: null,
    appendChild(child: any) { this.children.push(child); child.parentElement = this; return child; },
    setAttribute() {}, getAttribute() { return null; },
  };
  return element;
};
if (typeof document === "undefined") {
  (globalThis as any).document = {
    createElement: () => makeElement(),
    createElementNS: () => makeElement(),
  };
}

const makeData = (u: Vector3, v: Vector3, w: Vector3, target: "coplanar" | "zero", factor: number,
  origin: Vector3 = [0, 0, 0]) => {
  const source = [
    "```crossproduct", "id: vis15-mesh",
    "u: " + JSON.stringify(u), "v: " + JSON.stringify(v), "w: " + JSON.stringify(w),
    "origin: " + JSON.stringify(origin),
    "showVolume: true", "showCollapse: true", "collapseTarget: " + target,
    "collapseFactor: " + factor, "```",
  ].join("\n");
  return new MathMDCore(parseMathMD(source)).getNodeData("vis15-mesh");
};

function plot() {
  const newPlot = vi.fn<PlotlyApi["newPlot"]>().mockResolvedValue(undefined);
  const react = vi.fn<PlotlyApi["react"]>().mockResolvedValue(undefined);
  const api: PlotlyApi = {
    newPlot, react,
    relayout: vi.fn<PlotlyApi["relayout"]>().mockResolvedValue(undefined),
    purge: vi.fn(), Plots: { resize: vi.fn() },
  };
  const renderer = new PlotlyRenderer(makeElement(), api);
  const lastTraces = () => {
    const call = react.mock.lastCall ?? newPlot.mock.lastCall;
    if (!call) throw new Error("Renderer did not plot");
    return call[1] as Array<Record<string, any>>;
  };
  return { renderer, newPlot, react, lastTraces };
}

function assertGeometry(traces: Array<Record<string, any>>, u: Vector3, v: Vector3,
  w: Vector3, origin: Vector3, volume: number) {
  const vector = (a: Vector3, b: Vector3, c: Vector3 = [0, 0, 0]): Vector3 =>
    [a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]];
  const P = vector(origin, u);
  const Q = vector(origin, v);
  const B = vector(P, v);
  const R = vector(origin, w);
  const T = vector(P, w);
  const U = vector(Q, w);
  const S = vector(B, w);
  const expected = new Map<string, Vector3[]>([
    ["Base (u,v)", [origin, P, B, Q]],
    ["Superior (u,v)+w", [R, T, S, U]],
    ["Lateral (u,w)", [origin, P, T, R]],
    ["Lateral (u,w)+v", [Q, B, S, U]],
    ["Lateral (v,w)", [origin, Q, U, R]],
    ["Lateral (v,w)+u", [P, B, S, T]],
  ]);
  for (const [name, vertices] of expected) {
    const face = traces.find(trace => trace.type === "mesh3d" && trace.name === name);
    expect(face, "Missing " + name).toBeDefined();
    for (const [axis, index] of [["x", 0], ["y", 1], ["z", 2]] as const) {
      expect(face![axis]).toEqual(vertices.map(v => v[index]));
    }
  }
  const all = traces.flatMap(t => ["x", "y", "z"].flatMap(k => Array.isArray(t[k]) ? t[k].flat(Infinity) : []))
    .filter(value => typeof value === "number");
  expect(all.every(Number.isFinite)).toBe(true);
  const volumeText = traces.find(t => t.name === "Volumen paralelepípedo");
  expect(volumeText?.text?.[0]).toContain(volume === 0 ? "V = 0" : "V = " + volume);
  const collapseText = traces.find(t => t.name === "Estado colapso");
  expect(collapseText?.text?.[0]).toContain("Vol: " + volume.toFixed(4));
  const wArrow = traces.find(t => typeof t.name === "string" && /^w \(\d+%\)$/.test(t.name));
  if (w.some(value => value !== 0)) {
    expect(wArrow).toMatchObject({
      type: "scatter3d",
      x: [origin[0], origin[0] + w[0]],
      y: [origin[1], origin[1] + w[1]],
      z: [origin[2], origin[2] + w[2]],
    });
  } else {
    expect(wArrow).toBeUndefined();
  }
}

describe("VIS-15: synchronized collapse meshes and volume", () => {
  it.each([
    { u: [1, 0, 0] as Vector3, v: [0, 1, 0] as Vector3, w: [0, 0, 1] as Vector3, target: "coplanar" as const, volumes: [1, .5, 0] },
    { u: [2, 0, 0] as Vector3, v: [0, 3, 0] as Vector3, w: [0, 0, 4] as Vector3, target: "zero" as const, volumes: [24, 12, 0] },
  ])("$target: volumes and all mesh3d faces at 0/50/100%", ({ u, v, w, target, volumes }) => {
    const { renderer, newPlot, react, lastTraces } = plot();
    const origin: Vector3 = [2, -1, 3];
    for (const [index, factor] of [0, .5, 1].entries()) {
      const data = makeData(u, v, w, target, factor, origin);
      expect(data.collapseInfo.volumeAtFactor).toBeCloseTo(volumes[index], 10);
      renderer.render(data);
      assertGeometry(lastTraces(), u, v, data.collapseInfo.currentW, origin, volumes[index]);
    }
    expect(newPlot).toHaveBeenCalledTimes(1);
    expect(react).toHaveBeenCalledTimes(2);
    renderer.destroy();
  });

  it.each([
    { target: "coplanar" as const, expected: [1, 1, 0] as Vector3 },
    { target: "zero" as const, expected: [0, 0, 0] as Vector3 },
  ])("uses $target to distinguish the 100% effective w", ({ target, expected }) => {
    const u: Vector3 = [1, 0, 0], v: Vector3 = [0, 1, 0], w: Vector3 = [1, 1, 1];
    const data = makeData(u, v, w, target, 1);
    expect(data.effectiveW).toEqual(expected);
    const { renderer, lastTraces } = plot();
    renderer.render(data);
    assertGeometry(lastTraces(), u, v, expected, [0, 0, 0], 0);
    renderer.destroy();
  });

  it("keeps one Plotly instance and retains the actual camera when re-rendering", () => {
    const { renderer, newPlot, react } = plot();
    const data = makeData([1, 0, 0], [0, 1, 0], [1, 1, 1], "coplanar", 0);
    renderer.render(data);
    const camera = { eye: { x: 0.8, y: 2.4, z: 0.4 }, center: { x: 0, y: 0, z: 0 } };
    (renderer.getElement() as any)._fullLayout = { scene: { camera } };
    const study = computeCollapseStudy(data.u, data.v, data.w, .5, "coplanar");
    renderer.render({ ...data, collapseFactor: .5, collapseInfo: study, effectiveW: study.currentW,
      volumeInfo: computeParallelepipedVolume(data.u, data.v, study.currentW) });
    expect(react).toHaveBeenCalledOnce();
    expect(newPlot).toHaveBeenCalledOnce();
    expect((react.mock.lastCall?.[2] as any).scene.camera).toEqual(camera);

    const next = plot();
    const savedCamera = renderer.getSceneCamera();
    expect(savedCamera).toEqual(camera);
    next.renderer.setSceneCamera(savedCamera!);
    next.renderer.render(data);
    expect((next.newPlot.mock.lastCall?.[2] as any).scene.camera).toEqual(camera);
    renderer.destroy();
    next.renderer.destroy();
  });
});
