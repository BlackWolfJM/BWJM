/**
 * VIS-07: Remark accepts display math with $$ on a line of its own, but can
 * consume following Markdown fences when a user types an unfinished formula
 * or places the closing $$ at the end of its final TeX line.
 *
 * Normalize only the string passed to Remark. Never modify the source stored
 * in .bwjm/.jm. Offsets in the normalized tree map back to original source.
 */
interface SourceLine {
  start: number;
  text: string;
}
interface SourceEdit {
  offset: number;
  kind: "insert-close-line" | "mask-unclosed-open";
}
interface Insertion {
  at: number;
  length: number;
}
export interface PreparedRemarkMath {
  text: string;
  toOriginalOffset: (offset: number) => number;
}
function sourceLines(source: string): SourceLine[] {
  const lines: SourceLine[] = [];
  let pos = 0;
  while (pos < source.length) {
    const newline = source.indexOf("\n", pos);
    const end = newline < 0 ? source.length : newline;
    lines.push({ start: pos, text: source.slice(pos, end).replace(/\r$/, "") });
    pos = newline < 0 ? source.length : newline + 1;
  }
  return lines;
}
function fencedLines(lines: readonly SourceLine[]): boolean[] {
  const result: boolean[] = [];
  let code: { symbol: string; length: number } | null = null;
  for (const line of lines) {
    const fence = /^ {0,3}(`{3,}|~{3,})/.exec(line.text);
    if (code) {
      result.push(true);
      if (fence && fence[1][0] === code.symbol &&
          fence[1].length >= code.length &&
          line.text.slice(fence[0].length).trim() === "") {
        code = null;
      }
    } else if (fence) {
      code = { symbol: fence[1][0], length: fence[1].length };
      result.push(true);
    } else {
      result.push(false);
    }
  }
  return result;
}
export function prepareRemarkMath(source: string): PreparedRemarkMath {
  const lines = sourceLines(source);
  const inCode = fencedLines(lines);
  const edits: SourceEdit[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (inCode[i] || !/^ {0,3}\$\$\s*$/.test(lines[i].text)) continue;
    let closing = -1;
    let suffixOffset: number | null = null;
    for (let j = i + 1; j < lines.length; j++) {
      // An incomplete display formula must never swallow a later scientific
      // fence. Its opening delimiter is masked for Remark only.
      if (inCode[j]) break;
      if (/^ {0,3}\$\$\s*$/.test(lines[j].text)) {
        closing = j;
        break;
      }
      // Accept TeX followed by $$ on the same line, with or without a space.
      const tail = /\$\$\s*$/.exec(lines[j].text);
      if (tail && tail.index > 0 && lines[j].text[tail.index - 1] !== "\\") {
        closing = j;
        suffixOffset = lines[j].start + tail.index;
        break;
      }
    }
    if (closing === -1) {
      const prefix = /^ {0,3}/.exec(lines[i].text)?.[0].length ?? 0;
      edits.push({ offset: lines[i].start + prefix, kind: "mask-unclosed-open" });
    } else {
      if (suffixOffset !== null) edits.push({ offset: suffixOffset, kind: "insert-close-line" });
      i = closing;
    }
  }
  if (edits.length === 0) return { text: source, toOriginalOffset: offset => offset };
  edits.sort((a, b) => a.offset - b.offset);
  const separator = source.includes("\r\n") ? "\r\n" : "\n";
  const chunks: string[] = [];
  const insertions: Insertion[] = [];
  let cursor = 0;
  let outputLength = 0;
  for (const edit of edits) {
    const preceding = source.slice(cursor, edit.offset);
    chunks.push(preceding);
    outputLength += preceding.length;
    if (edit.kind === "insert-close-line") {
      chunks.push(separator);
      insertions.push({ at: outputLength, length: separator.length });
      outputLength += separator.length;
      cursor = edit.offset;
    } else {
      chunks.push("  ");
      outputLength += 2;
      cursor = edit.offset + 2;
    }
  }
  chunks.push(source.slice(cursor));
  return {
    text: chunks.join(""),
    toOriginalOffset: (offset: number) => {
      let removed = 0;
      for (const insertion of insertions) {
        if (offset <= insertion.at) break;
        if (offset < insertion.at + insertion.length) return insertion.at - removed;
        removed += insertion.length;
      }
      return offset - removed;
    },
  };
}
/** Precompute original LF/CRLF line starts once; needed for large VIS-06 image documents. */
export function sourcePositionLocator(
  source: string,
): (offset: number) => { line: number; column: number; offset: number } {
  const lineStarts = [0];
  for (let i = 0; i < source.length; i++) {
    if (source.charCodeAt(i) === 10) lineStarts.push(i + 1);
  }
  return (offset: number) => {
    const bounded = Math.max(0, Math.min(source.length, offset));
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (lineStarts[mid] <= bounded) low = mid;
      else high = mid - 1;
    }
    return { line: low + 1, column: bounded - lineStarts[low] + 1, offset: bounded };
  };
}
