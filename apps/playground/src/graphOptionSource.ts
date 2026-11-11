import type { SourceRange } from "@mathmd/ast";
import { parseMathMD } from "@mathmd/parser";

type GraphOptionValue = boolean | number | string | readonly number[];

type SupportedBlock = "curve3d" | "surface3d" | "parametric2d" | "vector2d" | "vector3d" | "crossproduct" | "line3d" | "plane3d";
const crossProductOptions = new Set([
  "showPlane", "showNormal", "showArea", "showTriangle", "showVolume", "showSteps",
  "reverseOrder", "showDeterminant", "showRightHand",
  "showAnticommutative", "showDistributive", "showIdentities",
  "showCollapse", "collapseFactor", "collapseTarget",
  "showSignChallenge", "signChallengeMode", "signChallengeSeed",
]);
const line3dOptions = new Set([
  "showPoint", "showDirection", "showSegment", "segmentT", "tDomain",
  "paramName", "color", "colorPoint", "colorDirection", "labelPoint", "labelDirection", "label",
]);
const plane3dOptions = new Set([
  "mode", "showPoint", "showNormal", "showIntercepts", "xDomain", "yDomain",
  "color", "colorPoint", "colorNormal", "opacity", "labelPoint", "labelNormal", "labelU", "labelV", "label",
  // point-normal
  "point", "normal",
  // three-points
  "pointA", "pointB", "pointC",
  // point-vectors / parametric
  "vectorU", "vectorV",
  // general
  "A", "B", "C", "D",
]);
const allowedBooleanSettings = new Set([
  "animated", "showInfo", "showLegend", "showTNB", "showVectors",
  "contours", "showTrail", "showVelocity", "showAcceleration",
  "showTangent", "showNormal", "followParticle", "showSteps", "showPlane", "showArea",
]);

/**
 * Persist a supported property in a single .bwjm graph block.
 * The source range must match exactly; never mutate other blocks.
 */
function updateGraphField(
  source: string,
  range: SourceRange,
  blockType: SupportedBlock,
  key: string,
  value: GraphOptionValue,
): string {
  const { start, end } = range;
  if (!Number.isInteger(start.offset) || !Number.isInteger(end.offset) ||
    start.offset < 0 || end.offset > source.length || end.offset <= start.offset) return source;
  const original = source.slice(start.offset, end.offset);
  const fence = String.fromCharCode(96).repeat(3);
  const newline = original.includes("\r\n") ? "\r\n" : "\n";
  const lines = original.split(/\r?\n/);
  if (lines[0].trim() !== fence + blockType || lines[lines.length - 1].trim() !== fence) return source;
  const setting = new RegExp("^\\s*" + key + "\\s*:");
  const matching: number[] = [];
  for (let i = 1; i < lines.length - 1; i++) if (setting.test(lines[i])) matching.push(i);
  if (matching.length > 1) return source;
  const next = [...lines];
  const entry = key + ": " + JSON.stringify(value);
  if (matching.length) {
    const index = matching[0];
    const indent = lines[index].match(/^\s*/)?.[0] ?? "";
    if (Array.isArray(value)) {
      // A YAML sequence can continue on indented lines, or with unindented dashes.
      const continuation: number[] = [];
      for (let i = index + 1; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith("#")) continue;
        if (!lines[i].startsWith(indent + " ") && !lines[i].startsWith(indent + "- ") &&
          !(lines[index].includes("[") && line.startsWith("]"))) break;
        continuation.push(i);
      }
      continuation.reverse().forEach(line => next.splice(line, 1));
    }
    next[index] = indent + entry;
  } else next.splice(-1, 0, entry);
  return source.slice(0, start.offset) + next.join(newline) + source.slice(end.offset);
}

export function updateGraphOption(
  source: string,
  range: SourceRange,
  blockType: SupportedBlock,
  key: string,
  value: GraphOptionValue,
): string {
  if (blockType === "crossproduct") {
    if (!crossProductOptions.has(key)) return source;
    const updated = updateGraphField(source, range, blockType, key, value);
    if (updated === source) return source;
    const end = range.end.offset + updated.length - source.length;
    const node = parseMathMD(updated.slice(range.start.offset, end)).children[0];
    return node?.type === "crossproduct" ? updated : source;
  }
  if (blockType === "line3d") {
    if (!line3dOptions.has(key)) return source;
    const updated = updateGraphField(source, range, blockType, key, value);
    if (updated === source) return source;
    const end = range.end.offset + updated.length - source.length;
    const node = parseMathMD(updated.slice(range.start.offset, end)).children[0];
    return node?.type === "line3d" ? updated : source;
  }
  if (blockType === "plane3d") {
    if (!plane3dOptions.has(key)) return source;
    const updated = updateGraphField(source, range, blockType, key, value);
    if (updated === source) return source;
    const end = range.end.offset + updated.length - source.length;
    const node = parseMathMD(updated.slice(range.start.offset, end)).children[0];
    return node?.type === "plane3d" ? updated : source;
  }
  if (typeof value !== "boolean" && typeof value !== "number") return source;
  if (!allowedBooleanSettings.has(key)) return source;
  if (key === "showPlane" || key === "showArea") return source;
  const vector = blockType === "vector2d" || blockType === "vector3d";
  if ((vector && key !== "showSteps") || (!vector && key === "showSteps"))
    return source;
  return updateGraphField(source, range, blockType, key, value);
}

export function updateCrossProductVector(
  source: string,
  range: SourceRange,
  key: "u" | "v" | "w" | "origin",
  value: readonly [number, number, number],
): string {
  if (value.length !== 3 || !value.every(Number.isFinite)) return source;
  const updated = updateGraphField(source, range, "crossproduct", key, value);
  if (updated === source) return source;
  const end = range.end.offset + updated.length - source.length;
  const node = parseMathMD(updated.slice(range.start.offset, end)).children[0];
  return node?.type === "crossproduct" && node[key]?.every((component, index) => component === value[index])
    ? updated : source;
}

/** Validated slider preference, stored in the native parametric2d block. */
export function updateGraphNumericOption(
  source: string,
  range: SourceRange,
  blockType: "parametric2d",
  key: "trailLength",
  value: number,
): string {
  if (key !== "trailLength" || !Number.isInteger(value) ||
    value < 2 || value > 500) return source;
  return updateGraphField(source, range, blockType, key, value);
}
