import { describe, expect, it } from "vitest";
import { parseMathMD } from "@mathmd/parser";
import { matchScientificNodes } from "../src/scientificMountIdentity.js";

const fence = String.fromCharCode(96).repeat(3);
const curve = [
  fence + "curve3d", "x: cos(t)", "y: sin(t)", "z: t/3",
  "tDomain: [0, 6.28]", fence,
].join("\n");
const curveWithOption = (key: string, value: boolean) => [
  fence + "curve3d", "x: cos(t)", "y: sin(t)", "z: t/3",
  "tDomain: [0, 6.28]", key + ": " + value, fence,
].join("\n");
const parametric = [
  fence + "parametric2d", "id: particula-circular",
  "x: cos(t)", "y: sin(t)", "tDomain: [0, 6.28]", fence,
].join("\n");

function match(before: string, after: string) {
  const beforeDoc = parseMathMD(before);
  const afterDoc = parseMathMD(after);
  const matches = matchScientificNodes(before, beforeDoc.children, after, afterDoc.children);
  return { previous: beforeDoc.children, next: afterDoc.children, matches };
}

describe("VIS-11: stable scientific mount identity", () => {
  it("preserves an explicit and an implicit graph when prose is inserted above", () => {
    const before = "# Animación\n\n" + parametric + "\n\n" + curve;
    const after = "# Animación\n\nTexto agregado sin cambiar las gráficas.\n\n" + parametric + "\n\n" + curve;
    const result = match(before, after);
    expect(result.matches.size).toBe(2);
    expect(result.matches.get(result.next[0])).toBe(result.previous[0]);
    expect(result.matches.get(result.next[1])).toBe(result.previous[1]);
  });

  it("matches two consecutive option edits to one implicit curve despite changed IDs and offsets", () => {
    const before = "Texto inicial.\n\n" + parametric + "\n\n" + curve;
    const first = "Nuevo texto.\n\n" + parametric + "\n\n" + curveWithOption("showLegend", true);
    const second = "Nuevo texto.\n\n" + parametric + "\n\n" + [
      fence + "curve3d", "x: cos(t)", "y: sin(t)", "z: t/3",
      "tDomain: [0, 6.28]", "showLegend: true", "showTNB: true", fence,
    ].join("\n");
    const firstMatch = match(before, first);
    expect(firstMatch.matches.get(firstMatch.next[1])).toBe(firstMatch.previous[1]);
    const nextMatch = match(first, second);
    expect(nextMatch.matches.get(nextMatch.next[1])).toBe(nextMatch.previous[1]);
    expect(nextMatch.matches.get(nextMatch.next[0])).toBe(nextMatch.previous[0]);
  });

  it("does not match a deleted curve, and a reinserted one needs a fresh mount", () => {
    const before = parametric + "\n\n" + curve;
    const without = parametric;
    const removed = match(before, without);
    expect(removed.matches.size).toBe(1);
    expect(removed.matches.get(removed.next[0])).toBe(removed.previous[0]);
    const inserted = match(without, before);
    expect(inserted.matches.size).toBe(1);
    expect(inserted.matches.get(inserted.next[0])).toBe(inserted.previous[0]);
  });

  it("explicit IDs survive edits but are matched only if unique", () => {
    const before = "Párrafo\n\n" + parametric;
    const after = "Párrafo cambiado\n\n" + parametric.replace("showTrail", "showTrail");
    expect(match(before, after).matches.size).toBe(1);
    const duplicated = parametric + "\n\n" + parametric;
    // The parser rejects the second duplicate explicit ID; the remaining valid\n    // node can safely retain its own mount.\n    expect(match(duplicated, duplicated).matches.size).toBe(1);
  });

  it("ambiguous duplicate implicit graphs do not steal each other's mount", () => {
    const duplicates = curve + "\n\n" + curve;
    const modified = curveWithOption("showLegend", true) + "\n\n" +
      curveWithOption("showLegend", false);
    const result = match(duplicates, modified);
    expect(result.matches.size).toBe(0);
  });
});
