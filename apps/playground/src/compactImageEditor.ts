import { isSafeEmbeddedRasterUrl } from "./localImages.js";

/**
 * An editor-only projection of the portable source. The real document ALWAYS
 * contains the original data URL and is what Lector, Guardar and Abrir use.
 * Nothing is stored separately or hidden in a second file.
 */
interface ImageUrlSpan {
  sourceStart: number;
  sourceEnd: number;
  visibleStart: number;
  visibleEnd: number;
  visibleUrl: string;
  sourceUrl: string;
}

export interface CompactImageEditor {
  text: string;
  imageCount: number;
  toSourceOffset: (position: number, edge?: "start" | "end") => number;
  toVisibleOffset: (position: number, edge?: "start" | "end") => number;
  restoreSource: (editedText: string) => string;
}

const DATA_URL = /data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+/gi;
// Only complete Markdown image destinations are expanded; plain prose is safe.
const VISIBLE_IMAGE = /(!\[[^\r\n]*\]\()(imagen-integrada-\d+)(\))/g;

function translatedOffset(
  position: number,
  spans: readonly ImageUrlSpan[],
  from: "source" | "visible",
  edge: "start" | "end",
): number {
  let delta = 0;
  for (const span of spans) {
    const fromStart = from === "source" ? span.sourceStart : span.visibleStart;
    const fromEnd = from === "source" ? span.sourceEnd : span.visibleEnd;
    const toStart = from === "source" ? span.visibleStart : span.sourceStart;
    const toEnd = from === "source" ? span.visibleEnd : span.sourceEnd;
    if (position < fromStart) break;
    if (position <= fromEnd) {
      if (position === fromStart) return toStart;
      if (position === fromEnd) return toEnd;
      // If someone places a cursor inside the compact marker, snap to an
      // image boundary rather than inserting characters into the Base64 data.
      return edge === "start" ? toStart : toEnd;
    }
    delta = toEnd - fromEnd;
  }
  return position + delta;
}

export function compactImageEditor(source: string): CompactImageEditor {
  const pieces: string[] = [];
  const spans: ImageUrlSpan[] = [];
  let copiedUntil = 0;
  let visibleLength = 0;
  let result: RegExpExecArray | null;
  DATA_URL.lastIndex = 0;

  while ((result = DATA_URL.exec(source))) {
    const sourceUrl = result[0];
    const sourceStart = result.index;
    const sourceEnd = sourceStart + sourceUrl.length;

    // Never compact arbitrary data URLs used in prose or other syntax.
    // The inserted image is a one-line Markdown ![alt](data:...) reference.
    const lineStart = source.lastIndexOf("\n", sourceStart - 1) + 1;
    if (!/!\[[^\r\n]*\]\($/.test(source.slice(lineStart, sourceStart)) ||
        source[sourceEnd] !== ")" || !isSafeEmbeddedRasterUrl(sourceUrl)) continue;

    const preceding = source.slice(copiedUntil, sourceStart);
    const visibleUrl = "imagen-integrada-" + (spans.length + 1);
    pieces.push(preceding, visibleUrl);
    visibleLength += preceding.length;
    spans.push({
      sourceStart,
      sourceEnd,
      visibleStart: visibleLength,
      visibleEnd: visibleLength + visibleUrl.length,
      visibleUrl,
      sourceUrl,
    });
    visibleLength += visibleUrl.length;
    copiedUntil = sourceEnd;
  }
  pieces.push(source.slice(copiedUntil));
  const urls = new Map(spans.map(span => [span.visibleUrl, span.sourceUrl]));
  return {
    text: pieces.join(""),
    imageCount: spans.length,
    toSourceOffset: (position, edge = "end") =>
      translatedOffset(position, spans, "visible", edge),
    toVisibleOffset: (position, edge = "end") =>
      translatedOffset(position, spans, "source", edge),
    restoreSource: editedText => editedText.replace(
      VISIBLE_IMAGE, (full, prefix: string, key: string, suffix: string) =>
        urls.has(key) ? prefix + urls.get(key) + suffix : full
    ),
  };
}
