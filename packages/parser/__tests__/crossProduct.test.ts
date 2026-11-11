import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMathMD } from "../src/index.js";

const crossBlock = (...fields: string[]) => ["```crossproduct", ...fields, "```"].join("\n");

describe("crossproduct blocks", () => {
  it("opens the T001 example with its scientific options", () => {
    const example = readFileSync(new URL(
      "../../../examples/T001_MED-03.01-V_cross_plane_normal.bwjm", import.meta.url), "utf8");
    const document = parseMathMD(example);
    expect(document.diagnostics).toEqual([]);
    expect(document.children).toEqual([expect.objectContaining({
      type: "crossproduct", id: "cross1", u: [1, 0, 0], v: [0, 1, 0],
      showPlane: true, showNormal: true, showArea: true, planeOpacity: 0.4,
      colorU: "#0284c7", colorNormal: "#10b981", colorPlane: "#cbd5e1",
      labelU: "u", labelV: "v", labelNormal: "u × v",
    })]);
  });

  it("accepts a zero vector and explicit false layer settings", () => {
    const document = parseMathMD(crossBlock("u: [0, 0, 0]", "v: [0, 1, 0]", "showNormal: false"));
    expect(document.diagnostics).toEqual([]);
    expect(document.children).toEqual([expect.objectContaining({ u: [0, 0, 0], showNormal: false })]);
  });

  it("opens the T002 example and keeps its calculator options", () => {
    const example = readFileSync(new URL(
      "../../../examples/T002_MED-03.01-C_cross_calculator.bwjm", import.meta.url), "utf8");
    const document = parseMathMD(example);
    expect(document.diagnostics).toEqual([]);
    expect(document.children).toEqual([expect.objectContaining({
      type: "crossproduct", id: "cross-calc", u: [2, 1, 3], v: [1, 4, -2],
      showSteps: true, reverseOrder: false,
    })]);
  });

  it("rejects non-boolean calculator options", () => {
    const document = parseMathMD(crossBlock("u: [1, 0, 0]", "v: [0, 1, 0]", 'reverseOrder: "true"', "showSteps: 1"));
    expect(document.children).toEqual([]);
    expect(document.diagnostics.map(diagnostic => diagnostic.path)).toEqual([["showSteps"], ["reverseOrder"]]);
  });

  it("opens the T003 example and rejects non-boolean determinant settings", () => {
    const example = readFileSync(new URL(
      "../../../examples/T003_MED-03.02-V_determinant_ijk.bwjm", import.meta.url), "utf8");
    const document = parseMathMD(example);
    expect(document.diagnostics).toEqual([]);
    expect(document.children).toEqual([expect.objectContaining({
      type: "crossproduct", id: "cross-det", u: [1, 0, 0], v: [0, 1, 0], showDeterminant: true,
    })]);
    const malformed = parseMathMD(crossBlock("u: [1, 0, 0]", "v: [0, 1, 0]", "showDeterminant: 1"));
    expect(malformed.children).toEqual([]);
    expect(malformed.diagnostics).toEqual([expect.objectContaining({
      code: "MATHMD_SCHEMA_INVALID", path: ["showDeterminant"],
    })]);
  });

  it("opens the T004 example with both showDeterminant and showSteps", () => {
    const example = readFileSync(new URL(
      "../../../examples/T004_MED-03.02-C_determinant_educational.bwjm", import.meta.url), "utf8");
    const document = parseMathMD(example);
    expect(document.diagnostics).toEqual([]);
    expect(document.children).toEqual([expect.objectContaining({
      type: "crossproduct", id: "cross-educational", u: [2, 3, 1], v: [4, 1, 5],
      showDeterminant: true, showSteps: true,
    })]);
  });

  it("opens the T005 example and accepts showRightHand", () => {
    const example = readFileSync(new URL(
      "../../../examples/T005_MED-03.03-V_right_hand_rule.bwjm", import.meta.url), "utf8");
    const document = parseMathMD(example);
    expect(document.diagnostics).toEqual([]);
    expect(document.children).toEqual([expect.objectContaining({
      type: "crossproduct", id: "cross-rh", u: [1, 0, 0], v: [0, 1, 0],
      showRightHand: true,
    })]);

    const malformed = parseMathMD(crossBlock("u: [1, 0, 0]", "v: [0, 1, 0]", "showRightHand: 1"));
    expect(malformed.children).toEqual([]);
    expect(malformed.diagnostics).toEqual([expect.objectContaining({
      code: "MATHMD_SCHEMA_INVALID", path: ["showRightHand"],
    })]);
  });

  it("loads reproducible T006 document with orientation and right-hand rule without diagnostics", () => {
    const document = parseMathMD(readFileSync("examples/T006_MED-03.03-C_orientation_order.bwjm", "utf8"));
    expect(document.diagnostics).toEqual([]);
    expect(document.children).toEqual([
      expect.objectContaining({
        type: "crossproduct",
        id: "cross-orient",
        u: [2, 3, 1],
        v: [4, 1, 5],
        showSteps: true,
        showRightHand: true,
        showDeterminant: true,
      }),
    ]);
  });

  it("loads reproducible T007 document with parallelogram area without diagnostics", () => {
    const document = parseMathMD(readFileSync("examples/T007_MED-03.04-V_parallelogram_area.bwjm", "utf8"));
    expect(document.diagnostics).toEqual([]);
    expect(document.children).toEqual([
      expect.objectContaining({
        type: "crossproduct",
        id: "cross-area",
        u: [2, 3, 1],
        v: [4, 1, 5],
        showPlane: true,
        showArea: true,
        showNormal: true,
        showSteps: true,
      }),
    ]);
  });

  it("loads reproducible T008 document with area comparison and steps without diagnostics", () => {
    const document = parseMathMD(readFileSync("examples/T008_MED-03.04-C_area_comparison.bwjm", "utf8"));
    expect(document.diagnostics).toEqual([]);
    expect(document.children).toEqual([
      expect.objectContaining({
        type: "crossproduct",
        id: "cross-areasteps",
        u: [2, 3, 1],
        v: [4, 1, 5],
        showSteps: true,
        showArea: true,
      }),
    ]);
  });

  it("loads reproducible T009 document with plane and perpendicular normal without diagnostics", () => {
    const document = parseMathMD(readFileSync("examples/T009_MED-03.05-V_plane_normal_perpendicular.bwjm", "utf8"));
    expect(document.diagnostics).toEqual([]);
    expect(document.children).toEqual([
      expect.objectContaining({
        type: "crossproduct",
        id: "cross-plane-normal",
        u: [2, 3, 1],
        v: [4, 1, 5],
        showPlane: true,
        showNormal: true,
        showArea: true,
        showSteps: true,
      }),
    ]);
  });

  it("loads reproducible T010 document with algebraic perpendicularity verification without diagnostics", () => {
    const document = parseMathMD(readFileSync("examples/T010_MED-03.05-C_perpendicular_check.bwjm", "utf8"));
    expect(document.diagnostics).toEqual([]);
    expect(document.children).toEqual([
      expect.objectContaining({
        type: "crossproduct",
        id: "cross-perp-check",
        u: [2, 3, 1],
        v: [4, 1, 5],
        showSteps: true,
        showPlane: true,
        showNormal: true,
      }),
    ]);
  });

  it("reports nonfinite components and invalid opacity while keeping another block", () => {
    const malformed = crossBlock("u: [1, .inf, 0]", "v: [0, 1, 0]", "planeOpacity: 2");
    const valid = crossBlock("id: valid", "u: [1, 0, 0]", "v: [0, 1, 0]");
    const document = parseMathMD([malformed, valid].join("\n\n"));
    expect(document.diagnostics).toEqual([
      expect.objectContaining({ code: "MATHMD_SCHEMA_INVALID", blockType: "crossproduct", path: ["u", 1] }),
      expect.objectContaining({ code: "MATHMD_SCHEMA_INVALID", blockType: "crossproduct", path: ["planeOpacity"] }),
    ]);
    expect(document.children).toEqual([expect.objectContaining({ id: "valid" })]);
  });
});
