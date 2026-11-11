/**
 * VIS-06: portable raster images in plain-text .bwjm/.jm documents.
 * No DOM, FileReader or React dependency: safe to test in Vitest's Node environment.
 *
 * Limits: 3 MiB per source image; 12 MiB UTF-8 for the complete document after insertion.
 */
export const MAX_LOCAL_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_IMAGE_DOCUMENT_BYTES = 12 * 1024 * 1024;

export type RasterImageMime = "image/png" | "image/jpeg" | "image/webp";

const extensionMimes: Record<string, RasterImageMime> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

export function detectRasterMime(bytes: Uint8Array): RasterImageMime | null {
  if (bytes.length >= 24 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte) &&
    ascii(bytes, 12, 4) === "IHDR") return "image/png";

  // Camera JPEGs may contain metadata/padding after EOI. The browser decoder
  // verifies the complete file after this format-signature check.
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 &&
      bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (bytes.length >= 20 && ascii(bytes, 0, 4) === "RIFF" &&
      ascii(bytes, 8, 4) === "WEBP" &&
      ["VP8 ", "VP8L", "VP8X"].includes(ascii(bytes, 12, 4))) {
    const chunkSize = (bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24)) >>> 0;
    if (chunkSize + 8 === bytes.length) return "image/webp";
  }
  return null;
}

export function validateLocalRaster(
  bytes: Uint8Array, filename: string, declaredMime: string
): RasterImageMime {
  if (bytes.byteLength === 0) throw new Error("La imagen está vacía.");
  if (bytes.byteLength > MAX_LOCAL_IMAGE_BYTES) {
    throw new Error("La imagen supera el límite de 3 MiB. Reduce su tamaño antes de insertarla.");
  }
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const expectedMime = extensionMimes[extension];
  if (!expectedMime) throw new Error("Selecciona una imagen PNG, JPEG o WebP (no SVG).");
  const actualMime = detectRasterMime(bytes);
  if (!actualMime || actualMime !== expectedMime ||
      (declaredMime !== "" && declaredMime.toLowerCase() !== actualMime)) {
    throw new Error("El archivo está dañado o su formato real no coincide con su extensión y tipo.");
  }
  return actualMime;
}

/**
 * Validate embedded data URLs before assigning to img.src. Never allow SVG,
 * arbitrary data payloads, script schemes or malformed base64.
 */
export function isSafeEmbeddedRasterUrl(source: string): boolean {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/i.exec(source);
  if (!match) return false;
  const data = match[2];
  if (data.length % 4 !== 0 || data.length / 4 * 3 > MAX_LOCAL_IMAGE_BYTES + 2) return false;
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  if (data.length / 4 * 3 - padding > MAX_LOCAL_IMAGE_BYTES) return false;
  try {
    // A complete alphabet/length check above ensures the remaining chunks are base64.
    const prefix = atob(data.slice(0, Math.min(data.length, 64)));
    const magic = new Uint8Array(prefix.length);
    for (let i = 0; i < prefix.length; i++) magic[i] = prefix.charCodeAt(i);
    return detectEmbeddedMime(magic) === match[1].toLowerCase();
  } catch {
    return false;
  }
}

/** Only the header is needed in the reader; full-file decoding is checked on import. */
function detectEmbeddedMime(header: Uint8Array): RasterImageMime | null {
  if (header.length >= 24 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => header[i] === v) &&
      ascii(header, 12, 4) === "IHDR") return "image/png";
  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 &&
      header[2] === 0xff) return "image/jpeg";
  if (header.length >= 16 && ascii(header, 0, 4) === "RIFF" &&
      ascii(header, 8, 4) === "WEBP" &&
      ["VP8 ", "VP8L", "VP8X"].includes(ascii(header, 12, 4))) return "image/webp";
  return null;
}

export function imageAltFromFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.(png|jpe?g|webp)$/i, "") || "Imagen";
  // Escape Markdown delimiters; keep the alt label user-editable in the document.
  return withoutExtension.replace(/[\r\n]+/g, " ").replace(/[\\[\]]/g, "\\$&");
}

export function portableImageMarkdown(filename: string, dataUrl: string): string {
  if (!isSafeEmbeddedRasterUrl(dataUrl)) {
    throw new Error("La imagen embebida no es un PNG, JPEG o WebP válido.");
  }
  return "\n\n![" + imageAltFromFilename(filename) + "](" + dataUrl + ")\n\n";
}
