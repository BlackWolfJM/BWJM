import { describe, it, expect } from "vitest";
import type { CrossProductNode } from "@mathmd/ast";
import { parseMathMD } from "@mathmd/parser";
import { MathMDCore } from "@mathmd/core";
import { updateCrossProductVector, updateGraphOption } from "../src/graphOptionSource.js";

const fence = "```";
const block=(kind:string,lines:string[])=>[fence+kind,...lines,fence].join("\n");

describe("vector study personalized graph menu",()=>{
  it("persists showSteps in the selected vector2d, without changing other blocks",()=>{
    const source=[
      block("vector2d",["id: first","vector: [3,2]","mode: sum","other: [1,4]"]),
      block("vector2d",["id: second","vector: [1,1]","mode: scale","factor: 2"])
    ].join("\n\n");
    const original=parseMathMD(source);
    expect(original.diagnostics).toHaveLength(0);
    const first=original.children[0];
    const updated=updateGraphOption(source,first.range,"vector2d","showSteps",false);
    const parsed=parseMathMD(updated);
    expect(parsed.diagnostics).toHaveLength(0);
    const left=parsed.children[0],right=parsed.children[1];
    if(left.type!=="vector2d"||right.type!=="vector2d")throw Error("wrong type");
    expect(left.showSteps).toBe(false);
    expect(right.showSteps).toBeUndefined();
    expect(updated).toContain("showSteps: false");
  });
  it("allows toggling true and rejects unrelated settings",()=>{
    const source=block("vector3d",["id: third","vector: [2,1,3]","mode: components","showSteps: false"]);
    const doc=parseMathMD(source);
    expect(doc.diagnostics).toHaveLength(0);
    const range=doc.children[0].range;
    const updated=updateGraphOption(source,range,"vector3d","showSteps",true);
    expect(updated).toContain("showSteps: true");
    expect(updateGraphOption(source,range,"vector3d","animated",true)).toBe(source);
  });

  it("reopens cross-product layer options and a changed multiline tuple without changing other graphs", () => {
    const source = [
      block("crossproduct", [
        "id: first", "u:", "  - 1", "", "  # componente y", "  - 0", "  - 0", "v: [0, 1, 0]",
      ]),
      block("crossproduct", ["id: second", "u: [1, 0, 0]", "v: [0, 0, 1]"]),
    ].join("\n\n").replace(/\n/g, "\r\n");
    const document = parseMathMD(source);
    expect(document.diagnostics).toEqual([]);
    const originalSecond = source.slice(document.children[1].range.start.offset);
    const changed = updateCrossProductVector(source, document.children[0].range, "u", [0, 2, 1]);
    const afterVector = parseMathMD(changed);
    expect(afterVector.diagnostics).toEqual([]);
    const updated = updateGraphOption(changed, afterVector.children[0].range, "crossproduct", "showPlane", false);
    const reopened = parseMathMD(updated);
    expect(reopened.diagnostics).toEqual([]);
    expect(reopened.children[0]).toMatchObject({ u: [0, 2, 1], v: [0, 1, 0], showPlane: false });
    expect(updated).toContain("  # componente y\r\n");
    expect(updated.slice(reopened.children[1].range.start.offset)).toBe(originalSecond);
    expect(updateGraphOption(updated, reopened.children[0].range, "crossproduct", "animated", false)).toBe(updated);
  });

  it("persists the calculator order and visibility in the selected crossproduct only", () => {
    const source = [
      block("crossproduct", ["id: first", "u: [2, 1, 3]", "v: [1, 4, -2]"]),
      block("crossproduct", ["id: second", "u: [1, 0, 0]", "v: [0, 0, 1]"]),
    ].join("\n\n");
    const [first] = parseMathMD(source).children;
    const changed = updateGraphOption(source, first.range, "crossproduct", "reverseOrder", true);
    const intermediate = parseMathMD(changed).children[0];
    const reopened = parseMathMD(updateGraphOption(changed, intermediate.range, "crossproduct", "showSteps", true));
    expect(reopened.diagnostics).toEqual([]);
    expect(reopened.children[0]).toMatchObject({ reverseOrder: true, showSteps: true });
    expect(reopened.children[1]).not.toHaveProperty("reverseOrder");
    expect(reopened.children[1]).not.toHaveProperty("showSteps");
  });

  it("reopens the optional determinant and shares the oriented scene after editing", () => {
    const source = block("crossproduct", ["id: cross", "u: [1, 0, 0]", "v: [0, 1, 0]"]);
    const original = parseMathMD(source);
    expect(new MathMDCore(original).getNodeData("cross").crossDeterminant).toBeUndefined();

    let changed = updateGraphOption(source, original.children[0].range, "crossproduct", "showDeterminant", true);
    const initial = new MathMDCore(parseMathMD(changed)).getNodeData("cross");
    expect(initial.crossDeterminant).toEqual({
      operation: "u × v", scene: initial.crossScene,
      rows: [{ name: "u", vector: [1, 0, 0] }, { name: "v", vector: [0, 1, 0] }],
    });
    expect(initial.crossScene.normal).toEqual([0, 0, 1]);

    changed = updateCrossProductVector(changed, parseMathMD(changed).children[0].range, "u", [1, 2, 3]);
    changed = updateCrossProductVector(changed, parseMathMD(changed).children[0].range, "v", [3, -1, 2]);
    changed = updateGraphOption(changed, parseMathMD(changed).children[0].range, "crossproduct", "reverseOrder", true);
    const reopened = parseMathMD(changed);
    expect(reopened.diagnostics).toEqual([]);
    expect(reopened.children[0]).toMatchObject({ showDeterminant: true, reverseOrder: true });
    const reversed = new MathMDCore(reopened).getNodeData("cross");
    expect(reversed.crossDeterminant).toMatchObject({
      operation: "v × u",
      rows: [{ name: "v", vector: [3, -1, 2] }, { name: "u", vector: [1, 2, 3] }],
    });
    expect(reversed.crossDeterminant.scene).toBe(reversed.crossScene);
    expect(reversed.crossScene.normal).toEqual([-7, -7, 7]);

    const disabled = updateGraphOption(changed, reopened.children[0].range, "crossproduct", "showDeterminant", false);
    expect(new MathMDCore(parseMathMD(disabled)).getNodeData("cross").crossDeterminant).toBeUndefined();
  });

  it("keeps an out-of-range determinant paired with the scene diagnostic and no coefficients", () => {
    const document = parseMathMD(block("crossproduct", [
      "id: cross", "u: [1e200, 0, 0]", "v: [0, 1e200, 0]", "showDeterminant: true",
    ]));
    const data = new MathMDCore(document).getNodeData("cross");
    expect(data.crossDeterminant.scene).toBe(data.crossScene);
    expect(data.crossDeterminant.scene.error).toBeDefined();
    expect(data.crossDeterminant.scene.normal).toBeUndefined();
  });

  it("reopens both showDeterminant and showSteps with 2x2 minor cofactors in crossStudy", () => {
    const source = block("crossproduct", [
      "id: cross", "u: [2, 3, 1]", "v: [4, 1, 5]", "showDeterminant: true", "showSteps: true",
    ]);
    const document = parseMathMD(source);
    expect(document.diagnostics).toEqual([]);
    const core = new MathMDCore(document);
    const data = core.getNodeData("cross");
    expect(data.crossDeterminant).toBeDefined();
    expect(data.crossStudy).toBeDefined();
    const step = data.crossStudy.steps.find((s: { title: string }) => s.title === "Simplificación");
    expect(step.cofactors).toHaveLength(3);
    expect(step.cofactors[1].axis).toBe("j");
    expect(step.cofactors[1].substitution).toBe("−(2 · 5 − 1 · 4)");
    expect(step.cofactors[1].coefficient).toBe("-6");
  });

  it("persists showRightHand in crossproduct and reloads cleanly", () => {
    const source = block("crossproduct", [
      "id: cross", "u: [1, 0, 0]", "v: [0, 1, 0]",
    ]);
    const document = parseMathMD(source);
    expect(document.diagnostics).toEqual([]);
    const updated = updateGraphOption(source, document.children[0].range, "crossproduct", "showRightHand", true);
    expect(updated).toContain("showRightHand: true");
    const reopened = parseMathMD(updated);
    expect(reopened.diagnostics).toEqual([]);
    expect(reopened.children[0]).toMatchObject({ showRightHand: true });

    const toggledOff = updateGraphOption(updated, reopened.children[0].range, "crossproduct", "showRightHand", false);
    expect(toggledOff).toContain("showRightHand: false");
    const disabled = parseMathMD(toggledOff);
    expect(disabled.children[0]).toMatchObject({ showRightHand: false });
  });

  it("toggles reverseOrder interactively and updates orientation analysis", () => {
    const source = block("crossproduct", [
      "id: cross", "u: [2, 3, 1]", "v: [4, 1, 5]", "showSteps: true",
    ]);
    const doc1 = parseMathMD(source);
    expect(doc1.diagnostics).toEqual([]);
    const node1 = doc1.children[0] as CrossProductNode;

    const data1 = new MathMDCore(doc1).getNodeData("cross");
    expect(data1.crossScene.normal).toEqual([14, -6, -10]);

    // Toggle reverseOrder to true
    const updated = updateGraphOption(source, node1.range, "crossproduct", "reverseOrder", true);
    expect(updated).toContain("reverseOrder: true");
    const doc2 = parseMathMD(updated);
    expect(doc2.diagnostics).toEqual([]);
    const node2 = doc2.children[0] as CrossProductNode;
    expect(node2.reverseOrder).toBe(true);

    const data2 = new MathMDCore(doc2).getNodeData("cross");
    expect(data2.crossScene.normal).toEqual([-14, 6, 10]);
  });

  it("persists showArea toggle in crossproduct and reloads cleanly", () => {
    const source = block("crossproduct", [
      "id: cross", "u: [2, 3, 1]", "v: [4, 1, 5]", "showArea: true",
    ]);
    const doc1 = parseMathMD(source);
    expect(doc1.diagnostics).toEqual([]);
    const node1 = doc1.children[0] as CrossProductNode;
    expect(node1.showArea).toBe(true);

    const updated = updateGraphOption(source, node1.range, "crossproduct", "showArea", false);
    expect(updated).toContain("showArea: false");
    const doc2 = parseMathMD(updated);
    expect(doc2.diagnostics).toEqual([]);
    const node2 = doc2.children[0] as CrossProductNode;
    expect(node2.showArea).toBe(false);

    const toggledOn = updateGraphOption(updated, node2.range, "crossproduct", "showArea", true);
    expect(toggledOn).toContain("showArea: true");
    const doc3 = parseMathMD(toggledOn);
    expect(doc3.diagnostics).toEqual([]);
    expect((doc3.children[0] as CrossProductNode).showArea).toBe(true);
  });

  it("renders area and module comparison card in cross report when showSteps is active", () => {
    const source = block("crossproduct", [
      "id: cross", "u: [2, 3, 1]", "v: [4, 1, 5]", "showSteps: true",
    ]);
    const doc = parseMathMD(source);
    expect(doc.diagnostics).toEqual([]);
    const core = new MathMDCore(doc);
    const data = core.getNodeData("cross");
    expect(data.crossScene).toBeDefined();
    expect(data.crossScene.area).toBeCloseTo(Math.sqrt(332), 6);
  });

  it("persists showPlane and showNormal in crossproduct and verifies perpendicularity and non-unique normal warning", () => {
    const source = block("crossproduct", [
      "id: cross", "u: [2, 3, 1]", "v: [4, 1, 5]",
      "showPlane: true", "showNormal: true",
    ]);
    const document = parseMathMD(source);
    const node = document.children[0] as CrossProductNode;

    // Toggle showNormal to false
    const toggled = updateGraphOption(source, node.range, "crossproduct", "showNormal", false);
    const reloaded = parseMathMD(toggled);
    const reloadedNode = reloaded.children[0] as CrossProductNode;
    expect(reloadedNode.showNormal).toBe(false);
    expect(reloadedNode.showPlane).toBe(true);

    // Toggle showPlane to false
    const toggledPlane = updateGraphOption(toggled, reloadedNode.range, "crossproduct", "showPlane", false);
    const reloadedPlane = parseMathMD(toggledPlane);
    const reloadedPlaneNode = reloadedPlane.children[0] as CrossProductNode;
    expect(reloadedPlaneNode.showPlane).toBe(false);
    expect(reloadedPlaneNode.showNormal).toBe(false);

    // Core data preparation and perpendicularity
    const core = new MathMDCore(document);
    const data = core.getNodeData("cross");
    expect(data.crossScene.normal).toEqual([14, -6, -10]);
    const dotU = 2 * 14 + 3 * (-6) + 1 * (-10);
    const dotV = 4 * 14 + 1 * (-6) + 5 * (-10);
    expect(dotU).toBe(0);
    expect(dotV).toBe(0);

    // Parallel case warning in core data
    const parSource = block("crossproduct", [
      "id: cross-par", "u: [1, 2, 3]", "v: [2, 4, 6]",
    ]);
    const parDoc = parseMathMD(parSource);
    const parCore = new MathMDCore(parDoc);
    const parData = parCore.getNodeData("cross-par");
    expect(parData.crossScene.opposite).toBeNull();
    expect(parData.crossScene.warning).toContain("no hay normal única por esos vectores");
  });

  it("verifies perpendicularity and step integration in crossStudy when showSteps is active", () => {
    const source = block("crossproduct", [
      "id: cross", "u: [2, 3, 1]", "v: [4, 1, 5]", "showSteps: true",
    ]);
    const parsedDoc = parseMathMD(source);
    const core = new MathMDCore(parsedDoc);
    const data = core.getNodeData("cross");

    expect(data.crossStudy).toBeDefined();
    expect(data.crossStudy.perpendicularity).toBeDefined();
    expect(data.crossStudy.perpendicularity.isPerpendicular).toBe(true);
    expect(data.crossStudy.perpendicularity.dotU).toBe(0);
    expect(data.crossStudy.perpendicularity.dotV).toBe(0);
    expect(data.crossStudy.perpendicularity.dotUExpr).toContain("= 0");
    expect(data.crossStudy.perpendicularity.dotVExpr).toContain("= 0");
    expect(data.crossStudy.perpendicularity.explanation).toContain("u · n = 0 y v · n = 0");

    const checkStep = data.crossStudy.steps.find((s: any) => s.title === "Comprobación");
    expect(checkStep).toBeDefined();
    expect(checkStep?.perpendicularity).toBeDefined();
    expect(checkStep?.perpendicularity?.isPerpendicular).toBe(true);
    expect(checkStep?.expression).toContain("u · n = 0");
    expect(checkStep?.expression).toContain("v · n = 0");
  });

  it("T011 MED-03.06-V: toggles and persists anticommutative and distributive options, and updates vector w", () => {
    const document = [
      "# Cross properties",
      "",
      "```crossproduct",
      "id: cross-prop",
      "u: [1, 2, 0]",
      "v: [0, 3, 1]",
      "showPlane: true",
      "showNormal: true",
      "showSteps: true",
      "```",
    ].join("\n");

    const parsed = parseMathMD(document);
    const node = parsed.children.find((c: any) => c.type === "crossproduct");
    expect(node).toBeDefined();
    if (!node) throw new Error("node not found");

    // 1. Toggle showAnticommutative
    const withAnti = updateGraphOption(document, node.range, "crossproduct", "showAnticommutative", true);
    expect(withAnti).toContain("showAnticommutative: true");
    const docWithAnti = parseMathMD(withAnti);
    const nodeWithAnti = docWithAnti.children.find((c: any) => c.type === "crossproduct");
    expect(nodeWithAnti).toBeDefined();
    if (!nodeWithAnti) throw new Error("nodeWithAnti not found");

    // 2. Toggle showDistributive
    const withDist = updateGraphOption(withAnti, nodeWithAnti.range, "crossproduct", "showDistributive", true);
    expect(withDist).toContain("showDistributive: true");
    const docWithDist = parseMathMD(withDist);
    const nodeWithDist = docWithDist.children.find((c: any) => c.type === "crossproduct");
    expect(nodeWithDist).toBeDefined();
    if (!nodeWithDist) throw new Error("nodeWithDist not found");

    // 3. Update vector w
    const withW = updateCrossProductVector(withDist, nodeWithDist.range, "w", [1, 0, 2]);
    expect(withW).toContain("w: [1,0,2]");

    // 4. Reload in core and verify crossStudy
    const reloadedDoc = parseMathMD(withW);
    const core = new MathMDCore(reloadedDoc);
    const data = core.getNodeData("cross-prop");
    expect(data.crossStudy).toBeDefined();
    expect(data.crossStudy.anticommutative).toBeDefined();
    expect(data.crossStudy.anticommutative.isNegationExact).toBe(true);
    expect(data.crossStudy.distributive).toBeDefined();
    expect(data.crossStudy.distributive.isDistributive).toBe(true);
    expect(data.crossStudy.distributive.uCrossSum).toEqual([6, -3, 1]);

    const propStep = data.crossStudy.steps.find((s: any) => s.title === "Propiedades algebraicas");
    expect(propStep).toBeDefined();
    expect(propStep.expression).toContain("v × u = −(u × v)");
    expect(propStep.anticommutative).toBeDefined();
    expect(propStep.distributive).toBeDefined();
  });

  it("T012 MED-03.06-C: toggles and persists showIdentities option, generating complete symbolic proofs in crossStudy", () => {
    const document = [
      "# Cross identity inspector",
      "",
      "```crossproduct",
      "id: cross-identities",
      "u: [1, 2, 0]",
      "v: [0, 3, 1]",
      "w: [1, 0, 2]",
      "showSteps: true",
      "```",
    ].join("\n");

    const parsed = parseMathMD(document);
    const node = parsed.children.find((c: any) => c.type === "crossproduct");
    expect(node).toBeDefined();
    if (!node) throw new Error("node not found");

    // Toggle showIdentities
    const withIdentities = updateGraphOption(document, node.range, "crossproduct", "showIdentities", true);
    expect(withIdentities).toContain("showIdentities: true");
    const docWithIdentities = parseMathMD(withIdentities);
    const nodeWithIdentities = docWithIdentities.children.find((c: any) => c.type === "crossproduct");
    expect(nodeWithIdentities).toBeDefined();
    if (!nodeWithIdentities) throw new Error("nodeWithIdentities not found");
    expect((nodeWithIdentities as CrossProductNode).showIdentities).toBe(true);

    // Reload in core and verify crossStudy identities
    const core = new MathMDCore(docWithIdentities);
    const data = core.getNodeData("cross-identities");
    expect(data.crossStudy).toBeDefined();
    expect(data.crossStudy.identities).toBeDefined();
    expect(data.crossStudy.identities.allPassed).toBe(true);
    expect(data.crossStudy.identities.proofs).toHaveLength(4);
    expect(data.crossStudy.identities.scalarWarning).toContain("No confundir con el producto escalar");

    // Check step verification
    const identityStep = data.crossStudy.steps.find((s: any) => s.title === "Inspector de identidades algebraicas");
    expect(identityStep).toBeDefined();
    expect(identityStep.identities).toBeDefined();
    expect(identityStep.identities.proofs[0].name).toBe("Anticonmutatividad");
    expect(identityStep.identities.proofs[0].passed).toBe(true);
    expect(identityStep.identities.proofs[1].name).toBe("Autoproducto / Nilpotencia");
    expect(identityStep.identities.proofs[1].passed).toBe(true);
    expect(identityStep.identities.proofs[2].name).toBe("Homogeneidad y asociatividad escalar");
    expect(identityStep.identities.proofs[2].passed).toBe(true);
    expect(identityStep.identities.proofs[3].name).toBe("Distributividad respecto a la suma vectorial");
    expect(identityStep.identities.proofs[3].passed).toBe(true);
  });

  it("T013 MED-03.07-V: toggles and persists showTriangle option, updates origin vector and validates triangle area", () => {
    const document = [
      "# Shaded triangle and parallelogram",
      "",
      "```crossproduct",
      "id: cross-tri",
      "u: [2, 0, 1]",
      "v: [0, 3, 2]",
      "showPlane: true",
      "showArea: true",
      "showSteps: true",
      "```",
    ].join("\n");

    const parsed = parseMathMD(document);
    const node = parsed.children.find((c: any) => c.type === "crossproduct");
    expect(node).toBeDefined();
    if (!node) throw new Error("node not found");

    // 1. Toggle showTriangle
    const withTriangle = updateGraphOption(document, node.range, "crossproduct", "showTriangle", true);
    expect(withTriangle).toContain("showTriangle: true");
    const docWithTri = parseMathMD(withTriangle);
    const nodeWithTri = docWithTri.children.find((c: any) => c.type === "crossproduct");
    expect(nodeWithTri).toBeDefined();
    if (!nodeWithTri) throw new Error("nodeWithTri not found");
    expect((nodeWithTri as CrossProductNode).showTriangle).toBe(true);

    // 2. Set translated origin [1, 1, 0]
    const withOrigin = updateCrossProductVector(withTriangle, nodeWithTri.range, "origin", [1, 1, 0]);
    expect(withOrigin).toContain("origin: [1,1,0]");
    const docWithOrigin = parseMathMD(withOrigin);
    const nodeWithOrigin = docWithOrigin.children.find((c: any) => c.type === "crossproduct");
    expect(nodeWithOrigin).toBeDefined();
    if (!nodeWithOrigin) throw new Error("nodeWithOrigin not found");
    expect((nodeWithOrigin as CrossProductNode).origin).toEqual([1, 1, 0]);

    // 3. Verify core data: parallelogram and triangle areas
    const core = new MathMDCore(docWithOrigin);
    const data = core.getNodeData("cross-tri");
    expect(data.crossScene).toBeDefined();
    expect(data.crossScene.area).toBeCloseTo(Math.sqrt(61), 6);
    expect(data.crossScene.triangleArea).toBeCloseTo(Math.sqrt(61) / 2, 6);
    expect(data.crossScene.triangleArea).toBe(data.crossScene.area / 2);
    expect(data.crossScene.origin).toEqual([1, 1, 0]);

    // 4. Verify crossStudy area
    expect(data.crossStudy).toBeDefined();
    expect(data.crossStudy.area).toBeDefined();
    expect(data.crossStudy.area.area).toBeCloseTo(Math.sqrt(61), 6);
    expect(data.crossStudy.area.triangleArea).toBeCloseTo(Math.sqrt(61) / 2, 6);
    expect(data.crossStudy.area.triangleFormula).toContain("1/2 · ‖u × v‖");
  });
});
