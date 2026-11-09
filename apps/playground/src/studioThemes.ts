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
  {"id":"bruma-celeste","name":"Bruma celeste","description":"Celeste suave · antes solo en la muestra","colors":["#A1BECD","#555F77","#F5F8FA","#E5EDF1","#526169","#1D2225"]},
  {"id":"bruma-rosa","name":"Bruma rosa antigua","description":"Rosa empolvado · color recuperado","colors":["#C88488","#555F77","#F9F1F2","#F0DDDE","#664345","#241818"]},
  {"id":"bruma-terracota","name":"Bruma terracota","description":"Terracota y cielo · color recuperado","colors":["#AC746C","#A1BECD","#F6F0EF","#E8D8D6","#583B37","#1F1513"]},
  {"id":"marea-carmesi","name":"Marea carmesí","description":"Granate y lino · color recuperado","colors":["#AA2E27","#D4DDC6","#F6E8E7","#E7C4C3","#571714","#1F0807"]},
  {"id":"marea-piedra","name":"Marea piedra","description":"Piedra rosada · color recuperado","colors":["#9F7570","#074659","#F4F0EF","#E4D8D7","#513C39","#1D1514"]},
  {"id":"lino-tinta","name":"Lino tinta","description":"Negro profundo y arena · color recuperado","colors":["#050505","#DBC4A4","#050505","#282C2F","#E2CFB5","#F9F7EF"]},
  {"id":"lino-canela","name":"Lino canela","description":"Canela y papel · color recuperado","colors":["#DBC4A4","#7A6A54","#FBF9F5","#F5EEE6","#706454","#27231E"]},
  {"id":"oliva-salvia","name":"Oliva salvia","description":"Salvia clara · color recuperado","colors":["#B9B77C","#746644","#F7F7F1","#EBEBDA","#5E5D3F","#212116"]},
  {"id":"oliva-carbon","name":"Oliva carbón","description":"Negro olivo · color recuperado","colors":["#151411","#B9B77C","#151411","#2F3235","#C6C595","#F9F7EF"]},
  {"id":"bosque-musgo","name":"Bosque musgo","description":"Musgo intenso · color recuperado","colors":["#5C6B34","#ACAC94","#5C6B34","#4F5945","#BCBCA8","#F9F7EF"]},
  {"id":"bosque-cacao","name":"Bosque cacao","description":"Cacao oscuro · color recuperado","colors":["#5C2C0C","#CB8740","#5C2C0C","#4F3D33","#D59E64","#F9F7EF"]},
  {"id":"arcilla-salmon","name":"Arcilla salmón","description":"Salmón mate · color recuperado","colors":["#E77B6C","#9C7668","#FCF0EF","#F8DAD6","#763F37","#2A1613"]},
  {"id":"nord-polar","name":"Nord Polar","description":"Inspirado en Nord · frío y sereno","colors":["#2E3440","#3B4252","#434C5E","#D8DEE9","#88C0D0","#5E81AC"]},
  {"id":"dracula","name":"Dracula","description":"Inspirado en Dracula · violeta nocturno","colors":["#282A36","#44475A","#6272A4","#F8F8F2","#BD93F9","#8BE9FD"]},
  {"id":"rose-pine","name":"Rosé Pine","description":"Inspirado en Rosé Pine · malva y pino","colors":["#191724","#1F1D2E","#26233A","#E0DEF4","#C4A7E7","#9CCFD8"]},
  {"id":"catppuccin-latte","name":"Catppuccin Latte","description":"Inspirado en Catppuccin · pastel claro","colors":["#EFF1F5","#E6E9EF","#CCD0DA","#4C4F69","#8839EF","#1E66F5"]},
] as const;

/** Group labels used by the searchable theme gallery; add future themes by ID. */
export const STUDIO_THEME_GROUPS = [
  {id:"classic",label:"Temas clásicos",description:"Los tres estilos preexistentes",ids:["linear","catppuccin","tokyonight"]},
  {id:"user",label:"Paletas originales",description:"Los seis esquemas que compartiste",ids:["bruma","marea","lino","oliva","bosque","arcilla"]},
  {id:"recovered",label:"Colores recuperados",description:"Doce nuevos estilos basados en los tonos que faltaban",ids:["bruma-celeste","bruma-rosa","bruma-terracota","marea-carmesi","marea-piedra","lino-tinta","lino-canela","oliva-salvia","oliva-carbon","bosque-musgo","bosque-cacao","arcilla-salmon"]},
  {id:"inspired",label:"Inspirados en temas conocidos",description:"Referencias documentadas de la comunidad",ids:["nord-polar","dracula","rose-pine","catppuccin-latte"]},
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
