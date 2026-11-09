import {describe,it,expect} from "vitest";
import {parseMathMD} from "@mathmd/parser";
import {MathMDCore} from "../src/index.js";

const fence=String.fromCharCode(96).repeat(3);
const config=(defaultValue:number)=>JSON.stringify({
  enabled:true,animate:false,parameters:[{
    name:"a",min:-5,max:5,step:0.1,default:defaultValue,
  }],
});
function plot(defaultValue:number) {
  return [fence+"plot2d","equation: a*x",
    "x: [-1, 1]","paramControls: "+config(defaultValue),fence].join("\n");
}
describe("parameter scope belongs to one graph",()=>{
  it("keeps the same letter a independent across two graphs",()=>{
    const doc=parseMathMD(plot(1)+"\n\n"+plot(3));
    expect(doc.diagnostics.filter(d=>d.severity==="error")).toEqual([]);
    const core=new MathMDCore(doc);
    const [first,second]=doc.children;
    expect(core.getGraphParameters(first.id).a).toBe(1);
    expect(core.getGraphParameters(second.id).a).toBe(3);
    const originalSecond=core.getNodeData(second.id);
    const originalFirst=core.getNodeData(first.id);
    expect(core.setGraphParameter(first.id,"a",4)).toBe(true);
    expect(core.getGraphParameters(first.id).a).toBe(4);
    expect(core.getGraphParameters(second.id).a).toBe(3);
    expect(core.getNodeData(second.id)).toBe(originalSecond);
    expect(core.getNodeData(first.id)).not.toBe(originalFirst);
    expect(core.getNodeData(first.id).points.at(-1)[1]).toBeCloseTo(4,6);
    expect(core.getNodeData(second.id).points.at(-1)[1]).toBeCloseTo(3,6);
  });
  it("rejects updates that exceed the bounds or target other variables",()=>{
    const doc=parseMathMD(plot(1));
    const core=new MathMDCore(doc);
    const id=doc.children[0].id;
    expect(core.setGraphParameter(id,"a",100)).toBe(false);
    expect(core.setGraphParameter(id,"x",2)).toBe(false);
    expect(core.setGraphParameter(id,"a",Number.NaN)).toBe(false);
    expect(core.getGraphParameters(id).a).toBe(1);
  });
  it("does not make graph-local parameters into global document variables",()=>{
    const doc=parseMathMD(plot(2));
    const core=new MathMDCore(doc);
    expect(core.getVariable("a")).toBeUndefined();
    expect(core.getGraphScope(doc.children[0].id).a).toBe(2);
  });
  it("previews undeclared coefficients using a provisional value without crashing",()=>{
    const doc=parseMathMD([fence+"plot2d","equation: k*x","x: [-1, 1]",fence].join("\n"));
    const core=new MathMDCore(doc);
    expect(core.getVariable("k")).toBeUndefined();
    expect(core.getGraphScope(doc.children[0].id).k).toBe(1);
    expect(core.getNodeData(doc.children[0].id).points.at(-1)[1]).toBeCloseTo(1,6);
  });
  it("local controls take precedence over global sliders for that graph only",()=>{
    const global=[fence+"slider","name: a","min: 0","max: 10","default: 8",fence].join("\n");
    const doc=parseMathMD(global+"\n\n"+plot(2));
    const core=new MathMDCore(doc);
    const graph=doc.children[1];
    expect(core.getVariable("a")).toBe(8);
    expect(core.getGraphScope(graph.id).a).toBe(2);
    core.setVariable("a",9);
    expect(core.getGraphScope(graph.id).a).toBe(2);
  });
});
