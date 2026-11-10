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
    expect(engine.setVariable("k",-1)).toContain("lote-0108");
    expect(engine.getNodeData("lote-0108").study.result).toEqual([-3,-2]);
  });
});