import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { STUDIO_THEMES } from "../src/studioThemes.js";

// Guard theme CSS against regressions where light palette chrome inherits the
// default dark body's near-white text and becomes invisible.
const css = readFileSync(new URL("../src/theme.css", import.meta.url), "utf8");

function parseTokens(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)]
      .map(match => [match[1], match[2].trim()])
  );
}
function resolvedThemeTokens(id: string): Record<string, string> {
  const base: Record<string, string> = {};
  for (const match of css.matchAll(/:root\s*\{([^}]*)\}/g)) {
    Object.assign(base, parseTokens(match[1]));
  }
  if (id === "linear") return base;
  const theme: Record<string, string> = {};
  for (const match of css.matchAll(new RegExp("\\.theme-" + id + "\\s*\\{([^}]*)\\}", "g"))) {
    Object.assign(theme, parseTokens(match[1]));
  }
  return { ...base, ...theme };
}
function luminance(hex: string): number {
  if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error("Not an RGB hex color: " + hex);
  return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16))
    .map(channel => {
      const value = channel / 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    })
    .reduce((acc, value, index) => acc + value * [.2126, .7152, .0722][index], 0);
}
function contrast(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
describe("all 25 BWJM themes: readable typography and accessible contrast", () => {
  it("inherits theme text inside the app, not the default body's dark-theme color", () => {
    expect(css).toMatch(/\.bwjm-app-container\s*\{\s*color:\s*var\(--text-main\)/);
    expect(css).toMatch(/\.bwjm-studio-name\s*\{\s*color:\s*var\(--text-main\)/);
  });
  it("uses legible menu and tab text sizes rather than sub-12px labels", () => {
    expect(css).toMatch(/\.bwjm-ribbon-tab\s*\{[^}]*font-size:\s*\.86rem/);
    expect(css).toMatch(/\.bwjm-document-tab\s*>\s*button:first-child\s*\{[^}]*font-size:\s*\.84rem/);
    expect(css).toMatch(/\.bwjm-studio-subtitle\s*\{[^}]*font-size:\s*\.81rem/);
  });
  it.each(STUDIO_THEMES.map(theme => theme.id))(
    "validates readable text against the 4 main chrome surfaces in theme %s",
    (id) => {
      const tokens = resolvedThemeTokens(id);
      const surfaces = ["--bg-app", "--bg-surface", "--bg-panel", "--bg-elevated"];
      for (const surface of surfaces) {
        for (const role of ["--text-main", "--text-secondary", "--text-muted", "--primary-readable"]) {
          expect(contrast(tokens[role], tokens[surface])).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(contrast(tokens["--status-success-text"], tokens["--bg-surface"])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens["--status-error-text"], tokens["--bg-surface"])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens["--on-primary"], tokens["--primary"])).toBeGreaterThanOrEqual(4.5);
    },
  );
});
