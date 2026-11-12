import type { CalculusVizNode } from "@mathmd/ast";
import { computeRiemannPartition } from "@mathmd/math";

/** The Riemann lesson is selected by its persistent block ID, not its filename. */
export const RIEMANN_LESSON_ID = "riemann-interactive";

export interface RiemannLessonStudy {
  a: number;
  n: number;
  intersections: Array<readonly [number, number]>;
  referenceArea: number;
  riemannSum: number;
  absoluteError: number;
  rectangles: ReturnType<typeof computeRiemannPartition>["rectangles"];
}

export interface RiemannLessonScene extends CalculusVizNode {
  polygons: Array<{ points: number[][]; fill: string; role: "riemann-rectangle" }>;
  curves: Array<{ points: number[][]; color: string; label: string; role: string }>;
  markers: Array<{ point: [number, number]; label: string; color: string }>;
}

/**
 * Construct both plotted curves and the midpoint rectangles from one state.
 * A fixed, independent samples setting controls only curve smoothness, never n.
 * Keeping the source as a calculusviz node lets us use the existing SVG
 * curve/polygon layers, with an optional intersection-point overlay.
 */
export function computeRiemannLesson(
  node: CalculusVizNode,
  a: number,
  n: number,
): { scene: RiemannLessonScene; study: RiemannLessonStudy } {
  const end = Number.isFinite(a) && a > 0 ? a : 1;
  const count = Number.isFinite(n) ? Math.max(2, Math.min(50, Math.round(n))) : 10;
  const curveSamples = Math.max(16, Math.min(400, Math.round(node.samples ?? 160)));
  const partition = computeRiemannPartition(
    "a*x", "x^2", [0, end], count, "midpoint", { a: end },
  );
  const referenceArea = end ** 3 / 6;
  const study: RiemannLessonStudy = {
    a: end,
    n: count,
    intersections: [[0, 0], [end, end * end]],
    referenceArea,
    riemannSum: partition.riemannSum,
    absoluteError: Math.abs(partition.riemannSum - referenceArea),
    rectangles: partition.rectangles,
  };

  // Plot both curves to x=2 even when the enclosed region stops earlier;
  // the intersection at (2,4) therefore remains in view for a=2.
  const domainEnd = Math.max(2, end);
  const upper: number[][] = [];
  const lower: number[][] = [];
  for (let i = 0; i <= curveSamples; i++) {
    const x = domainEnd * i / curveSamples;
    upper.push([x, end * x]);
    lower.push([x, x * x]);
  }
  const scene: RiemannLessonScene = {
    ...node,
    curves: [
      { points: upper, color: "#0284c7", label: "f(x) = a·x", role: "upper" },
      { points: lower, color: "#ea580c", label: "g(x) = x²", role: "lower" },
    ],
    polygons: partition.rectangles.map(rect => ({
      points: [
        [rect.x0, rect.yBottom], [rect.x1, rect.yBottom],
        [rect.x1, rect.yTop], [rect.x0, rect.yTop],
      ],
      fill: "#fbbf24",
      role: "riemann-rectangle" as const,
    })),
    markers: [
      { point: [0, 0], label: "(0, 0)", color: "#0f766e" },
      { point: [end, end * end], label: `(${Number(end.toPrecision(10))}, ${Number((end * end).toPrecision(10))})`, color: "#0f766e" },
    ],
  };
  return { study, scene };
}

function numeric(value: number): string {
  return String(Number(value.toPrecision(10)));
}

/** Render only educational results; never persist runtime changes to source. */
export function updateRiemannLessonReport(
  report: HTMLElement,
  study: RiemannLessonStudy,
): void {
  report.replaceChildren();
  report.className = "bwjm-calculus-report bwjm-riemann-report";
  report.setAttribute("aria-label", "Resultados de la suma de Riemann");

  const heading = document.createElement("strong");
  heading.textContent = `Región encerrada en [0, ${numeric(study.a)}] · ${study.n} rectángulos de punto medio`;
  report.appendChild(heading);

  const metrics: Array<[string, string, string, number]> = [
    ["intersections", "Cruces", `(0, 0) y (${numeric(study.a)}, ${numeric(study.a ** 2)})`, study.a],
    ["reference", "Área analítica a³/6", `${numeric(study.referenceArea)}${study.a === 1 ? " (1/6)" : study.a === 2 ? " (4/3)" : ""}`, study.referenceArea],
    ["sum", "Suma de Riemann (punto medio)", numeric(study.riemannSum), study.riemannSum],
    ["error", "Error absoluto", numeric(study.absoluteError), study.absoluteError],
  ];
  for (const [key, label, visible, value] of metrics) {
    const row = document.createElement("div");
    row.className = "bwjm-metric-row";
    const name = document.createElement("span");
    name.textContent = label + ":";
    const output = document.createElement("output");
    output.dataset.riemannMetric = key;
    output.dataset.value = String(value);
    output.textContent = visible;
    row.append(name, output);
    report.appendChild(row);
  }
}
