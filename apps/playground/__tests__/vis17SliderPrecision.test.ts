import { describe, expect, it } from "vitest";
import { formatSliderValue, nextSliderValue, sliderDecimalPlaces } from "../src/sliderPrecision.js";

describe("VIS-17: native range precision and formatting", () => {
  it("distinguishes consecutive thousandths without float artefacts", () => {
    expect(sliderDecimalPlaces(0, .001)).toBe(3);
    expect(formatSliderValue(0, 0, .001)).toBe("0.000");
    expect(formatSliderValue(.001, 0, .001)).toBe("0.001");
    expect(formatSliderValue(.002, 0, .001)).toBe("0.002");
    expect(formatSliderValue(.001 + .002, 0, .001)).toBe("0.003");
  });

  it("includes the range base when selecting the displayed decimals", () => {
    expect(sliderDecimalPlaces(.0005, .001)).toBe(4);
    expect(formatSliderValue(.0005, .0005, .001)).toBe("0.0005");
    expect(formatSliderValue(nextSliderValue(.0005, .0005, .0095, .001), .0005, .001))
      .toBe("0.0015");
    expect(nextSliderValue(.0095, .0005, .0095, .001)).toBe(.0005);
  });

  it("handles exponent-form steps and removes precision residues", () => {
    expect(sliderDecimalPlaces(0, 1e-7)).toBe(7);
    let value = 0;
    for (let i = 1; i <= 1000; i++) {
      value = nextSliderValue(value, 0, 1e-3, 1e-7);
      expect(formatSliderValue(value, 0, 1e-7)).toBe((i * 1e-7).toFixed(7));
    }
    expect(formatSliderValue(1.5e-7, .5e-7, 1e-7)).toBe("0.00000015");
    expect(formatSliderValue(-1e-15, 0, .001)).toBe("0.000");
  });

  it("keeps integer ranges readable and wraps at max", () => {
    expect(formatSliderValue(3, 0, 1)).toBe("3");
    expect(nextSliderValue(3, 0, 4, 1)).toBe(4);
    expect(nextSliderValue(4, 0, 4, 1)).toBe(0);
    expect(nextSliderValue(1, 0, 4, 0)).toBe(0);
  });
});
