import {describe,it,expect} from "vitest";
import {
  STUDIO_THEMES, DEFAULT_STUDIO_THEME, THEME_STORAGE_KEY,
  isStudioTheme, resolveStoredTheme,
} from "../src/studioThemes.js";

describe("theme catalog and six supplied palettes",()=>{
  it("contains the three original themes and six new ones, without duplicates",()=>{
    expect(STUDIO_THEMES.map(item=>item.id)).toEqual([
      "linear","catppuccin","tokyonight",
      "bruma","marea","lino","oliva","bosque","arcilla",
    ]);
    expect(new Set(STUDIO_THEMES.map(item=>item.id)).size).toBe(9);
  });
  it("uses the six visible hexadecimal swatches in the supplied image",()=>{
    const find=(id:string)=>STUDIO_THEMES.find(item=>item.id===id)?.colors;
    expect(find("bruma")).toEqual(["#EADED4","#555F77","#AA6077","#A1BECD","#C88488","#AC746C"]);
    expect(find("marea")).toEqual(["#D4DDC6","#AA2E27","#074659","#D98229","#049494","#9F7570"]);
    expect(find("lino")).toEqual(["#9D8B75","#050505","#DBC4A4","#F2F1EC","#545453","#7A6A54"]);
    expect(find("oliva")).toEqual(["#B9B77C","#151411","#F9F9F1","#71726F","#746644","#5C5C5C"]);
    expect(find("bosque")).toEqual(["#243214","#CB8740","#FBFBE3","#5C6B34","#ACAC94","#5C2C0C"]);
    expect(find("arcilla")).toEqual(["#B22414","#E7C6BB","#9C7668","#CD9682","#543E31","#E77B6C"]);
  });
  it("validates persisted names instead of trusting arbitrary storage values",()=>{
    expect(isStudioTheme("bruma")).toBe(true);
    expect(isStudioTheme("not-a-theme")).toBe(false);
    expect(resolveStoredTheme("arcilla")).toBe("arcilla");
    expect(resolveStoredTheme("not-a-theme")).toBe(DEFAULT_STUDIO_THEME);
    expect(resolveStoredTheme(null)).toBe("linear");
    expect(THEME_STORAGE_KEY).toBe("bwjm-studio:appearance-theme");
  });
  it("defines a valid six-swatch strip for every theme",()=>{
    for(const theme of STUDIO_THEMES) {
      expect(theme.name.trim().length).toBeGreaterThan(0);
      expect(theme.colors).toHaveLength(6);
      theme.colors.forEach(color=>expect(color).toMatch(/^#[0-9A-F]{6}$/));
    }
  });
});
