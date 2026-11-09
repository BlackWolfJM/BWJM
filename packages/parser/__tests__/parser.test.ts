import { describe, it, expect } from "vitest";
import { parseMathMD } from "../src/index.js";

describe("MathMD Parser", () => {
  it("parses a reusable animated parametric curve in two dimensions", () => {
    const markdown = [
      "```parametric2d", "x: cos(t)", "y: sin(t)", "tDomain: [0, 6.28318]",
      "samples: 150", "showTrail: true", "showNormal: true", "```",
    ].join("\n");
    const result = parseMathMD(markdown);
    expect(result.children).toHaveLength(1);
    expect(result.children[0].type).toBe("parametric2d");
  });

  it("parses portable generated tables and charts from a single document", () => {
    const markdown = [
      "```functiontable", "id: movement", "variable: t", "domain: [0, 3]",
      "samples: 4", "columns: [t, pos, speed]", "expressions: [t^2, 2*t]", "```",
      "```datachart", "tableRef: movement", "kind: scatter",
      "x: t", "y: pos", "trendline: true", "```",
      "```statistics", "tableRef: movement", "column: pos",
      "pairedColumn: speed", "```",
    ].join("\n");
    const result = parseMathMD(markdown);
    expect(result.children.map(node => node.type)).toEqual(["functiontable", "datachart", "statistics"]);
    expect(result.diagnostics).toHaveLength(0);
  });
  it("rejects function tables with mismatched columns", () => {
    const markdown = ["```functiontable", "columns: [t, a]",
      "expressions: [sin(t), cos(t)]", "domain: [0, 2]", "```"].join("\n");
    const result = parseMathMD(markdown);
    expect(result.children).toHaveLength(0);
    expect(result.diagnostics.some(d => d.code === "MATHMD_TABLE_DIMENSIONS")).toBe(true);
  });

  it("parses scientific data tables and rejects invalid row widths", () => {
    const valid = parseMathMD("\n```datatable\ncolumns: [t, x]\nunits: [s, m]\nrows:\n  - [0, 2]\n  - [1, 3]\n```\n");
    expect(valid.children).toHaveLength(1);
    expect(valid.children[0].type).toBe("datatable");
    const invalid = parseMathMD("\n```datatable\ncolumns: [t, x]\nrows:\n  - [0]\n```\n");
    expect(invalid.children).toHaveLength(0);
    expect(invalid.diagnostics.some(d => d.code === "MATHMD_TABLE_DIMENSIONS")).toBe(true);
  });

  it("should parse a simple plot2d block", () => {
    const markdown = `
\`\`\`plot2d
equation: x^2
x: [-5, 5]
\`\`\`
`;

    const doc = parseMathMD(markdown);
    expect(doc.type).toBe("document");
    expect(doc.children.length).toBe(1);

    const node = doc.children[0];
    expect(node.type).toBe("plot2d");
  });

  it("should parse a surface3d block", () => {
    const markdown = `
\`\`\`surface3d
equation: x^2 + y^2
x: [-5, 5]
y: [-5, 5]
\`\`\`
`;

    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(1);

    const node = doc.children[0];
    expect(node.type).toBe("surface3d");
  });

  it("should parse multiple blocks", () => {
    const markdown = `
\`\`\`plot2d
equation: sin(x)
x: [0, 6.28]
\`\`\`

\`\`\`slider
name: a
min: 0
max: 10
\`\`\`
`;

    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(2);

    expect(doc.children[0].type).toBe("plot2d");
    expect(doc.children[1].type).toBe("slider");
  });

  it("should handle variables in equations", () => {
    const markdown = `
\`\`\`slider
name: a
min: -5
max: 5
\`\`\`

\`\`\`plot2d
equation: a*x^2
x: [-10, 10]
\`\`\`
`;

    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(2);

    const slider = doc.children[0];
    expect(slider.type).toBe("slider");
    if (slider.type === "slider") {
      expect(slider.name).toBe("a");
    }

    const plot = doc.children[1];
    expect(plot.type).toBe("plot2d");
    if (plot.type === "plot2d") {
      expect(plot.equation).toBe("a*x^2");
    }
  });

  it("should correctly parse kebab-case properties on gradient nodes", () => {
    const markdown = `
\`\`\`gradient
function: x^2 + y^2
point: [1, 2]
show-surface: false
show-level-curves: false
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(1);
    const node = doc.children[0];
    expect(node.type).toBe("gradient");
    if (node.type === "gradient") {
      expect(node.point).toEqual([1, 2]);
      expect(node.showSurface).toBe(false);
      expect(node.showLevelCurves).toBe(false);
    }
  });

  it("should defend against prototype pollution keys in YAML front matter", () => {
    const markdown = `
\`\`\`plot2d
equation: x^2
__proto__: polluter
constructor: polluter
prototype: polluter
x: [-5, 5]
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(1);
    const obj: Record<string, unknown> = {};
    expect(obj["polluter"]).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "polluter")).toBe(false);
  });

  it("should enforce bounds on surface3d samples to prevent DoS", () => {
    const markdown = `
\`\`\`surface3d
equation: x^2 + y^2
x: [-5, 5]
y: [-5, 5]
samples: 999999
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(1);
    const node = doc.children[0];
    if (node.type === "surface3d") {
      expect(node.samples).toBe(200);
    }
    expect(doc.diagnostics.some((d) => d.code === "MATHMD_VALUE_CLAMPED")).toBe(true);
  });

  // --- Mandatory TDD Test Cases from TASK-003B ---

  it("should produce deep equality when parsing identical source twice", () => {
    const markdown = `# Title\n\n\`\`\`plot2d\nequation: x^2\nx: [-2, 2]\n\`\`\`\n\nText\n\n\`\`\`slider\nname: k\nmin: 1\nmax: 10\n\`\`\`\n`;
    const doc1 = parseMathMD(markdown);
    const doc2 = parseMathMD(markdown);
    expect(doc1).toEqual(doc2);
  });

  it("should generate unique IDs within document across blocks", () => {
    const markdown = `
\`\`\`plot2d
equation: x
x: [-1, 1]
\`\`\`

\`\`\`plot2d
equation: x^2
x: [-1, 1]
\`\`\`

\`\`\`plot2d
equation: x^3
x: [-1, 1]
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(3);
    const ids = doc.children.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
    expect(ids[0]).toMatch(/^plot2d-0-[0-9a-f]{8}$/);
    expect(ids[1]).toMatch(/^plot2d-1-[0-9a-f]{8}$/);
    expect(ids[2]).toMatch(/^plot2d-2-[0-9a-f]{8}$/);
  });

  it("should preserve valid explicit ID", () => {
    const markdown = `
\`\`\`plot2d
id: custom-plot-42
equation: x^3
x: [-2, 2]
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(1);
    expect(doc.children[0].id).toBe("custom-plot-42");
    expect(doc.diagnostics.length).toBe(0);
  });

  it("should diagnose invalid explicit ID and omit block", () => {
    const markdown = `
\`\`\`plot2d
id: "invalid id with spaces & symbols!"
equation: x^2
x: [-2, 2]
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(0);
    const invalidIdDiag = doc.diagnostics.find((d) => d.code === "MATHMD_ID_INVALID");
    expect(invalidIdDiag).toBeDefined();
    expect(invalidIdDiag?.severity).toBe("error");
    expect(invalidIdDiag?.blockType).toBe("plot2d");
  });

  it("should diagnose duplicate ID and omit duplicate block", () => {
    const markdown = `
\`\`\`plot2d
id: shared-id
equation: x
x: [-1, 1]
\`\`\`

\`\`\`slider
id: shared-id
name: a
min: 0
max: 5
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(1);
    expect(doc.children[0].type).toBe("plot2d");
    const dupDiag = doc.diagnostics.find((d) => d.code === "MATHMD_DUPLICATE_ID");
    expect(dupDiag).toBeDefined();
    expect(dupDiag?.severity).toBe("error");
    expect(dupDiag?.blockId).toBe("shared-id");
  });

  it("should retain exact fence range with line, column, and offset", () => {
    const markdown = "Hello\n\n```plot2d\nequation: x\nx: [-1, 1]\n```\n";
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(1);
    const range = doc.children[0].range;
    expect(range.start.line).toBe(3);
    expect(range.start.column).toBe(1);
    expect(range.start.offset).toBe(7);
    expect(range.end.line).toBe(6);
    expect(range.end.column).toBe(4);
    expect(range.end.offset).toBe(43);
  });

  it("should preserve source byte-for-byte in document.source", () => {
    const markdown = "  # MathMD Title\n\nSome text with *markdown*.\n```plot2d\nequation: x\nx: [-1, 1]\n```\n";
    const doc = parseMathMD(markdown);
    expect(doc.source).toBe(markdown);
  });

  it("should ignore standard Markdown, GFM tables, math LaTeX, and non-MathMD fences", () => {
    const markdown = `
# Markdown Header

Paragraph with inline math: $E = mc^2$.

$$
\\int_0^\\infty e^{-x} dx = 1
$$

| Header 1 | Header 2 |
|----------|----------|
| Val 1    | Val 2    |

\`\`\`python
print("Hello Python")
\`\`\`

\`\`\`text
Plain text fence
\`\`\`

\`\`\`plot2d
equation: x^2
x: [-1, 1]
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(1);
    expect(doc.children[0].type).toBe("plot2d");
    expect(doc.diagnostics.length).toBe(0);
  });

  it("should safely handle Unicode content without breaking parser", () => {
    const markdown = `
\`\`\`plot2d
equation: α*x^2 + β
label: "Función cuadrática αβγδ 🚀"
x: [-5, 5]
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(1);
    const node = doc.children[0];
    if (node.type === "plot2d") {
      expect(node.label).toBe("Función cuadrática αβγδ 🚀");
    }
    expect(doc.diagnostics.length).toBe(0);
  });

  it("should diagnose malformed YAML syntax and process subsequent blocks", () => {
    const markdown = `
\`\`\`plot2d
equation: x^2
this is: [unclosed list
\`\`\`

\`\`\`slider
name: b
min: 0
max: 10
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(1);
    expect(doc.children[0].type).toBe("slider");
    const synDiag = doc.diagnostics.find((d) => d.code === "MATHMD_SYNTAX_INVALID");
    expect(synDiag).toBeDefined();
    expect(synDiag?.severity).toBe("error");
    expect(synDiag?.blockType).toBe("plot2d");
  });

  it("should expose detailed Zod schema error with code, blockType, range, and path", () => {
    const markdown = `
\`\`\`plot2d
equation: ""
x: [-5, 5]
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(0);
    const schemaDiag = doc.diagnostics.find((d) => d.code === "MATHMD_SCHEMA_INVALID");
    expect(schemaDiag).toBeDefined();
    expect(schemaDiag?.severity).toBe("error");
    expect(schemaDiag?.blockType).toBe("plot2d");
    expect(schemaDiag?.range).toBeDefined();
    expect(schemaDiag?.path).toEqual(["equation"]);
  });

  it("should not fall back to default when explicit invalid value is given", () => {
    const markdown = `
\`\`\`plot2d
equation: x^2
grid: "not-a-boolean"
x: [-5, 5]
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(0);
    const diag = doc.diagnostics.find((d) => d.code === "MATHMD_SCHEMA_INVALID");
    expect(diag).toBeDefined();
    expect(diag?.path).toEqual(["grid"]);
  });

  it("should use documented default when field is omitted", () => {
    const markdown = `
\`\`\`plot2d
equation: x^2
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(1);
    const node = doc.children[0];
    if (node.type === "plot2d") {
      expect(node.xDomain).toEqual([-5, 5]);
      expect(node.grid).toBe(true);
      expect(node.axes).toBe(true);
      expect(node.interactive).toBe(true);
    }
  });

  it("should emit MATHMD_VALUE_CLAMPED when clamping samples or density", () => {
    const markdown = `
\`\`\`surface3d
equation: x*y
x: [-2, 2]
y: [-2, 2]
samples: 1
\`\`\`

\`\`\`vectorfield2d
field: ["-y", "x"]
x: [-3, 3]
y: [-3, 3]
density: 100
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(2);

    const sNode = doc.children[0];
    if (sNode.type === "surface3d") {
      expect(sNode.samples).toBe(2);
    }

    const vNode = doc.children[1];
    if (vNode.type === "vectorfield2d") {
      expect(vNode.density).toBe(50);
    }

    const clampDiags = doc.diagnostics.filter((d) => d.code === "MATHMD_VALUE_CLAMPED");
    expect(clampDiags.length).toBe(2);
  });

  it("should not evaluate math expressions during parsing and report MATHMD_SCHEMA_INVALID for [0, 2*pi]", () => {
    const markdown = `
\`\`\`plot2d
equation: sin(x)
x: [0, 2*pi]
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(0);
    const diag = doc.diagnostics.find((d) => d.code === "MATHMD_SCHEMA_INVALID");
    expect(diag).toBeDefined();
  });

  it("should parse all 15 valid block types in a comprehensive document", () => {
    const markdown = `
\`\`\`plot2d
equation: sin(x)
x: [-3.14, 3.14]
\`\`\`

\`\`\`surface3d
equation: x^2 - y^2
x: [-2, 2]
y: [-2, 2]
\`\`\`

\`\`\`vector2d
origin: [0, 0]
vector: [1, 2]
\`\`\`

\`\`\`vector3d
origin: [0, 0, 0]
vector: [1, 2, 3]
\`\`\`

\`\`\`curve3d
x: cos(t)
y: sin(t)
z: t
t: [0, 6.28]
\`\`\`

\`\`\`vectorfield2d
field: ["-y", "x"]
x: [-5, 5]
y: [-5, 5]
\`\`\`

\`\`\`gradient
function: x^2 + y^2
point: [1, 2]
\`\`\`

\`\`\`tangentplane
function: x^2 + y^2
point: [1, 1]
\`\`\`

\`\`\`slider
name: a
min: 0
max: 10
step: 0.5
default: 5
\`\`\`

\`\`\`checkbox
name: visible
default: true
\`\`\`

\`\`\`point2d
x: 3
y: 4
label: P
\`\`\`

\`\`\`point3d
x: 1
y: 2
z: 3
label: Q
\`\`\`

\`\`\`diagram
elements: "A -> B -> C"
\`\`\`

\`\`\`geometry
primitives:
  - type: line
    points: [[0, 0], [1, 1]]
\`\`\`

\`\`\`contour
function: x^2 + y^2
x: [-3, 3]
y: [-3, 3]
levels: 10
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(15);
    expect(doc.diagnostics.length).toBe(0);

    const types = doc.children.map((c) => c.type);
    expect(types).toEqual([
      "plot2d",
      "surface3d",
      "vector2d",
      "vector3d",
      "curve3d",
      "vectorfield2d",
      "gradient",
      "tangentplane",
      "slider",
      "checkbox",
      "point2d",
      "point3d",
      "diagram",
      "geometry",
      "contour",
    ]);
  });

  it("should safely parse unquoted hex colors without treating them as comments or failing validation", () => {
    const markdown = `
\`\`\`plot2d
equation: x^2
x: [0, 1]
color: #0284c7
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(1);
    expect(doc.diagnostics.length).toBe(0);
    const plot = doc.children[0];
    if (plot.type === "plot2d") {
      expect(plot.color).toBe("#0284c7");
    }
  });

  it("should parse timeline block with min and max normalized to domain (P0-01)", () => {
    const markdown = `
\`\`\`timeline
name: t
min: 0
max: 6.28
default: 0
speed: 1.0
loop: true
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(1);
    expect(doc.diagnostics.length).toBe(0);
    const node = doc.children[0];
    expect(node.type).toBe("timeline");
    if (node.type === "timeline") {
      expect(node.name).toBe("t");
      expect(node.domain).toEqual([0, 6.28]);
      expect(node.default).toBe(0);
      expect(node.speed).toBe(1.0);
      expect(node.loop).toBe(true);
    }
  });

  it("should parse timeline block with explicit domain: [min, max]", () => {
    const markdown = `
\`\`\`timeline
name: u
domain: [1, 10]
default: 2
speed: 2.0
loop: false
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(1);
    expect(doc.diagnostics.length).toBe(0);
    const node = doc.children[0];
    expect(node.type).toBe("timeline");
    if (node.type === "timeline") {
      expect(node.name).toBe("u");
      expect(node.domain).toEqual([1, 10]);
      expect(node.default).toBe(2);
      expect(node.speed).toBe(2.0);
      expect(node.loop).toBe(false);
    }
  });

  it("should parse scene blocks trajectory, particle, frame, vectorarrow, and field", () => {
    const markdown = `
\`\`\`trajectory
id: traj-1
x: cos(t)
y: sin(t)
z: t
tDomain: [0, 6.28]
\`\`\`

\`\`\`particle
trajectoryRef: traj-1
showTrail: true
trailLength: 20
\`\`\`

\`\`\`frame
trajectoryRef: traj-1
showT: true
showN: true
showB: true
\`\`\`

\`\`\`vectorarrow
origin: [0, 0, 0]
vector: [1, 2, 3]
label: v
color: #10b981
\`\`\`

\`\`\`field
dimensions: 2
components: ["-y", "x"]
xDomain: [-3, 3]
yDomain: [-3, 3]
density: 10
\`\`\`
`;
    const doc = parseMathMD(markdown);
    expect(doc.children.length).toBe(5);
    expect(doc.diagnostics.length).toBe(0);
    expect(doc.children.map((c) => c.type)).toEqual([
      "trajectory",
      "particle",
      "frame",
      "vectorarrow",
      "field",
    ]);
  });
});