import { describe, it, expect } from "vitest";
import { parseMathMD } from "@mathmd/parser";
import { updateGraphOption } from "../src/graphOptionSource.js";

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
});