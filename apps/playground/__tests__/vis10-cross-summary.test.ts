import { describe, expect, it } from "vitest";
import { parseMathMD } from "@mathmd/parser";
import { prepareCrossProductNodeData } from "@mathmd/core";
import { summarizeCrossProductData } from "../src/CrossProductEditor.js";
import type { CrossProductNode } from "@mathmd/ast";

const fence = String.fromCharCode(96).repeat(3);

function source(options: string[] = []): CrossProductNode {
  const markdown = [
    fence + "crossproduct", "id: vis10-escena",
    "u: [2, 0, 0]", "v: [0, 3, 0]", "w: [0, 0, 4]",
    ...options, fence,
  ].join("\n");
  const node = parseMathMD(markdown).children[0];
  if (!node || node.type !== "crossproduct") throw new Error("Bloque crossproduct no válido");
  return node;
}
function getMetric(options: string[], label: string): string | undefined {
  return summarizeCrossProductData(prepareCrossProductNodeData(source(options)))
    .metrics.find(metric => metric.label === label)?.value;
}

describe("VIS-10: resumen semántico independiente de la geometría 3D", () => {
  it("muestra área 6, triángulo 3, ángulo y ambos volúmenes 24 sin showSteps", () => {
    const data = prepareCrossProductNodeData(source([
      "showPlane: true", "showArea: true", "showTriangle: true", "showVolume: true",
    ]));
    expect(data.showSteps).toBeUndefined();
    const result = summarizeCrossProductData(data);
    expect(result.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Área del paralelogramo", value: "6" }),
      expect.objectContaining({ label: "Área del triángulo", value: "3" }),
      expect.objectContaining({ label: "Ángulo entre u y v", value: "90°" }),
      expect.objectContaining({ label: "Volumen firmado", value: "24" }),
      expect.objectContaining({ label: "Volumen geométrico", value: "24" }),
    ]));
    expect(result.notices).toHaveLength(0);
  });

  it("conserva área aunque showPlane sea false y showSteps esté desactivado", () => {
    expect(getMetric(["showPlane: false", "showArea: true", "showSteps: false"],
      "Área del paralelogramo")).toBe("6");
  });

  it("respeta showArea y showTriangle: no muestra cifras desactivadas", () => {
    expect(getMetric(["showArea: false", "showTriangle: true"],
      "Área del paralelogramo")).toBeUndefined();
    expect(getMetric(["showArea: false", "showTriangle: true"],
      "Área del triángulo")).toBeUndefined();
    expect(getMetric(["showArea: true", "showTriangle: false"],
      "Área del triángulo")).toBeUndefined();
  });

  it("volumen firmado negativo -24, geométrico positivo 24", () => {
    const node = source(["showVolume: true"]);
    const current = prepareCrossProductNodeData({ ...node, w: [0, 0, -4] });
    const result = summarizeCrossProductData(current);
    expect(result.metrics.find(metric => metric.label === "Volumen firmado")?.value).toBe("-24");
    expect(result.metrics.find(metric => metric.label === "Volumen geométrico")?.value).toBe("24");
  });

  it("volumeInfo solo no autoriza mostrar volumen; requiere showVolume explícito", () => {
    const enabled = prepareCrossProductNodeData(source(["showVolume: true"]));
    const omitted = prepareCrossProductNodeData(source());
    const disabled = prepareCrossProductNodeData(source(["showVolume: false"]));
    expect(enabled.volumeInfo?.volumeAbsolute).toBe(24);
    expect(omitted.volumeInfo?.volumeAbsolute).toBe(24); // legacy core contract
    for (const data of [omitted, disabled, { ...omitted, volumeInfo: enabled.volumeInfo }]) {
      const result = summarizeCrossProductData(data);
      expect(result.metrics.some(metric => metric.label.startsWith("Volumen"))).toBe(false);
    }
  });

  it("colapso confirmado al 100 % conserva volumen 0 y aviso junto a cifras", () => {
    const data = prepareCrossProductNodeData(source([
      "showVolume: true", "showCollapse: true", "collapseFactor: 1",
      "collapseTarget: coplanar",
    ]));
    const result = summarizeCrossProductData(data);
    expect(result.metrics.find(metric => metric.label === "Colapso")?.value).toBe("100%");
    expect(result.metrics.find(metric => metric.label === "Volumen firmado")?.value).toBe("0");
    expect(result.metrics.find(metric => metric.label === "Volumen geométrico")?.value).toBe("0");
    expect(result.notices.some(message => message.includes("colapsado"))).toBe(true);
  });

  it("paralelos y nulos muestran advertencia clara aunque showSteps falte", () => {
    const original = source(["showArea: true"]);
    for (const vector of [[4, 0, 0], [0, 0, 0]] as const) {
      const data = prepareCrossProductNodeData({ ...original, v: [...vector] });
      const result = summarizeCrossProductData(data);
      expect(result.metrics.find(metric => metric.label === "Área del paralelogramo")?.value).toBe("0");
      expect(result.notices.some(message => /paralelos o nulos/i.test(message))).toBe(true);
    }
  });

  it("precisión del área 1e-14 y triángulo 5e-15; vista previa usa motor actualizado", () => {
    const data = prepareCrossProductNodeData({
      ...source(["showArea: true", "showTriangle: true"]),
      u: [1e-7, 0, 0], v: [0, 1e-7, 0],
    });
    const result = summarizeCrossProductData(data);
    expect(result.metrics.find(metric => metric.label === "Área del paralelogramo")?.value).toBe("1e-14");
    expect(result.metrics.find(metric => metric.label === "Área del triángulo")?.value).toBe("5e-15");
    const preview = prepareCrossProductNodeData({ ...data, u: [4, 0, 0] });
    expect(summarizeCrossProductData(preview).metrics.find(metric =>
      metric.label === "Área del paralelogramo")?.value).toBe("4e-7");
  });
});
