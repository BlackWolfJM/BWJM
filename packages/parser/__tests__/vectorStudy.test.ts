import { describe, expect, it } from "vitest";
import { parseMathMD } from "../src/index.js";

function block(type: string, values: string[]): string {
  const fence = "```";
  return [fence+type,...values,fence].join("\n");
}
describe("vector study .bwjm grammar", () => {
  it("parses R2 and R3 with optional educational modes, preserving old blocks", () => {
    const doc = parseMathMD([
      block("vector2d",["origin: [0,0]","vector: [1,2]",
        "mode: sum","other: [3,4]","showSteps: true"]),
      block("vector3d",["origin: [0,0,0]","vector: [1,2,3]",
        "mode: combination","other: [2,4,6]","factor: k","secondFactor: 1"]),
      block("vector2d",["origin: [0,0]","vector: [1,2]"]),
    ].join("\n\n"));
    expect(doc.diagnostics).toHaveLength(0);
    expect(doc.children).toHaveLength(3);
    const [a,b,c] = doc.children;
    expect(a.type).toBe("vector2d");
    if(a.type==="vector2d") {
      expect(a.mode).toBe("sum");
      expect(a.other).toEqual([3,4]);
      expect(a.showSteps).toBe(true);
    }
    expect(b.type).toBe("vector3d");
    if(b.type==="vector3d") expect(b.factor).toBe("k");
    expect(c.type).toBe("vector2d");
    if(c.type==="vector2d") expect(c.mode).toBeUndefined();
  });
  it("rejects malformed vectors, unknown modes and unsafe scalar expressions", () => {
    for(const extra of [
      ["mode: magic"],["mode: sum","other: [1,2,3]"],
      ["mode: scale","factor: process.exit"],
    ]) {
      const doc = parseMathMD(block("vector2d",["vector: [1,2]",...extra]));
      expect(doc.diagnostics.some(d=>d.severity==="error")).toBe(true);
    }
  });
});