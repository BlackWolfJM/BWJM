import type { TimelineNode } from "@mathmd/ast";

export interface TimeMarker { at: number; label: string }
export type Domain = readonly [number, number];

export const clampUnit = (x: number) => Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;
export function timeFraction(time: number, domain: Domain): number {
  return domain[1] > domain[0] ? clampUnit((time - domain[0]) / (domain[1] - domain[0])) : 0;
}
export function fractionTime(fraction: number, domain: Domain): number {
  return domain[0] + clampUnit(fraction) * (domain[1] - domain[0]);
}
export function advanceTime(
  time: number, elapsedSeconds: number, speed: number, domain: Domain,
  loop: boolean, direction: -1 | 1 = 1, segment: Domain = domain,
): { time: number; finished: boolean } {
  if (domain[1] <= domain[0]) throw new Error("Invalid time domain");
  const low = Math.max(domain[0], Math.min(domain[1], segment[0]));
  const high = Math.max(low, Math.min(domain[1], segment[1]));
  const length = high - low;
  if (length <= 0) return { time: low, finished: true };
  const base = Number.isFinite(time) ? Math.max(low, Math.min(high, time)) : low;
  const delta = Math.min(Math.max(0, elapsedSeconds), 0.25) * Math.min(8, Math.max(0.1, speed)) * direction;
  const next = base + delta;
  if (next >= low && next <= high) return { time: next, finished: false };
  if (!loop) return { time: direction > 0 ? high : low, finished: true };
  return { time: low + ((next - low) % length + length) % length, finished: false };
}
export function sequenceFrames(timelines: readonly TimelineNode[], count = 121, segment: Domain = [0, 1]) {
  if (!Number.isInteger(count) || count < 2 || count > 601) throw new Error("Frame count out of bounds");
  return Array.from({ length: count }, (_, i) => {
    const progress = segment[0] + (segment[1] - segment[0]) * i / (count - 1);
    return { frame: i, progress, values: Object.fromEntries(
      timelines.map(item => [item.name, fractionTime(progress, item.domain)]) ) };
  });
}
/** Adds a marker as YAML to the matching timeline block, preserving the authored document. */
export function addTimeMarker(source: string, name: string, marker: TimeMarker): string {
  const fence = String.fromCharCode(96).repeat(3);
  let cursor = 0;
  while ((cursor = source.indexOf(fence + "timeline", cursor)) !== -1) {
    const start = cursor + fence.length + "timeline".length;
    const end = source.indexOf(fence, start);
    if (end < 0) break;
    const content = source.slice(start, end);
    const matches = content.split(/\r?\n/).some(line => {
      const parsed = /^\s*name:\s*(.+?)\s*$/.exec(line);
      return parsed ? parsed[1].replace(/^["']|["']$/g, "") === name : false;
    });
    if (!matches) { cursor = end + fence.length; continue; }
    const entry = "  - at: " + Number(marker.at.toFixed(6)) +
      "\n    label: " + JSON.stringify(marker.label.slice(0, 80)) + "\n";
    const patched = /^markers:\s*$/m.test(content)
      ? content.replace(/(^markers:\s*\r?\n(?:[ \t]+[^\r\n]*\r?\n)*)/m, "$1" + entry)
      : content.trimEnd() + "\nmarkers:\n" + entry;
    return source.slice(0, start) + patched + source.slice(end);
  }
  return source;
}
