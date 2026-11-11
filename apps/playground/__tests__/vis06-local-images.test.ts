import { describe, expect, it } from "vitest";
import { parseMathMD, parseProseMarkdown } from "@mathmd/parser";
import {
  detectRasterMime,
  imageAltFromFilename,
  isSafeEmbeddedRasterUrl,
  MAX_IMAGE_DOCUMENT_BYTES,
  MAX_LOCAL_IMAGE_BYTES,
  portableImageMarkdown,
  validateLocalRaster,
} from "../src/localImages.js";
import {
  closeWorkspaceDocument,
  initialWorkspace,
  insertDocumentAtSnapshot,
  openWorkspaceDocument,
  updateActiveContent,
} from "../src/workspaceDocuments.js";

const pngData = "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR4nGM0mvaBAQaYGJAAbg4AVjYBwOfWMMcAAAAASUVORK5CYII=";
const dataUrl = "data:image/png;base64," + pngData;
const originalMarkdown = "# Informe\n\nTexto antes con $x^2$.\n\n" +
  String.fromCharCode(96).repeat(3) + "plot2d\nid: curva-portable\nequation: x^2\n" +
  String.fromCharCode(96).repeat(3) + "\n\nTexto después.";

function toBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), character => character.charCodeAt(0));
}

describe("VIS-06: local raster validation and portable Markdown", () => {
  it("detects real PNG signature and rejects disguised HTML/SVG or MIME mismatch", () => {
    const png = toBytes(pngData);
    expect(detectRasterMime(png)).toBe("image/png");
    expect(validateLocalRaster(png, "foto.png", "image/png")).toBe("image/png");
    expect(() => validateLocalRaster(png, "falsa.jpg", "image/jpeg")).toThrow(/formato real/);
    expect(() => validateLocalRaster(toBytes(btoa("<svg></svg>")), "foto.png", "image/png"))
      .toThrow(/formato real/);
    expect(() => validateLocalRaster(png, "vector.svg", "image/svg+xml"))
      .toThrow(/PNG, JPEG o WebP/);
    expect(() => validateLocalRaster(new Uint8Array(MAX_LOCAL_IMAGE_BYTES + 1), "grande.png", "image/png"))
      .toThrow(/3 MiB/);
  });

  it("accepts only canonical raster data URLs with valid base64 and matching magic bytes", () => {
    expect(isSafeEmbeddedRasterUrl(dataUrl)).toBe(true);
    expect(isSafeEmbeddedRasterUrl("data:image/svg+xml;base64," + btoa("<svg/>"))).toBe(false);
    expect(isSafeEmbeddedRasterUrl("data:text/html;base64," + btoa("<script/>"))).toBe(false);
    expect(isSafeEmbeddedRasterUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeEmbeddedRasterUrl("data:image/png;base64," + pngData.slice(0, -1) + "*")).toBe(false);
    expect(isSafeEmbeddedRasterUrl("data:image/jpeg;base64," + pngData)).toBe(false);
    expect(isSafeEmbeddedRasterUrl("data:image/png;base64," + "A".repeat(4 * (MAX_LOCAL_IMAGE_BYTES + 1)))).toBe(false);
  });

  it("keeps the data URL on one line and the editable alt derived from filename", () => {
    expect(imageAltFromFilename("resultado [final].png")).toBe("resultado \\[final\\]");
    const markdown = portableImageMarkdown("resultado [final].png", dataUrl);
    expect(markdown).toContain("![resultado \\[final\\]](data:image/png;base64,");
    expect(markdown.split("\n").filter(line => line.startsWith("!["))).toHaveLength(1);
    const images = (parseProseMarkdown(markdown).children ?? [])
      .flatMap(node => node.children ?? []).filter(node => node.type === "image");
    expect(images[0]?.alt).toBe("resultado [final]");
    expect(images[0]?.url).toBe(dataUrl);
  });

  it.each(["portatil.bwjm", "portatil.jm"])(
    "survives saving and reopening only the %s text alongside math and plot",
    filename => {
      const state = initialWorkspace(filename, originalMarkdown);
      const start = originalMarkdown.indexOf("Texto después.");
      const snapshot = { documentId: state.activeId, content: originalMarkdown, start, end: start };
      const updated = insertDocumentAtSnapshot(state, snapshot, portableImageMarkdown("diagrama.png", dataUrl));
      expect(updated.status).toBe("inserted");
      // Save/open the plain text only. No source file or secondary asset exists.
      const downloaded = updated.workspace.documents[0].content;
      expect(downloaded).toContain(dataUrl);
      const reopened = initialWorkspace(filename, downloaded);
      expect(parseMathMD(reopened.documents[0].content).children.some(node => node.type === "plot2d")).toBe(true);
      const tree = parseProseMarkdown(reopened.documents[0].content);
      expect(JSON.stringify(tree)).toContain('"type":"image"');
      expect(JSON.stringify(tree)).toContain('"type":"inlineMath"');
      expect(reopened.documents[0].content).toContain("Texto después.");
    }
  );
});

