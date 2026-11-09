import {describe,it,expect} from "vitest";
import {parseMathMD} from "@mathmd/parser";
import {
  supportsAdaptiveParameters,discoverGraphParameters,writeGraphParameterControls,
  validateGraphControlSettings,snapGraphParameter,autoParameterValue,
} from "../src/adaptiveGraphParameters.js";

const fence=String.fromCharCode(96).repeat(3);
const spec=(type:string,expressions:string[])=>
  [fence+type,...expressions,fence].join("\n");
const graph=(type:string,lines:string[])=>{
  const result=parseMathMD(spec(type,lines));
  expect(result.diagnostics.filter(x=>x.severity==="error")).toEqual([]);
  const node=result.children[0];
  if(!supportsAdaptiveParameters(node))throw Error("Expected parameterized graph");
  return node;
};
describe("adaptive per-chart sliders",()=>{
  it("derives coefficients in a plane function and a 3D surface",()=>{
    expect(discoverGraphParameters(graph("plot2d",["equation: a*sin(b*x)","x: [-3, 3]"]))
      .map(p=>p.name)).toEqual(["a","b"]);
    expect(discoverGraphParameters(graph("surface3d",[
      "equation: a*sin(b*x)*cos(c*y)","x: [-2, 2]","y: [-2, 2]"]))
      .map(p=>p.name)).toEqual(["a","b","c"]);
  });
  it("keeps time t, space x y and functions outside detected controls",()=>{
    expect(discoverGraphParameters(graph("curve3d",[
      "x: R*cos(t)","y: R*sin(t)","z: h*t","tDomain: [0, 6.28]"]))
      .map(p=>p.name)).toEqual(["R","h"]);
  });
  it("offers integer integration resolution for calculus visualization",()=>{
    const node=graph("calculusviz",[
      "mode: area-dx","domain: [0, 1]","f: x","g: 0"]);
    const params=discoverGraphParameters(node);
    expect(params).toEqual([{name:"n",min:30,max:300,step:10,default:120,integer:true}]);
    expect(autoParameterValue(params[0],2000)).toEqual(expect.any(Number));
    expect(Number.isInteger(autoParameterValue(params[0],2000))).toBe(true);
  });
  it("serializes a valid configuration into its original .bwjm fence",()=>{
    const markdown=spec("plot2d",["equation: a*x","x: [-2, 2]"]);
    const node=graph("plot2d",["equation: a*x","x: [-2, 2]"]);
    const config={enabled:true,animate:false,parameters:[
      {name:"a",min:-3,max:3,step:0.1,default:1}]};
    const next=writeGraphParameterControls(markdown,node.range,"plot2d",config);
    expect(next).toContain("paramControls:");
    const parsed=parseMathMD(next);
    expect(parsed.diagnostics.filter(d=>d.severity==="error")).toEqual([]);
    expect(parsed.children[0]).toMatchObject({type:"plot2d",paramControls:config});
  });
  it("does not alter neighboring fences and supports disabling without losing settings",()=>{
    const a=spec("plot2d",["equation: a*x","x: [-1, 1]"]);
    const b=spec("plot2d",["equation: x^2","x: [-1, 1]"]);
    const markdown=a+"\n\n"+b;
    const doc=parseMathMD(markdown);
    const node=doc.children[0];
    if(!supportsAdaptiveParameters(node))throw Error("wrong graph");
    const edited=writeGraphParameterControls(markdown,node.range,"plot2d",{
      enabled:false,parameters:[{name:"a",min:-3,max:3,step:0.1,default:1}],
    });
    expect(edited).toContain(b);
    expect(parseMathMD(edited).children).toHaveLength(2);
  });
  it("rejects negative widths, duplicate controls and non-finite boundaries",()=>{
    expect(validateGraphControlSettings({enabled:true,parameters:[
      {name:"a",min:5,max:1,step:.1,default:2}]})).not.toBeNull();
    expect(validateGraphControlSettings({enabled:true,parameters:[
      {name:"a",min:0,max:5,step:1,default:1},
      {name:"a",min:0,max:5,step:1,default:1}]})).not.toBeNull();
    expect(validateGraphControlSettings({enabled:true,parameters:[
      {name:"n",min:30,max:300,step:10,default:50.5,integer:true}]})).not.toBeNull();
    expect(snapGraphParameter(0.26,{name:"a",min:0,max:1,step:.1,default:0})).toBe(.3);
  });
});
