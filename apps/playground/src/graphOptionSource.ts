import type { SourceRange } from "@mathmd/ast";

/**
 * Persist a display option inside one fenced .bwjm block using its parser range.
 * Never rewrite other blocks or the whole document, and never modify expressions.
 */
export function updateGraphOption(
  source: string,
  range: SourceRange,
  blockType: "curve3d" | "surface3d" | "parametric2d",
  key: string,
  value: boolean,
): string {
  if (!/^(animated|showInfo|showLegend|showTNB|showVectors|contours|showTrail|showVelocity|showAcceleration|showTangent|showNormal|followParticle)$/.test(key)) {
    return source;
  }
  const {start, end} = range;
  if (!Number.isInteger(start.offset) || !Number.isInteger(end.offset) ||
    start.offset < 0 || end.offset > source.length || end.offset <= start.offset) return source;
  const original = source.slice(start.offset, end.offset);
  const fence = String.fromCharCode(96).repeat(3);
  const lines = original.split(/\r?\n/);
  if (lines[0].trim() !== fence + blockType || lines[lines.length - 1].trim() !== fence) return source;
  const setting = new RegExp("^\\s*" + key + "\\s*:");
  const propertyIndices: number[] = [];
  for (let i = 1; i < lines.length - 1; i++) if (setting.test(lines[i])) propertyIndices.push(i);
  if (propertyIndices.length > 1) return source; // Do not modify ambiguous YAML.
  const updated = [...lines];
  if (propertyIndices.length) updated[propertyIndices[0]] = key + ": " + value;
  else updated.splice(updated.length - 1, 0, key + ": " + value);
  return source.slice(0, start.offset) + updated.join(original.includes("\r\n") ? "\r\n" : "\n") + source.slice(end.offset);
}
