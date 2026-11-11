import { describe, expect, it } from "vitest";
import { compactImageEditor } from "../src/compactImageEditor.js";
import { parseProseMarkdown } from "@mathmd/parser";

// A small valid, browser-decodable PNG; the full data URL is stored in the
// original document, never in the compact textarea projection.
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR4nGM0mvaBAQaYGJAAbg4AVjYBwOfWMMcAAAAASUVORK5CYII=";
const picture = (alt = "Nuevo Modelo") => "![" + alt + "](" + png + ")";
const fence = String.fromCharCode(96).repeat(3);

describe("Studio: vistas compactas de imágenes sin pérdida de datos", () => {
  it("reemplaza solo el URL enorme en el editor, nunca en el documento real", () => {
    const source = "# Informe\n\nTexto $x^2$\n\n" + picture() + "\n\n" +
      fence + "plot2d\nid: demo\nequation: x^2\n" + fence + "\n";
    const projection = compactImageEditor(source);
    expect(projection.imageCount).toBe(1);
    expect(projection.text).toContain("![Nuevo Modelo](imagen-integrada-1)");
    expect(projection.text).not.toContain("base64,");
    expect(projection.restoreSource(projection.text)).toBe(source);
    expect(source).toContain(png);
  });

  it("permite modificar el texto alternativo sin perder un solo byte de la imagen", () => {
    const source = picture();
    const projection = compactImageEditor(source);
    const edited = projection.text.replace("Nuevo Modelo", "Diagrama corregido");
    const restored = projection.restoreSource(edited);
    expect(restored).toBe(picture("Diagrama corregido"));
    const ast = parseProseMarkdown(restored);
    expect(ast.children?.[0]?.children?.[0]?.alt).toBe("Diagrama corregido");
  });

  it("permite mover, duplicar y eliminar referencias sin convertirlas en enlaces rotos", () => {
    const source = "Primero\n\n" + picture() + "\n\nÚltimo";
    const projection = compactImageEditor(source);
    const token = "![Nuevo Modelo](imagen-integrada-1)";
    const relocated = "Primero\n\nÚltimo\n\n" + token;
    expect(projection.restoreSource(relocated)).toBe("Primero\n\nÚltimo\n\n" + picture());
    expect(projection.restoreSource("Texto sin imagen")).toBe("Texto sin imagen");
    expect(projection.restoreSource(token + "\n\n" + token)).toBe(picture() + "\n\n" + picture());
  });

  it("no reemplaza datos que no son imágenes Markdown ni destinos inventados", () => {
    const source = "Enlace [foto](" + png + ") e imagen remota ![web](https://example.org/foto.png)";
    const projection = compactImageEditor(source);
    expect(projection.imageCount).toBe(0);
    expect(projection.text).toBe(source);
    expect(projection.restoreSource("![falsa](imagen-integrada-1)")).toBe("![falsa](imagen-integrada-1)");
  });

  it("mantiene posiciones de cursor coherentes antes y después de imágenes grandes", () => {
    const source = "Antes\n\n" + picture() + "\n\nDespués\n\n" + picture("Segunda") + "\n\nFinal";
    const view = compactImageEditor(source);
    expect(view.imageCount).toBe(2);
    for (const word of ["Antes", "Después", "Final", "Segunda"]) {
      const sourceOffset = source.indexOf(word);
      const visibleOffset = view.text.indexOf(word);
      expect(view.toSourceOffset(visibleOffset)).toBe(sourceOffset);
      expect(view.toVisibleOffset(sourceOffset)).toBe(visibleOffset);
    }
    const tokenStart = view.text.indexOf("imagen-integrada-1");
    const tokenEnd = tokenStart + "imagen-integrada-1".length;
    expect(view.toSourceOffset(tokenStart)).toBe(source.indexOf(png));
    expect(view.toSourceOffset(tokenEnd)).toBe(source.indexOf(png) + png.length);
    expect(view.toSourceOffset(tokenStart + 5, "start")).toBe(source.indexOf(png));
    expect(view.toSourceOffset(tokenStart + 5, "end")).toBe(source.indexOf(png) + png.length);
  });

  it.each(["bwjm", "jm"])(
    "al guardar y abrir .%s conserva exactamente la imagen Base64 y su posición",
    extension => {
      const source = "# Portabilidad\n\n" + picture() + "\n\n$x^2$\n\nFin";
      const view = compactImageEditor(source);
      const edited = view.restoreSource(view.text + "\nTexto adicional");
      const downloaded = new TextEncoder().encode(edited);
      const reopened = new TextDecoder().decode(downloaded);
      expect(reopened).toContain(png);
      expect(reopened).toContain("Texto adicional");
      expect(reopened).toContain("$x^2$");
      expect(compactImageEditor(reopened).text).toContain("![Nuevo Modelo](imagen-integrada-1)");
      expect(extension).toMatch(/^(bwjm|jm)$/);
    }
  );
});
