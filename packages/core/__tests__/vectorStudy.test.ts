import { describe, expect, it } from "vitest";
import { parseMathMD } from "@mathmd/parser";
import { MathMDCore } from "../src/index.js";

const fence = "```";
const block = (type:string, lines:string[])=>[fence+type,...lines,fence].join("\n");
describe("reactive scientific vector documents", () => {
  it("updates k and the result after a slider changes", () => {
    const doc = parseMathMD([
      block("slider",["name: k","min: -3","max: 3","step: 0.5","default: 2"]),
      block("vector2d",["id: live-scale","origin: [0,0]","vector: [3,2]",
        "mode: scale","factor: k"]),
    ].join("\n\n"));
    expect(doc.diagnostics).toHaveLength(0);
    const core = new MathMDCore(doc);
    expect(core.getNodeData("live-scale").study.result).toEqual([6,4]);
    expect(core.setVariable("k",-1)).toContain("live-scale");
    expect(core.getNodeData("live-scale").study.result).toEqual([-3,-2]);
  });
  it("keeps legacy vectors and 3D results intact", () => {
    const doc = parseMathMD([
      block("vector2d",["id: legacy","origin: [1,1]","vector: [2,3]"]),
      block("vector3d",["id: study3d","origin: [0,0,0]","vector: [1,2,3]",
        "mode: sum","other: [4,5,6]"])
    ].join("\n\n"));
    expect(doc.diagnostics).toHaveLength(0);
    const core = new MathMDCore(doc);
    expect(core.getNodeData("legacy").end).toEqual([3,4]);
    expect(core.getNodeData("legacy").study).toBeUndefined();
    expect(core.getNodeData("study3d").study.result).toEqual([5,7,9]);
  });
  it("returns explicit error when a referenced slider is absent", () => {
    const doc = parseMathMD(block("vector2d",[
      "id: bad-reference","origin: [0,0]","vector: [2,3]","mode: scale","factor: z"]));
    const data = new MathMDCore(doc).getNodeData("bad-reference");
    expect(data.error).toMatch(/Parámetro no declarado: z/);
  });
});