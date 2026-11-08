import type { MathMDDiagnostic, MathMDDocument, MathMDNode } from "@mathmd/ast";
import {
  createGithubFallbackBundle,
  type MathMDFallbackBundle,
} from "@mathmd/github";
import { parseMathMD } from "@mathmd/parser";

export interface EditorDiagnostic {
  severity: MathMDDiagnostic["severity"];
  code: string;
  message: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface MathMDAnalysis {
  hasMathMD: boolean;
  diagnostics: EditorDiagnostic[];
}

export interface PreviewUpdate {
  type: "update";
  source: string;
  documentUri: string;
}

export type DocumentSegment =
  | { kind: "prose"; content: string }
  | { kind: "mathmd"; node: MathMDNode };

const SUPPORTED_EXTENSIONS = [".bwjm", ".jm", ".md"];
const AUTO_PREVIEW_EXTENSIONS = [".bwjm", ".jm"];

export function isSupportedMathMDLanguage(languageId: string, fileName?: string): boolean {
  if (languageId === "markdown" || languageId === "bwjm") {
    return true;
  }
  if (!fileName) {
    return false;
  }
  const normalized = fileName.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => normalized.endsWith(ext));
}

export function isAutoPreviewDocument(languageId: string, fileName?: string): boolean {
  if (languageId === "bwjm") {
    return true;
  }
  if (!fileName) {
    return false;
  }
  const normalized = fileName.toLowerCase();
  return AUTO_PREVIEW_EXTENSIONS.some((ext) => normalized.endsWith(ext));
}

export function isBwjmDocument(languageId?: string, fileName?: string): boolean {
  if (languageId === "bwjm") {
    return true;
  }
  if (!fileName) {
    return false;
  }
  const normalized = fileName.toLowerCase();
  return AUTO_PREVIEW_EXTENSIONS.some((ext) => normalized.endsWith(ext));
}

export function isPreviewReadyMessage(value: unknown): value is { type: "ready" } {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "ready";
}

function toEditorDiagnostic(diagnostic: MathMDDiagnostic): EditorDiagnostic {
  const range = diagnostic.range ?? {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 1, offset: 0 },
  };
  return {
    severity: diagnostic.severity,
    code: diagnostic.code,
    message: diagnostic.message,
    startLine: range.start.line,
    startColumn: range.start.column,
    endLine: range.end.line,
    endColumn: range.end.column,
  };
}

export function analyzeMathMD(source: string): MathMDAnalysis {
  const document = parseMathMD(source);
  return {
    hasMathMD: document.children.length > 0 || document.diagnostics.length > 0,
    diagnostics: document.diagnostics.map(toEditorDiagnostic),
  };
}

export function segmentMathMDDocument(source: string): {
  segments: DocumentSegment[];
  document: MathMDDocument;
} {
  const document = parseMathMD(source);
  type Span =
    | { start: number; end: number; kind: "mathmd"; node: MathMDNode }
    | { start: number; end: number; kind: "diagnostic" };

  const spans: Span[] = [];
  for (const node of document.children) {
    spans.push({
      start: node.range.start.offset,
      end: node.range.end.offset,
      kind: "mathmd",
      node,
    });
  }
  for (const diagnostic of document.diagnostics) {
    if (diagnostic.range && diagnostic.blockType) {
      spans.push({
        start: diagnostic.range.start.offset,
        end: diagnostic.range.end.offset,
        kind: "diagnostic",
      });
    }
  }

  spans.sort((a, b) => a.start - b.start || a.end - b.end);

  const segments: DocumentSegment[] = [];
  let cursor = 0;

  for (const span of spans) {
    if (span.start > cursor) {
      const proseSlice = source.slice(cursor, span.start).trim();
      if (proseSlice.length > 0) {
        segments.push({ kind: "prose", content: proseSlice });
      }
    }
    if (span.kind === "mathmd") {
      segments.push({ kind: "mathmd", node: span.node });
    }
    cursor = Math.max(cursor, span.end);
  }

  if (cursor < source.length) {
    const trailingProse = source.slice(cursor).trim();
    if (trailingProse.length > 0) {
      segments.push({ kind: "prose", content: trailingProse });
    }
  }

  return { segments, document };
}

export function createPreviewUpdate(source: string, documentUri: string): PreviewUpdate {
  return { type: "update", source, documentUri };
}

export function buildGithubExport(source: string, sourceName: string): MathMDFallbackBundle {
  return createGithubFallbackBundle(source, sourceName);
}
