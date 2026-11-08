import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import YAML from "yaml";
import {
  MathMDDocument,
  MathMDNode,
  MathMDDiagnostic,
  SourceRange,
  generateID,
  plot2dSchema,
  surface3dSchema,
  vector2dSchema,
  vector3dSchema,
  curve3dSchema,
  vectorfield2dSchema,
  gradientSchema,
  tangentplaneSchema,
  sliderSchema,
  checkboxSchema,
  point2dSchema,
  point3dSchema,
  diagramSchema,
  geometrySchema,
  contourSchema,
} from "@mathmd/ast";

interface MdastPosition {
  start: { line: number; column: number; offset: number };
  end: { line: number; column: number; offset: number };
}

interface MdastNode {
  type: string;
  lang?: string | null;
  value?: string;
  position?: MdastPosition;
  children?: MdastNode[];
}

const SUPPORTED_MATHMD_TYPES = new Set([
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

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

function extractRange(node: MdastNode): SourceRange {
  if (
    node.position &&
    typeof node.position.start?.line === "number" &&
    typeof node.position.start?.column === "number" &&
    typeof node.position.start?.offset === "number" &&
    typeof node.position.end?.line === "number" &&
    typeof node.position.end?.column === "number" &&
    typeof node.position.end?.offset === "number"
  ) {
    return {
      start: {
        line: node.position.start.line,
        column: node.position.start.column,
        offset: node.position.start.offset,
      },
      end: {
        line: node.position.end.line,
        column: node.position.end.column,
        offset: node.position.end.offset,
      },
    };
  }
  return {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 1, offset: 0 },
  };
}

function parseFrontMatter(content: string): { data: Record<string, unknown> } | { error: string } {
  const nonCommentLines = content.split("\n").filter((l) => {
    const t = l.trim();
    return t.length > 0 && !t.startsWith("#");
  });
  if (nonCommentLines.length === 0) {
    return { data: {} };
  }

  // Preprocess: quote unquoted hex colors like `color: #0284c7` so YAML doesn't treat `#` as a comment
  const preprocessed = content.replace(/(:\s*)(#[0-9a-fA-F]{3,8})\b/g, '$1"$2"');

  try {
    const doc = YAML.parseDocument(preprocessed);
    if (doc.errors.length > 0) {
      return { error: doc.errors.map((e) => e.message).join("; ") };
    }

    let forbiddenMessage: string | null = null;
    YAML.visit(doc, {
      Alias() {
        forbiddenMessage = "YAML aliases are not permitted in MathMD blocks";
      },
      Node(_, node) {
        if ("tag" in node && node.tag) {
          forbiddenMessage = `YAML tags are not permitted: ${node.tag}`;
        }
      },
    });

    if (forbiddenMessage) {
      return { error: forbiddenMessage };
    }

    if (!YAML.isMap(doc.contents)) {
      return { error: "Block frontmatter must be a key-value mapping" };
    }

    const raw = doc.toJSON();
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return { error: "Block frontmatter must be a key-value mapping" };
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (key === "__proto__" || key === "prototype" || key === "constructor") {
        continue;
      }
      sanitized[key] = value;
    }

    return { data: sanitized };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Builds and validates a single MathMD node from raw frontmatter data.
 * Emits diagnostics for schema issues, value clamping, or constraint violations.
 */
function buildMathMDNode(
  type: string,
  data: Record<string, unknown>,
  id: string,
  range: SourceRange,
  diagnostics: MathMDDiagnostic[]
): MathMDNode | null {
  const base = { id, range, type };

  let payload: Record<string, unknown>;

  switch (type) {
    case "plot2d": {
      payload = {
        ...base,
        equation: data.equation,
        xDomain: "x" in data ? data.x : "xDomain" in data ? data.xDomain : [-5, 5],
        yDomain: "y" in data ? data.y : "yDomain" in data ? data.yDomain : undefined,
        grid: "grid" in data ? data.grid : true,
        axes: "axes" in data ? data.axes : true,
        interactive: "interactive" in data ? data.interactive : true,
        label: data.label,
        color: typeof data.color === "string" ? data.color : undefined,
      };
      const result = plot2dSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) {
          diagnostics.push({
            severity: "error",
            code: "MATHMD_SCHEMA_INVALID",
            message: issue.message,
            range,
            blockType: type,
            blockId: id,
            path: issue.path,
          });
        }
        return null;
      }
      return result.data;
    }

    case "surface3d": {
      let samples = "samples" in data ? data.samples : 50;
      if (typeof samples === "number" && Number.isFinite(samples)) {
        if (samples < 2 || samples > 200) {
          const clamped = Math.min(Math.max(Math.round(samples), 2), 200);
          diagnostics.push({
            severity: "warning",
            code: "MATHMD_VALUE_CLAMPED",
            message: `Value of "samples" (${samples}) was clamped to ${clamped}`,
            range,
            blockType: type,
            blockId: id,
            path: ["samples"],
          });
          samples = clamped;
        }
      }

      payload = {
        ...base,
        equation: data.equation,
        xDomain: "x" in data ? data.x : "xDomain" in data ? data.xDomain : [-5, 5],
        yDomain: "y" in data ? data.y : "yDomain" in data ? data.yDomain : [-5, 5],
        samples,
        contours: "contours" in data ? data.contours : false,
        color: typeof data.color === "string" ? data.color : undefined,
      };

      const result = surface3dSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) {
          diagnostics.push({
            severity: "error",
            code: "MATHMD_SCHEMA_INVALID",
            message: issue.message,
            range,
            blockType: type,
            blockId: id,
            path: issue.path,
          });
        }
        return null;
      }
      return result.data;
    }

    case "vector2d": {
      payload = {
        ...base,
        origin: "origin" in data ? data.origin : [0, 0],
        vector: data.vector,
        label: data.label,
        color: typeof data.color === "string" ? data.color : undefined,
      };
      const result = vector2dSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) {
          diagnostics.push({
            severity: "error",
            code: "MATHMD_SCHEMA_INVALID",
            message: issue.message,
            range,
            blockType: type,
            blockId: id,
            path: issue.path,
          });
        }
        return null;
      }
      return result.data;
    }

    case "vector3d": {
      payload = {
        ...base,
        origin: "origin" in data ? data.origin : [0, 0, 0],
        vector: data.vector,
        label: data.label,
        color: typeof data.color === "string" ? data.color : undefined,
      };
      const result = vector3dSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) {
          diagnostics.push({
            severity: "error",
            code: "MATHMD_SCHEMA_INVALID",
            message: issue.message,
            range,
            blockType: type,
            blockId: id,
            path: issue.path,
          });
        }
        return null;
      }
      return result.data;
    }

    case "curve3d": {
      payload = {
        ...base,
        x: "x" in data ? data.x : "cos(t)",
        y: "y" in data ? data.y : "sin(t)",
        z: "z" in data ? data.z : "t",
        tDomain: "t" in data ? data.t : "tDomain" in data ? data.tDomain : [0, 2 * Math.PI],
        color: typeof data.color === "string" ? data.color : undefined,
      };
      const result = curve3dSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) {
          diagnostics.push({
            severity: "error",
            code: "MATHMD_SCHEMA_INVALID",
            message: issue.message,
            range,
            blockType: type,
            blockId: id,
            path: issue.path,
          });
        }
        return null;
      }
      return result.data;
    }

    case "vectorfield2d": {
      let density = "density" in data ? data.density : 15;
      if (typeof density === "number" && Number.isFinite(density)) {
        if (density < 2 || density > 50) {
          const clamped = Math.min(Math.max(Math.round(density), 2), 50);
          diagnostics.push({
            severity: "warning",
            code: "MATHMD_VALUE_CLAMPED",
            message: `Value of "density" (${density}) was clamped to ${clamped}`,
            range,
            blockType: type,
            blockId: id,
            path: ["density"],
          });
          density = clamped;
        }
      }

      payload = {
        ...base,
        field: data.field,
        xDomain: "x" in data ? data.x : "xDomain" in data ? data.xDomain : [-5, 5],
        yDomain: "y" in data ? data.y : "yDomain" in data ? data.yDomain : [-5, 5],
        density,
        color: typeof data.color === "string" ? data.color : undefined,
      };
      const result = vectorfield2dSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) {
          diagnostics.push({
            severity: "error",
            code: "MATHMD_SCHEMA_INVALID",
            message: issue.message,
            range,
            blockType: type,
            blockId: id,
            path: issue.path,
          });
        }
        return null;
      }
      return result.data;
    }

    case "gradient": {
      payload = {
        ...base,
        function: data.function,
        point: data.point,
        showSurface:
          "show-surface" in data
            ? data["show-surface"]
            : "showSurface" in data
              ? data.showSurface
              : true,
        showLevelCurves:
          "show-level-curves" in data
            ? data["show-level-curves"]
            : "showLevelCurves" in data
              ? data.showLevelCurves
              : true,
        color: typeof data.color === "string" ? data.color : undefined,
      };
      const result = gradientSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) {
          diagnostics.push({
            severity: "error",
            code: "MATHMD_SCHEMA_INVALID",
            message: issue.message,
            range,
            blockType: type,
            blockId: id,
            path: issue.path,
          });
        }
        return null;
      }
      return result.data;
    }

    case "tangentplane": {
      payload = {
        ...base,
        function: data.function,
        point: data.point,
        color: typeof data.color === "string" ? data.color : undefined,
      };
      const result = tangentplaneSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) {
          diagnostics.push({
            severity: "error",
            code: "MATHMD_SCHEMA_INVALID",
            message: issue.message,
            range,
            blockType: type,
            blockId: id,
            path: issue.path,
          });
        }
        return null;
      }
      return result.data;
    }

    case "slider": {
      const minVal = "min" in data ? data.min : -5;
      const maxVal = "max" in data ? data.max : 5;
      const stepVal = "step" in data ? data.step : 0.1;
      const defaultVal = "default" in data ? data.default : 0;

      payload = {
        ...base,
        name: data.name,
        min: minVal,
        max: maxVal,
        step: stepVal,
        default: defaultVal,
      };

      const result = sliderSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) {
          diagnostics.push({
            severity: "error",
            code: "MATHMD_SCHEMA_INVALID",
            message: issue.message,
            range,
            blockType: type,
            blockId: id,
            path: issue.path,
          });
        }
        return null;
      }

      // Check min < max and default within [min, max]
      const node = result.data;
      if (node.min >= node.max) {
        diagnostics.push({
          severity: "error",
          code: "MATHMD_SCHEMA_INVALID",
          message: "Slider min must be strictly less than max",
          range,
          blockType: type,
          blockId: id,
          path: ["min"],
        });
        return null;
      }

      if (node.default < node.min || node.default > node.max) {
        diagnostics.push({
          severity: "error",
          code: "MATHMD_SCHEMA_INVALID",
          message: "Slider default must be between min and max",
          range,
          blockType: type,
          blockId: id,
          path: ["default"],
        });
        return null;
      }

      return node;
    }

    case "checkbox": {
      payload = {
        ...base,
        name: data.name,
        label: data.label,
        default: "default" in data ? data.default : false,
      };
      const result = checkboxSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) {
          diagnostics.push({
            severity: "error",
            code: "MATHMD_SCHEMA_INVALID",
            message: issue.message,
            range,
            blockType: type,
            blockId: id,
            path: issue.path,
          });
        }
        return null;
      }
      return result.data;
    }

    case "point2d": {
      payload = {
        ...base,
        x: "x" in data ? data.x : 0,
        y: "y" in data ? data.y : 0,
        label: data.label,
        color: typeof data.color === "string" ? data.color : undefined,
      };
      const result = point2dSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) {
          diagnostics.push({
            severity: "error",
            code: "MATHMD_SCHEMA_INVALID",
            message: issue.message,
            range,
            blockType: type,
            blockId: id,
            path: issue.path,
          });
        }
        return null;
      }
      return result.data;
    }

    case "point3d": {
      payload = {
        ...base,
        x: "x" in data ? data.x : 0,
        y: "y" in data ? data.y : 0,
        z: "z" in data ? data.z : 0,
        label: data.label,
        color: typeof data.color === "string" ? data.color : undefined,
      };
      const result = point3dSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) {
          diagnostics.push({
            severity: "error",
            code: "MATHMD_SCHEMA_INVALID",
            message: issue.message,
            range,
            blockType: type,
            blockId: id,
            path: issue.path,
          });
        }
        return null;
      }
      return result.data;
    }

    case "diagram": {
      payload = {
        ...base,
        elements: data.elements,
      };
      const result = diagramSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) {
          diagnostics.push({
            severity: "error",
            code: "MATHMD_SCHEMA_INVALID",
            message: issue.message,
            range,
            blockType: type,
            blockId: id,
            path: issue.path,
          });
        }
        return null;
      }
      return result.data;
    }

    case "geometry": {
      payload = {
        ...base,
        primitives: "primitives" in data ? data.primitives : [],
      };
      const result = geometrySchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) {
          diagnostics.push({
            severity: "error",
            code: "MATHMD_SCHEMA_INVALID",
            message: issue.message,
            range,
            blockType: type,
            blockId: id,
            path: issue.path,
          });
        }
        return null;
      }
      return result.data;
    }

    case "contour": {
      payload = {
        ...base,
        function: data.function,
        xDomain: "x" in data ? data.x : "xDomain" in data ? data.xDomain : [-5, 5],
        yDomain: "y" in data ? data.y : "yDomain" in data ? data.yDomain : [-5, 5],
        levels: data.levels,
        color: typeof data.color === "string" ? data.color : undefined,
      };
      const result = contourSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) {
          diagnostics.push({
            severity: "error",
            code: "MATHMD_SCHEMA_INVALID",
            message: issue.message,
            range,
            blockType: type,
            blockId: id,
            path: issue.path,
          });
        }
        return null;
      }
      return result.data;
    }

    default:
      return null;
  }
}

