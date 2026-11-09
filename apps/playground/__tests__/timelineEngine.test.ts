import { describe, expect, it } from "vitest";
import { addTimeMarker, advanceTime, fractionTime, sequenceFrames, timeFraction } from "../src/timelineEngine.js";

const domain = [0, 10] as const;
describe("10 animation controls: timeline math", () => {
  it("advances by elapsed seconds and playback speed", () => {
    expect(advanceTime(3, 0.2, 2, domain, false).time).toBeCloseTo(3.4);
  });
  it("pauses precisely at the endpoint when repeat is disabled", () => {
    expect(advanceTime(9.95, 0.2, 1, domain, false)).toEqual({ time: 10, finished: true });
  });
  it("repeats within the selected loop segment", () => {
    expect(advanceTime(7.95, 0.1, 1, domain, true, 1, [3, 8]).time).toBeCloseTo(3.05);
  });
  it("supports reverse play and the lower boundary", () => {
    expect(advanceTime(3.02, 0.1, 1, domain, false, -1, [3, 8])).toEqual({ time: 3, finished: true });
  });
  it("maps a single progress value across different time scales", () => {
    expect(timeFraction(5, domain)).toBe(0.5);
    expect(fractionTime(0.5, [-2, 2])).toBe(0);
  });
  it("creates reproducible frames from multiple timelines", () => {
    const sample = sequenceFrames([
      { name: "t", domain: [0, 10] },
      { name: "theta", domain: [0, 6] },
    ] as never, 3, [0.25, 0.75]);
    expect(sample[1].values.t).toBe(5);
    expect(sample[1].values.theta).toBe(3);
  });
  it("stores time annotations inside the actual .bwjm source", () => {
    const fence = String.fromCharCode(96).repeat(3);
    const text = fence + "timeline\nname: t\ndomain: [0, 10]\n" + fence;
    const first = addTimeMarker(text, "t", { at: 1, label: "Inicio" });
    const second = addTimeMarker(first, "t", { at: 2.5, label: "Tangente" });
    expect(second.match(/markers:/g)).toHaveLength(1);
    expect(second).toContain('label: "Tangente"');
  });
});
