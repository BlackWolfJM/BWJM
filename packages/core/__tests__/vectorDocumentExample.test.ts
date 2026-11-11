import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseMathMD } from "@mathmd/parser";
import { MathMDCore } from "../src/index.js";

describe("published lote 01 document",()=>{
  it("parses the real demo and computes each embedded vector block",()=>{
    const markdown=readFileSync(new URL("../../../examples/lote-01-vectores-interactivos.bwjm",import.meta.url),"utf8");
    const doc=parseMathMD(markdown);
    expect(doc.diagnostics.filter(d=>d.severity==="error")).toEqual([]);
    const vectors=doc.children.filter(node=>node.type==="vector2d"||node.type==="vector3d");
    expect(vectors).toHaveLength(12);
    const engine=new MathMDCore(doc);
    for(const node of vectors){
      const data=engine.getNodeData(node.id);
      expect(data.error).toBeUndefined();
      if(node.type==="vector2d"||node.type==="vector3d"){
        if(node.mode){
          expect(data.study?.steps.length).toBeGreaterThan(0);
          expect(data.study?.arrows.length).toBeGreaterThan(0);
        }else{
          expect(data.study).toBeUndefined();
        }
      }
    }
    const scaled=engine.getNodeData("lote-0108");
    expect(scaled.study.result).toEqual([6,4]);
    const comparison = scaled.study.steps.slice(1);
    expect(comparison.map((step: { title: string }) => step.title)).toEqual([
      "Comparación con k = -1", "Comparación con k = 0", "Comparación con k = 1",
    ]);
    expect(engine.setVariable("k",0)).toContain("lote-0108");
    const zeroScale = engine.getNodeData("lote-0108").study;
    expect(zeroScale.result).toEqual([0,0]);
    expect(zeroScale.explanation).toContain("no tiene dirección ni sentido");
    expect(zeroScale.steps.slice(1)).toEqual(comparison);
    expect(engine.setVariable("k",-1)).toContain("lote-0108");
    expect(engine.getNodeData("lote-0108").study.result).toEqual([-3,-2]);
    expect(engine.getNodeData("lote-0108").study.steps.slice(1)).toEqual(comparison);
  });

  it("parses and compiles T011 cross properties example", () => {
    const markdown = readFileSync(new URL("../../../examples/T011_MED-03.06-V_cross_properties.bwjm", import.meta.url), "utf8");
    const doc = parseMathMD(markdown);
    expect(doc.diagnostics.filter(d => d.severity === "error")).toEqual([]);
    const crossNode = doc.children.find(node => node.type === "crossproduct");
    expect(crossNode).toBeDefined();

    const engine = new MathMDCore(doc);
    const data = engine.getNodeData("cross-properties-demo");
    expect(data.error).toBeUndefined();
    expect(data.crossScene).toBeDefined();
    expect(data.crossScene.distributive).toBeDefined();
    expect(data.crossStudy.anticommutative).toBeDefined();
    expect(data.crossStudy.distributive).toBeDefined();
    expect(data.crossStudy.anticommutative.isNegationExact).toBe(true);
    expect(data.crossStudy.distributive.isDistributive).toBe(true);
    expect(data.crossStudy.distributive.uCrossSum).toEqual([6, -3, 1]);
  });

  it("parses and compiles T012 cross identity inspector example", () => {
    const markdown = readFileSync(new URL("../../../examples/T012_MED-03.06-C_identity_inspector.bwjm", import.meta.url), "utf8");
    const doc = parseMathMD(markdown);
    expect(doc.diagnostics.filter(d => d.severity === "error")).toEqual([]);
    const crossNode = doc.children.find(node => node.type === "crossproduct");
    expect(crossNode).toBeDefined();

    const engine = new MathMDCore(doc);
    const data = engine.getNodeData("cross-identity-inspector-demo");
    expect(data.error).toBeUndefined();
    expect(data.crossStudy).toBeDefined();
    expect(data.crossStudy.identities).toBeDefined();
    expect(data.crossStudy.identities.allPassed).toBe(true);
    expect(data.crossStudy.identities.proofs).toHaveLength(4);
    expect(data.crossStudy.identities.scalarWarning).toContain("No confundir con el producto escalar");

    const identityStep = data.crossStudy.steps.find((s: any) => s.title === "Inspector de identidades algebraicas");
    expect(identityStep).toBeDefined();
    expect(identityStep.identities).toBeDefined();
    expect(identityStep.identities.allPassed).toBe(true);
  });

  it("parses and compiles T013 triangle and parallelogram area example", () => {
    const markdown = readFileSync(new URL("../../../examples/T013_MED-03.07-V_triangle_parallelogram_area.bwjm", import.meta.url), "utf8");
    const doc = parseMathMD(markdown);
    expect(doc.diagnostics.filter(d => d.severity === "error")).toEqual([]);
    const crossNode = doc.children.find(node => node.type === "crossproduct");
    expect(crossNode).toBeDefined();

    const engine = new MathMDCore(doc);
    const data = engine.getNodeData("cross-area-triangle-demo");
    expect(data.error).toBeUndefined();
    expect(data.crossScene).toBeDefined();
    expect(data.crossScene.area).toBeCloseTo(Math.sqrt(61), 6);
    expect(data.crossScene.triangleArea).toBeCloseTo(Math.sqrt(61) / 2, 6);
    expect(data.crossScene.triangleArea).toBe(data.crossScene.area / 2);
    expect(data.crossScene.origin).toEqual([1, 1, 0]);

    expect(data.crossStudy).toBeDefined();
    expect(data.crossStudy.area).toBeDefined();
    expect(data.crossStudy.area.area).toBeCloseTo(Math.sqrt(61), 6);
    expect(data.crossStudy.area.triangleArea).toBeCloseTo(Math.sqrt(61) / 2, 6);
    expect(data.crossStudy.area.triangleFormula).toContain("1/2 · ‖u × v‖");
  });

  it("reopens T014 with exact areas after changing the common origin", () => {
    const source = readFileSync(new URL("../../../examples/T014_MED-03.07-C_exact_cross_product_area.bwjm", import.meta.url), "utf8");
    const document = parseMathMD(source);
    expect(document.diagnostics).toEqual([]);
    const before = new MathMDCore(document).getNodeData("cross-exact-area");
    expect(before.crossStudy.area.exact).toMatchObject({ radicand: "61", parallelogram: "√61", triangle: "√61/2" });
    expect(before.crossScene.origin).toEqual([1, 1, 0]);

    const reopened = parseMathMD(source.replace("origin: [1, 1, 0]", "origin: [-4, 2, 3]"));
    expect(reopened.diagnostics).toEqual([]);
    const after = new MathMDCore(reopened).getNodeData("cross-exact-area");
    expect(after).toMatchObject({ showSteps: true, showTriangle: true });
    expect(after.crossScene.origin).toEqual([-4, 2, 3]);
    expect(after.crossScene.area).toBe(before.crossScene.area);
    expect(after.crossScene.triangleArea).toBe(before.crossScene.triangleArea);
    expect(after.crossStudy.area.exact).toMatchObject({ radicand: "61", parallelogram: "√61", triangle: "√61/2" });
    expect(after.crossStudy.area.exact.translation).toContain("P₀ = (-4, 2, 3)");
  });
});