/**
 * Parses a MathMD document string into a typed, validated MathMDDocument AST.
 * Preserves the exact Markdown source, extracts fence ranges, generates deterministic IDs,
 * detects duplicates, and collects structured diagnostics without modifying unrelated Markdown.
 */
export function parseMathMD(markdown: string): MathMDDocument {
  const root = unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(markdown) as unknown as MdastNode;
  const mathmdNodes: MathMDNode[] = [];
  const diagnostics: MathMDDiagnostic[] = [];
  const seenIds = new Set<string>();

  let globalBlockOrdinal = 0;

  function traverse(node: MdastNode): void {
    if (node.type === "code" && typeof node.lang === "string") {
      const type = node.lang.trim().toLowerCase();
      if (SUPPORTED_MATHMD_TYPES.has(type)) {
        const ordinal = globalBlockOrdinal++;
        const range = extractRange(node);
        const rawContent = node.value ?? "";

        const frontMatterResult = parseFrontMatter(rawContent);
        if ("error" in frontMatterResult) {
          diagnostics.push({
            severity: "error",
            code: "MATHMD_SYNTAX_INVALID",
            message: `Syntax error in ${type} block: ${frontMatterResult.error}`,
            range,
            blockType: type,
          });
        } else {
          const data = frontMatterResult.data;

          // Validate or generate block ID
          let blockId: string;
          if ("id" in data) {
            if (typeof data.id === "string" && VALID_ID_REGEX.test(data.id)) {
              blockId = data.id;
            } else {
              const invalidIdStr = typeof data.id === "string" ? data.id : String(data.id);
              diagnostics.push({
                severity: "error",
                code: "MATHMD_ID_INVALID",
                message: `Invalid block ID "${invalidIdStr}": IDs must match /^[a-zA-Z0-9_-]{1,64}$/`,
                range,
                blockType: type,
                blockId: invalidIdStr,
              });
              return;
            }
          } else {
            blockId = generateID(type, ordinal, rawContent);
          }

          // Check for duplicate ID
          if (seenIds.has(blockId)) {
            diagnostics.push({
              severity: "error",
              code: "MATHMD_DUPLICATE_ID",
              message: `Duplicate block ID "${blockId}" detected`,
              range,
              blockType: type,
              blockId,
            });
            return;
          }
          seenIds.add(blockId);

          const nodeObj = buildMathMDNode(type, data, blockId, range, diagnostics);
          if (nodeObj !== null) {
            mathmdNodes.push(nodeObj);
          }
        }
      }
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(root);

  return {
    type: "document",
    source: markdown,
    children: mathmdNodes,
    diagnostics,
  };
}

export default { parseMathMD };