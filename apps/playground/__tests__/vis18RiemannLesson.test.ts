import { describe, expect, it } from "vitest";
import { parseMathMD } from "@mathmd/parser";
import type { CalculusVizNode } from "@mathmd/ast";
import { computeRiemannLesson, RIEMANN_LESSON_ID } from "../src/riemannLesson.js";

const fence = String.fromCharCode(96).repeat(3);
const source = (samples: number) => [
  fence + "calculusviz", "id: " + RIEMANN_LESSON_ID,
  "mode: area-dx", "domain: [0,2]", "f: a*x", "g: x^2",
  "samples: " + samples, fence,
].join("\n");
const parsed = (samples = 160) => {
  const doc = parseMathMD(source(samples));
  expect(doc.diagnostics.filter(d => d.severity === "error")).toEqual([]);
  const node = doc.children.find(n => n.id === RIEMANN_LESSON_ID);
  if (!node || node.type !== "calculusviz") throw new Error("Expected parsed calculusviz");
  return node as CalculusVizNode;
};

describe("VIS-18 — interactive Riemann lesson data", () => {
  it("draws exactly two midpoint rectangles at a=1 n=2", () => {
    const { study, scene } = computeRiemannLesson(parsed(), 1, 2);
    expect(study.intersections).toEqual([[0,0],[1,1]]);
    expect(study.referenceArea).toBeCloseTo(1/6, 12);
    expect(study.riemannSum).toBe(.1875);
    expect(study.absoluteError).toBeCloseTo(.1875-1/6, 8);
    expect(study.rectangles).toHaveLength(2);
    expect(scene.polygons).toHaveLength(2);
    expect(scene.markers.map(m=>m.point)).toEqual([[0,0],[1,1]]);
    expect(scene.curves.map(curve=>curve.color)).toEqual(["#0284c7","#ea580c"]);
    expect(scene.curves).toHaveLength(2);
  });

  it("updates rectangle count and sum without changing the analytical reference", () => {
    const node = parsed(120);
    const two = computeRiemannLesson(node, 1, 2);
    const ten = computeRiemannLesson(node, 1, 10);
    expect(ten.study.riemannSum).toBe(.1675);
    expect(ten.study.absoluteError).toBeLessThan(two.study.absoluteError);
    expect(ten.scene.polygons).toHaveLength(10);
    expect(ten.study.referenceArea).toBe(two.study.referenceArea);
    expect(ten.scene.markers).toEqual(two.scene.markers);
    expect(ten.scene.curves[0].points).toHaveLength(121);
    expect(two.scene.curves[0].points).toHaveLength(121);
  });

  it("covers [0,2] with ten rectangles and keeps (2,4) inside the SVG extent", () => {
    const { study, scene } = computeRiemannLesson(parsed(), 2, 10);
    expect(study.intersections).toEqual([[0,0],[2,4]]);
    expect(study.referenceArea).toBeCloseTo(4/3, 12);
    expect(study.riemannSum).toBe(1.34);
    expect(study.rectangles).toHaveLength(10);
    expect(study.rectangles[0].x0).toBe(0);
    expect(study.rectangles.at(-1)?.x1).toBe(2);
    expect(scene.markers.at(-1)?.point).toEqual([2,4]);
    expect(scene.curves[0].points.at(-1)).toEqual([2,4]);
    expect(scene.curves[1].points.at(-1)).toEqual([2,4]);
    expect(study.absoluteError).toBeCloseTo(1.34 - 4/3, 6);
  });

  it("maintains curve sampling independent of n", () => {
    const node = parsed(60);
    const a = computeRiemannLesson(node, 2, 2);
    const b = computeRiemannLesson(node, 2, 50);
    expect(a.scene.curves[0].points).toHaveLength(61);
    expect(b.scene.curves[1].points).toHaveLength(61);
    expect(b.scene.polygons).toHaveLength(50);
  });
});
