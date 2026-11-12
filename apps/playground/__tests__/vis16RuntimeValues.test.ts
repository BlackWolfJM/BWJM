import { describe, expect, it } from "vitest";
import { MathMDCore } from "@mathmd/core";
import { parseMathMD } from "@mathmd/parser";
import { captureDocumentRuntime, restoreDocumentRuntime } from "../src/documentRuntimeValues.js";

const fence = String.fromCharCode(96).repeat(3);
const source = (aDefault: number, bDefault: number, aMax = 10) => [
  fence + "slider", "name: a", "min: 0", "max: " + aMax,
  "step: 1", "default: " + aDefault, fence, "",
  fence + "plot2d", "id: misma", "equation: a*x+b", "x: [-1,1]",
  "paramControls: " + JSON.stringify({
    enabled: true, animate: false,
    parameters: [{ name: "b", min: -5, max: 5, step: 1, default: bDefault }],
  }),
  fence,
].join("\n");

function graph(core: MathMDCore) {
  const points = core.getNodeData("misma").points as number[][];
  return points[Math.floor(points.length / 2)][1];
}

describe("VIS-16: document-scoped runtime snapshots", () => {
  it("restores the correct graph data for tabs that share variable names and block IDs", () => {
    const docA = parseMathMD(source(1, 0));
    const docB = parseMathMD(source(2, -1));
    expect(docA.diagnostics.filter(d => d.severity === "error")).toEqual([]);
    expect(docB.diagnostics.filter(d => d.severity === "error")).toEqual([]);
    const a = new MathMDCore(docA);
    a.setVariable("a", 4);
    a.setGraphParameter("misma", "b", 5);
    const snapshots = new Map([["tab-A", captureDocumentRuntime(a, docA)]]);
    const b = new MathMDCore(docB);
    restoreDocumentRuntime(b, docB, snapshots.get("tab-B"));
    expect(b.getVariable("a")).toBe(2);
    expect(b.getGraphParameters("misma").b).toBe(-1);
    expect(graph(b)).toBeCloseTo(-1);
    b.setVariable("a", 6);
    b.setGraphParameter("misma", "b", -2);
    snapshots.set("tab-B", captureDocumentRuntime(b, docB));

    const aReturn = new MathMDCore(docA);
    restoreDocumentRuntime(aReturn, docA, snapshots.get("tab-A"));
    expect(aReturn.getVariable("a")).toBe(4);
    expect(aReturn.getGraphParameters("misma").b).toBe(5);
    expect(graph(aReturn)).toBeCloseTo(5);

    const bReturn = new MathMDCore(docB);
    restoreDocumentRuntime(bReturn, docB, snapshots.get("tab-B"));
    expect(bReturn.getVariable("a")).toBe(6);
    expect(bReturn.getGraphParameters("misma").b).toBe(-2);
    expect(graph(bReturn)).toBeCloseTo(-2);
  });

  it("rejects stale slider values when the new Markdown range is narrower", () => {
    const original = parseMathMD(source(1, 0));
    const core = new MathMDCore(original);
    core.setVariable("a", 4);
    core.setGraphParameter("misma", "b", 5);
    const saved = captureDocumentRuntime(core, original);
    const narrowed = parseMathMD(source(1, 0, 3));
    const restored = new MathMDCore(narrowed);
    restoreDocumentRuntime(restored, narrowed, saved);
    expect(restored.getVariable("a")).toBe(1);
    expect(restored.getGraphParameters("misma").b).toBe(5);
    expect(graph(restored)).toBeCloseTo(5);
  });

  it("removes stale graph and variable values when declarations disappear", () => {
    const oldDoc = parseMathMD(source(1, 0));
    const first = new MathMDCore(oldDoc);
    first.setVariable("a", 4);
    first.setGraphParameter("misma", "b", 5);
    const changed = parseMathMD([fence + "plot2d", "id: otra",
      "equation: x+1", "x: [-1,1]", fence].join("\n"));
    const changedCore = new MathMDCore(changed);
    restoreDocumentRuntime(changedCore, changed, captureDocumentRuntime(first, oldDoc));
    const trimmed = captureDocumentRuntime(changedCore, changed);
    expect(trimmed.variables.a).toBeUndefined();
    expect(trimmed.parameters.misma).toBeUndefined();
    const reAdded = new MathMDCore(oldDoc);
    restoreDocumentRuntime(reAdded, oldDoc, trimmed);
    expect(reAdded.getVariable("a")).toBe(1);
    expect(reAdded.getGraphParameters("misma").b).toBe(0);
  });

  it("keeps two independent timelines and validates the new time domain", () => {
    const timeDocument = parseMathMD([
      fence + "timeline", "name: t", "domain: [0,6.28]", "default: 0",
      fence,
    ].join("\n"));
    const a = new MathMDCore(timeDocument);
    const b = new MathMDCore(timeDocument);
    a.setVariable("t", 1.25);
    b.setVariable("t", 5.75);
    const snapshotA = captureDocumentRuntime(a, timeDocument);
    const snapshotB = captureDocumentRuntime(b, timeDocument);
    const reloadA = new MathMDCore(timeDocument), reloadB = new MathMDCore(timeDocument);
    restoreDocumentRuntime(reloadA, timeDocument, snapshotA);
    restoreDocumentRuntime(reloadB, timeDocument, snapshotB);
    expect(reloadA.getVariable("t")).toBe(1.25);
    expect(reloadB.getVariable("t")).toBe(5.75);

    const shorter = parseMathMD([
      fence + "timeline", "name: t", "domain: [0,2]", "default: 0.5", fence,
    ].join("\n"));
    const invalidTime = new MathMDCore(shorter);
    restoreDocumentRuntime(invalidTime, shorter, snapshotB);
    expect(invalidTime.getVariable("t")).toBe(0.5);
  });

  it("restores a checkbox only if its numeric state is Boolean", () => {
    const doc = parseMathMD([
      fence + "checkbox", "name: enabled", "default: false", fence,
    ].join("\n"));
    const core = new MathMDCore(doc);
    restoreDocumentRuntime(core, doc, { variables: { enabled: 1 }, parameters: {} });
    expect(core.getVariable("enabled")).toBe(1);
    restoreDocumentRuntime(core, doc, { variables: { enabled: 9 }, parameters: {} });
    expect(core.getVariable("enabled")).toBe(1);
  });
});
