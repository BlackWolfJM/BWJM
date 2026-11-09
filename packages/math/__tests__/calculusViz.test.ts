import { describe, it, expect } from "vitest";
import { computeCalculusViz } from "../src/calculusViz.js";

const base = { domain: [0, 2] as [number, number], samples: 140 };
describe("ten scientific graph insertion methods", () => {
  it("01: integrates the area between vertical curves", () => {
    const result = computeCalculusViz({...base,mode:"area-dx",f:"2*x",g:"x^2"});
    expect(result.value).toBeCloseTo(4/3,4);
    expect(result.polygons.length).toBeGreaterThan(0);
    expect(result.guides.length).toBeGreaterThan(0);
  });
  it("02: integrates the area with horizontal slices", () => {
    const result = computeCalculusViz({...base,mode:"area-dy",f:"y^2",g:"2*y"});
    expect(result.value).toBeCloseTo(4/3,4);
    expect(result.curves.length).toBeGreaterThan(0);
  });
  it("03: separates crossing curves into different colored regions", () => {
    const result = computeCalculusViz({mode:"area-pieces",domain:[-1,1],f:"x",g:"x^3"});
    expect(result.value).toBeCloseTo(0.5,3);
    expect(result.polygons.length).toBeGreaterThanOrEqual(2);
  });
  it("04: evaluates signed area of one cycloid arch", () => {
    const result = computeCalculusViz({mode:"area-parametric",domain:[0,2*Math.PI],
      paramX:"t-sin(t)",paramY:"1-cos(t)",samples:240});
    expect(result.value).toBeCloseTo(3*Math.PI,1);
    expect(result.warnings.some(w=>w.includes("firmado"))).toBe(true);
  });
  it("05: evaluates the polar area of a cardioid", () => {
    const result = computeCalculusViz({mode:"area-polar",domain:[0,2*Math.PI],f:"1+cos(theta)",g:"0"});
    expect(result.value).toBeCloseTo(1.5*Math.PI,3);
    expect(result.polygons).toHaveLength(1);
  });
  it("06: integrates Type I and Type II equivalent simple regions", () => {
    const typeI=computeCalculusViz({mode:"double-region",domain:[0,1],
      f:"x^2",g:"x",integrand:"1",order:"dydx"});
    const typeII=computeCalculusViz({mode:"double-region",domain:[0,1],
      f:"y",g:"sqrt(y)",integrand:"1",order:"dxdy"});
    expect(typeI.value).toBeCloseTo(1/6,2);
    expect(typeII.value).toBeCloseTo(1/6,2);
  });
  it("07: compares two entered orders of the same integral", () => {
    const out=computeCalculusViz({mode:"change-order",domain:[0,1],
      f:"x^2",g:"x",integrand:"1",order:"dydx",
      reverseLower:"y",reverseUpper:"sqrt(y)",reverseDomain:[0,1]});
    expect(out.comparison?.value).toBeCloseTo(out.value,2);
    expect(out.polygons).toHaveLength(2);
  });
  it("08: includes the polar Jacobian r for a disk", () => {
    const out=computeCalculusViz({mode:"double-polar",domain:[0,2*Math.PI],
      f:"1",g:"0",integrand:"x^2+y^2"});
    expect(out.value).toBeCloseTo(Math.PI/2,2);
  });
  it("09: creates a 3D mesh and disk-method volume", () => {
    const out=computeCalculusViz({mode:"revolution",domain:[0,1],
      f:"x",g:"0",axis:"x",method:"disks",axisOffset:0});
    expect(out.value).toBeCloseTo(Math.PI/3,3);
    expect(out.mesh?.x.length).toBeGreaterThan(10);
  });
  it("10: compares circulation and interior curl for the unit disk", () => {
    const out=computeCalculusViz({mode:"green",domain:[0,2*Math.PI],
      paramX:"cos(t)",paramY:"sin(t)",fieldP:"-y/2",fieldQ:"x/2",samples:180});
    expect(out.value).toBeCloseTo(Math.PI,1);
    expect(out.comparison).toBeDefined();
    expect(out.comparison!.difference).toBeLessThan(0.15);
    expect(out.polygons).toHaveLength(1);
  });
  it("rejects negative radii instead of silently drawing polar loops incorrectly", () => {
    expect(()=>computeCalculusViz({mode:"area-polar",domain:[0,Math.PI],f:"cos(theta)",g:"0"}))
      .toThrow(/radios/i);
  });
  it("does not claim an exact volume when shells overlap the vertical axis", () => {
    const result=computeCalculusViz({mode:"revolution",domain:[-1,1],f:"x^2+1",g:"0",axis:"y",method:"shells"});
    expect(Number.isNaN(result.value)).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/solapan/i);
  });
  it("warns for an open boundary instead of applying Green", () => {
    const result=computeCalculusViz({mode:"green",domain:[0,Math.PI],
      paramX:"cos(t)",paramY:"sin(t)",fieldP:"-y",fieldQ:"x"});
    expect(Number.isNaN(result.value)).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/no cierra/i);
  });
  it("warns if the two descriptions of the region disagree", () => {
    const result=computeCalculusViz({mode:"change-order",domain:[0,1],
      f:"0",g:"x",integrand:"1",reverseLower:"0",reverseUpper:"1",
      reverseDomain:[0,1]});
    expect(result.warnings.join(" ")).toMatch(/no coinciden/i);
  });
});
