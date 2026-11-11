import { describe, expect, it } from "vitest";
import { parseMathMD } from "@mathmd/parser";
import { updateGraphOption } from "../src/graphOptionSource.js";
import { GraphSettingsSession } from "../src/graphSettingsSession.js";
import type { MathMDNode } from "@mathmd/ast";

const fence = String.fromCharCode(96).repeat(3);
const parametric = [
  fence + "parametric2d", "id: particula-circular",
  "x: cos(t)", "y: sin(t)", "tDomain: [0, 6.28]",
  "showTrail: true", fence,
].join("\n");
const curve = [
  fence + "curve3d", "x: cos(t)", "y: sin(t)", "z: t/3",
  "tDomain: [0, 6.28]", fence,
].join("\n");
const original = "# Animación\n\n" + parametric + "\n\n" + curve;
const nodes = (source: string) => parseMathMD(source).children;
const find = (source: string, type: string) => {
  const node = nodes(source).find(item => item.type === type);
  if (!node) throw new Error("Missing " + type);
  return node;
};
function prepare(session: GraphSettingsSession, documentId: string, content: string) {
  const scientific = nodes(content);
  return session.reconcile(documentId, content, scientific);
}
function identity(session: GraphSettingsSession, documentId: string,
  content: string, type: string) {
  const scientific = nodes(content);
  const current = session.reconcile(documentId, content, scientific);
  const node = scientific.find(item => item.type === type);
  if (!node) throw new Error("Missing " + type);
  const found = current.get(node);
  if (!found) throw new Error("Missing graph settings");
  return found;
}
function open(session: GraphSettingsSession, tab: string, content: string, type: string) {
  const value = identity(session, tab, content, type);
  expect(session.setOpen(tab, value.key, value.generation, true)).toBe(true);
  return value;
}
function write(source: string, type: "curve3d", field: string, value: boolean) {
  const node = find(source, type);
  return updateGraphOption(source, node.range, type, field, value);
}

describe("VIS-12 graph settings disclosure is session-only and tab-scoped", () => {
  it("independent identical documents, identical IDs, rename and tab switching", () => {
    const session = new GraphSettingsSession();
    const a = identity(session, "tab-A", original, "curve3d");
    session.setOpen("tab-A", a.key, a.generation, true);
    const b = identity(session, "tab-B", original, "parametric2d");
    expect(b.open).toBe(false);
    expect(identity(session, "tab-B", original, "curve3d").open).toBe(false);
    open(session, "tab-B", original, "parametric2d");
    // Filename is not part of identity: rename leaves both tabs unchanged.
    expect(identity(session, "tab-A", original, "curve3d").open).toBe(true);
    expect(identity(session, "tab-A", original, "parametric2d").open).toBe(false);
    expect(identity(session, "tab-B", original, "parametric2d").open).toBe(true);
    expect(identity(session, "tab-B", original, "curve3d").open).toBe(false);
    expect(original).not.toContain("graph-settings");
  });

  it("implicit curve stays open across prose offsets and two consecutive saved options", () => {
    const session = new GraphSettingsSession();
    const initial = open(session, "tab-A", original, "curve3d");
    let source = "Texto agregado antes de los bloques.\n\n" + original;
    let current = identity(session, "tab-A", source, "curve3d");
    expect(current).toMatchObject({ key: initial.key, open: true });

    source = write(source, "curve3d", "showLegend", true);
    current = identity(session, "tab-A", source, "curve3d");
    expect(current.key).toBe(initial.key);
    expect(current.open).toBe(true);
    expect(source.split(fence + "curve3d")[1]).toContain("showLegend: true");

    source = write(source, "curve3d", "showLegend", false);
    current = identity(session, "tab-A", source, "curve3d");
    expect(current).toMatchObject({ key: initial.key, open: true });
    expect(source.split(fence + "curve3d")[1]).toContain("showLegend: false");
    expect(source.split(fence + "parametric2d")[1].split(fence)[0])
      .not.toContain("showLegend");

    // Simulates a user closing via keyboard before a subsequent edit.
    session.setOpen("tab-A", current.key, current.generation, false);
    expect(identity(session, "tab-A", "Prólogo editado.\n\n" + source, "curve3d").open)
      .toBe(false);
  });

  it("a new graph inserted before an implicit curve does not steal its disclosure", () => {
    const session = new GraphSettingsSession();
    const originalKey = open(session, "A", original, "curve3d").key;
    const extra = [
      fence + "surface3d", "equation: x^2+y^2",
      "xDomain: [-2, 2]", "yDomain: [-2, 2]", fence,
    ].join("\n");
    const updated = original.replace(curve, extra + "\n\n" + curve);
    const value = identity(session, "A", updated, "curve3d");
    expect(value.key).toBe(originalKey);
    expect(value.open).toBe(true);
    expect(identity(session, "A", updated, "surface3d").open).toBe(false);
  });

  it("replacement at same source offset starts closed; deletion drops old state", () => {
    const session = new GraphSettingsSession();
    const old = open(session, "A", original, "curve3d");
    const replacement = curve.replace("cos(t)", "t^2").replace("sin(t)", "2*t");
    const revised = original.replace(curve, replacement);
    const next = identity(session, "A", revised, "curve3d");
    expect(next.open).toBe(false);
    expect(next.key).not.toBe(old.key);
    const erased = original.replace(curve, "");
    prepare(session, "A", erased);
    expect(identity(session, "A", original, "curve3d").open).toBe(false);
  });

  it("ambiguous implicit duplicates cannot inherit a previously open panel", () => {
    const session = new GraphSettingsSession();
    const old = open(session, "A", original, "curve3d");
    const duplicate = original + "\n\n" + curve;
    const matches = prepare(session, "A", duplicate);
    const curves = [...matches.entries()].filter(([node]) => node.type === "curve3d");
    expect(curves).toHaveLength(2);
    expect(curves.every(([, value]) => !value.open && value.key !== old.key)).toBe(true);
  });

  it("stale toggles cannot overwrite new generation or other document", () => {
    const session = new GraphSettingsSession();
    const a = open(session, "A", original, "curve3d");
    const b = open(session, "B", original, "parametric2d");
    const nextA = identity(session, "A", "Prólogo\n\n" + original, "curve3d");
    expect(nextA.open).toBe(true);
    expect(session.setOpen("A", a.key, a.generation, false)).toBe(false);
    expect(session.setOpen("A", b.key, b.generation, false)).toBe(false);
    expect(identity(session, "A", original, "curve3d").open).toBe(true);
    expect(identity(session, "B", original, "parametric2d").open).toBe(true);
  });

  it("closing a tab cleans memory, and reopening a file starts closed", () => {
    const session = new GraphSettingsSession();
    open(session, "tab-A", original, "curve3d");
    open(session, "tab-B", original, "parametric2d");
    session.removeDocument("tab-A");
    expect(identity(session, "tab-C", original, "curve3d").open).toBe(false);
    expect(identity(session, "tab-B", original, "parametric2d").open).toBe(true);
    session.prune(new Set(["tab-C"]));
    expect(identity(session, "tab-B", original, "parametric2d").open).toBe(false);
  });
});