describe("VIS-06: asynchronous insertion is pinned to the original tab", () => {
  it("inserts only into the captured tab even when the user switches tabs during reading", () => {
    let state = initialWorkspace("a.bwjm", "A\n");
    const originalId = state.activeId;
    const snapshot = { documentId: originalId, content: "A\n", start: 2, end: 2 };
    state = openWorkspaceDocument(state, "b.jm", "B\n");
    const next = insertDocumentAtSnapshot(state, snapshot, portableImageMarkdown("foto.png", dataUrl));
    expect(next.status).toBe("inserted");
    expect(next.workspace.activeId).toBe(state.activeId);
    expect(next.workspace.documents.find(doc => doc.id === originalId)?.content).toContain(dataUrl);
    expect(next.workspace.documents.find(doc => doc.id === state.activeId)?.content).toBe("B\n");
  });

  it("never overwrites edits in the target tab made while the image was being read", () => {
    let state = initialWorkspace("a.bwjm", "Antes");
    const snapshot = { documentId: state.activeId, content: "Antes", start: 5, end: 5 };
    state = updateActiveContent(state, "Antes y texto nuevo");
    const result = insertDocumentAtSnapshot(state, snapshot, portableImageMarkdown("foto.png", dataUrl));
    expect(result.status).toBe("edited");
    expect(result.workspace).toBe(state);
    expect(result.workspace.documents[0].content).toBe("Antes y texto nuevo");
  });

  it("does not recreate a tab which was closed during image reading", () => {
    let state = initialWorkspace("a.bwjm", "Antes");
    const originalId = state.activeId;
    const snapshot = { documentId: originalId, content: "Antes", start: 5, end: 5 };
    state = closeWorkspaceDocument(state, originalId);
    const result = insertDocumentAtSnapshot(state, snapshot, portableImageMarkdown("foto.png", dataUrl));
    expect(result.status).toBe("closed");
    expect(result.workspace.documents.every(doc => doc.id !== originalId)).toBe(true);
  });

  it("does not insert when no file is chosen and rejects invalid selection positions", () => {
    const state = initialWorkspace("a.bwjm", "Antes");
    // Cancel event does not invoke insertion; all workspace state stays untouched.
    expect(state.documents[0].content).toBe("Antes");
    expect(insertDocumentAtSnapshot(state,
      { documentId: state.activeId, content: "Antes", start: 99, end: 99 }, "x").status)
      .toBe("invalid-range");
  });

  it("rejects adding an image if the resulting document exceeds 12 MiB", () => {
    const content = "a".repeat(MAX_IMAGE_DOCUMENT_BYTES - 1);
    const state = initialWorkspace("grande.bwjm", content);
    const result = insertDocumentAtSnapshot(state, {
      documentId: state.activeId, content, start: content.length, end: content.length,
    }, "\n![foto](" + dataUrl + ")\n");
    expect(result.status).toBe("too-large");
    expect(result.workspace).toBe(state);
  });
});
