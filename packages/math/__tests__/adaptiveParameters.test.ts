import {describe,it,expect} from "vitest";
import {extractFreeParameters} from "../src/mathEngine.js";

describe("safe symbolic coefficient discovery",()=>{
  it("detects coefficients without confusing function names, coordinates or constants",()=>{
    expect(extractFreeParameters(["a*sin(b*x)+c*cos(y)+pi"])).toEqual(["a","b","c"]);
  });
  it("extracts parameters of a spatial curve, omitting the time variable",()=>{
    expect(extractFreeParameters(["R*cos(t)","R*sin(t)","c*t"])).toEqual(["R","c"]);
  });
  it("does not invent a parameter for coordinate-only expressions",()=>{
    expect(extractFreeParameters(["sin(sqrt(x^2+y^2))","exp(t)"])).toEqual([]);
  });
  it("uses the existing safe math expression allowlist",()=>{
    expect(()=>extractFreeParameters(["x.constructor"])).toThrow();
    expect(()=>extractFreeParameters(["eval(x)"])).toThrow();
  });
});
