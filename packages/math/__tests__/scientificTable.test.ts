import { describe, it, expect } from "vitest";
import { serializeScientificTable } from "../src/scientificTable.js";
import { expressionToLatex } from "../src/latex.js";

describe("Scientific table exports", () => {
  it("exports UTF-8 CSV and escapes quotes, commas and newlines", () => {
    const csv = serializeScientificTable(["Tiempo", "Dato"], [[0, 'valor, "citado"'], [1, "área\nnueva"]], "csv");
    expect(csv).toContain('"valor, ""citado"""');
    expect(csv).toContain('"área\nnueva"');
  });
  it("keeps numbers numeric in JSON", () => {
    const text = serializeScientificTable(["t", "x"], [[0, 1.5], [1, null]], "json");
    expect(JSON.parse(text)).toEqual([{ t: 0, x: 1.5 }, { t: 1, x: null }]);
  });
  it("protects CSV and TSV from spreadsheet injection", () => {
    expect(serializeScientificTable(["x"], [["=HYPERLINK(1)"]], "csv")).toContain("'=HYPERLINK");
    expect(serializeScientificTable(["x"], [["+SUM(1)"]], "tsv")).toContain("'+SUM");
  });
  it("rejects rows with mismatched cell counts", () => {
    expect(() => serializeScientificTable(["a", "b"], [[1]], "csv")).toThrow(/filas/i);
  });
});

describe("Scientific math labels", () => {
  it("produces mathematical TeX for a radial wave", () => {
    const latex = expressionToLatex("sin(sqrt(x^2 + y^2))");
    expect(latex).toContain("sin");
    expect(latex).toContain("sqrt");
  });
});
