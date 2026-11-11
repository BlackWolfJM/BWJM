import { readFileSync } from "node:fs";
import { parseMathMD } from "@mathmd/parser";
import { describe, expect, it } from "vitest";
import { MathMDCore } from "../src/index.js";

describe("ejemplo de la guía de integración", () => {
  it("calcula la circulación y el rotacional interior del disco unitario", () => {
    const source = readFileSync(new URL("../../../examples/guia-integracion-green.bwjm", import.meta.url), "utf8");
    const doc = parseMathMD(source);
    expect(doc.diagnostics).toEqual([]);
    const block = doc.children.find(node => node.type === "calculusviz");
    if (!block) throw new Error("Falta el bloque calculusviz del ejemplo.");
    const data = new MathMDCore(doc).getNodeData(block.id);
    expect(data.error).toBeUndefined();
    expect(data.value).toBeCloseTo(Math.PI, 2);
    expect(data.comparison?.value).toBeCloseTo(Math.PI, 2);
  });
});
