/**
 * BWJM Studio appearance themes. The six named palettes reproduce the color
 * samples supplied by the user. Themes customize the editor chrome only,
 * never mathematical data, curves, saved documents or exported scientific plots.
 */
export const STUDIO_THEMES = [
  {id:"linear",name:"Linear Obsidian",description:"Oscuro original",colors:["#08090A","#0F1011","#5E6AD2","#8A8F98","#38BDF8","#F7F8F8"]},
  {id:"catppuccin",name:"Catppuccin Mocha",description:"Violeta oscuro",colors:["#11111B","#181825","#CBA6F7","#A6ADC8","#89DCEB","#CDD6F4"]},
  {id:"tokyonight",name:"Tokyo Night",description:"Azul oscuro",colors:["#16161E","#1A1B26","#7AA2F7","#9AA5CE","#7DCFFF","#C0CAF5"]},
  {id:"bruma",name:"Bruma rosada",description:"Paleta 1 · Malva y azul grisáceo",colors:["#EADED4","#555F77","#AA6077","#A1BECD","#C88488","#AC746C"]},
  {id:"marea",name:"Marea esmeralda",description:"Paleta 2 · Verde agua y naranja",colors:["#D4DDC6","#AA2E27","#074659","#D98229","#049494","#9F7570"]},
  {id:"lino",name:"Lino y café",description:"Paleta 3 · Arena y carbón",colors:["#9D8B75","#050505","#DBC4A4","#F2F1EC","#545453","#7A6A54"]},
  {id:"oliva",name:"Oliva mineral",description:"Paleta 4 · Oliva y piedra",colors:["#B9B77C","#151411","#F9F9F1","#71726F","#746644","#5C5C5C"]},
  {id:"bosque",name:"Bosque ocre",description:"Paleta 5 · Verde bosque y terracota",colors:["#243214","#CB8740","#FBFBE3","#5C6B34","#ACAC94","#5C2C0C"]},
  {id:"arcilla",name:"Arcilla cálida",description:"Paleta 6 · Rojo y terracota",colors:["#B22414","#E7C6BB","#9C7668","#CD9682","#543E31","#E77B6C"]},
] as const;

export type StudioThemeId = (typeof STUDIO_THEMES)[number]["id"];
export const DEFAULT_STUDIO_THEME: StudioThemeId = "linear";
export const THEME_STORAGE_KEY = "bwjm-studio:appearance-theme";

export function isStudioTheme(value: unknown): value is StudioThemeId {
  return typeof value === "string" && STUDIO_THEMES.some(theme => theme.id === value);
}
export function resolveStoredTheme(value: unknown): StudioThemeId {
  return isStudioTheme(value) ? value : DEFAULT_STUDIO_THEME;
}
export function readStoredTheme(): StudioThemeId {
  try {
    if (typeof window === "undefined") return DEFAULT_STUDIO_THEME;
    return resolveStoredTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_STUDIO_THEME;
  }
}
export function persistStudioTheme(theme: StudioThemeId): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(THEME_STORAGE_KEY,theme);
  } catch {
    // Private browsing and disabled local storage must not break the editor.
  }
}
