export type ScientificCell = string | number | boolean | null;
export type ScientificTableFormat = "csv" | "tsv" | "json";

/** Protect text values that spreadsheets might otherwise evaluate as formulas. */
function protectSpreadsheetCell(cell: ScientificCell): string {
  if (cell === null) return "";
  const value = String(cell);
  return typeof cell === "string" && /^\s*[=+@-]/.test(value) ? "'" + value : value;
}

export function serializeScientificTable(
  columns: readonly string[],
  rows: readonly (readonly ScientificCell[])[],
  format: ScientificTableFormat,
): string {
  if (columns.length < 1 || columns.length > 25 || rows.length > 500) {
    throw new Error("Tabla fuera de límites (1–25 columnas y máximo 500 filas)");
  }
  if (rows.some(row => row.length !== columns.length)) {
    throw new Error("Las filas deben tener el mismo número de celdas que las columnas");
  }
  if (format === "json") {
    return JSON.stringify(rows.map(row => Object.fromEntries(columns.map((name, i) => [name, row[i]]))), null, 2);
  }
  const separator = format === "tsv" ? "\t" : ",";
  const encode = (value: ScientificCell): string => {
    const content = protectSpreadsheetCell(value);
    return content.includes('"') || content.includes(separator) || /[\r\n]/.test(content)
      ? '"' + content.replace(/"/g, '""') + '"'
      : content;
  };
  return [columns.map(c => encode(c)), ...rows.map(row => row.map(c => encode(c)))]
    .map(cells => cells.join(separator)).join("\r\n") + "\r\n";
}
