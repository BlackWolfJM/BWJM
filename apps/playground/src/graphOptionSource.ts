import type { SourceRange } from "@mathmd/ast";

type SupportedBlock = "curve3d" | "surface3d" | "parametric2d" | "vector2d" | "vector3d";
const allowedBooleanSettings = new Set([
  "animated", "showInfo", "showLegend", "showTNB", "showVectors",
  "contours", "showTrail", "showVelocity", "showAcceleration",
  "showTangent", "showNormal", "followParticle", "showSteps",
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
  value: boolean | number,
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
  const entry = key + ": " + String(value);
  if (matching.length) next[matching[0]] = entry;
  else next.splice(-1, 0, entry);
  return source.slice(0, start.offset) + next.join(newline) + source.slice(end.offset);
}

export function updateGraphOption(
  source: string,
  range: SourceRange,
  blockType: SupportedBlock,
  key: string,
  value: boolean,
): string {
  if (!allowedBooleanSettings.has(key)) return source;
  const vector = blockType === "vector2d" || blockType === "vector3d";
  if ((vector && key !== "showSteps") || (!vector && key === "showSteps"))
    return source;
  return updateGraphField(source, range, blockType, key, value);
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
