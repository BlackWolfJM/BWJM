import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { prepareRemarkMath, sourcePositionLocator } from "./mathSource.js";
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
  crossProductSchema,
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
  trajectorySchema,
  particleSchema,
  vectorArrowSchema,
  frameSchema,
  fieldSchema,
  regionSchema,
  cameraSchema,
  timelineSchema,
  dataTableSchema,
  functionTableSchema,
  dataChartSchema,
  statisticsSchema,
  parametric2dSchema,
  flow2dSchema,
  calculusVizSchema,
} from "@mathmd/ast";

interface MdastPosition {
  start: { line: number; column: number; offset: number };
  end: { line: number; column: number; offset: number };
}

/** Minimal, renderer-neutral Markdown AST returned by Remark (also used by the reader). */
export interface MdastNode {
  type: string;
  lang?: string | null;
  value?: string;
  position?: MdastPosition;
  children?: MdastNode[];
  depth?: number;
  ordered?: boolean;
  start?: number | null;
  checked?: boolean | null;
  url?: string;
  title?: string | null;
  alt?: string;
  identifier?: string;
  align?: Array<"left" | "right" | "center" | null>;
}

/** Keep Markdown, GFM and math parsing identical to the scientific parser. */
export function parseProseMarkdown(markdown: string, definitions = ""): MdastNode {
  const source = definitions ? markdown + "\n\n" + definitions : markdown;
  // Parse-only normalization keeps later plot2d blocks visible while
  // preserving each source range and character offset in .bwjm/.jm.
  const prepared = prepareRemarkMath(source);
  const root = unified().use(remarkParse).use(remarkGfm).use(remarkMath)
    .parse(prepared.text) as unknown as MdastNode;
  const definitionNodes = new Map<string, MdastNode>();
  const visit = (node: MdastNode, callback: (node: MdastNode) => void): void => {
    callback(node);
    node.children?.forEach(child => visit(child, callback));
  };
  // Remark offsets refer to the normalized input. Remap all nodes before
  // any consumer (including graph settings) accesses source ranges.
  if (prepared.text !== source) {
    const positionAt = sourcePositionLocator(source);
    visit(root, node => {
      if (!node.position) return;
      node.position.start = positionAt(
        prepared.toOriginalOffset(node.position.start.offset));
      node.position.end = positionAt(
        prepared.toOriginalOffset(node.position.end.offset));
    });
  }
  visit(root, node => {
    if (node.type === "definition" && node.identifier) {
      definitionNodes.set(node.identifier.toLowerCase(), node);
    }
  });
  visit(root, node => {
    if ((node.type === "linkReference" || node.type === "imageReference") && node.identifier) {
      const definition = definitionNodes.get(node.identifier.toLowerCase());
      if (definition) {
        node.type = node.type === "linkReference" ? "link" : "image";
        node.url = definition.url;
        node.title = definition.title;
      }
    }
  });
  return root;
}

/**
 * Collect source-authentic Markdown reference definitions from the complete document.
 * The reader parses prose in separate spans around scientific blocks; supplying these
 * definitions to each span lets references resolve across such a block.
 */
export function collectMarkdownDefinitions(source: string): string {
  const root = parseProseMarkdown(source);
  return (root.children ?? [])
    .filter(node => node.type === "definition" && node.position)
    .map(node => source.slice(node.position!.start.offset, node.position!.end.offset))
    .join("\n\n");
}

const SUPPORTED_MATHMD_TYPES = new Set([
  "plot2d",
  "surface3d",
  "vector2d",
  "vector3d",
  "crossproduct",
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
  "trajectory",
  "particle",
  "vectorarrow",
  "frame",
  "field",
  "region",
  "camera",
  "timeline",
  "datatable",
  "functiontable",
  "datachart",
  "statistics",
  "parametric2d",
  "flow2d",
  "calculusviz",
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
        paramControls: data.paramControls,
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
        paramControls: data.paramControls,
        xDomain: "x" in data ? data.x : "xDomain" in data ? data.xDomain : [-5, 5],
        yDomain: "y" in data ? data.y : "yDomain" in data ? data.yDomain : [-5, 5],
        samples,
        contours: "contours" in data ? data.contours : false,
        animated: data.animated,
        showInfo: data.showInfo,
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
        other: data.other,
        third: data.third,
        mode: data.mode,
        factor: data.factor,
        secondFactor: data.secondFactor,
        showSteps: data.showSteps,
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
        other: data.other,
        third: data.third,
        mode: data.mode,
        factor: data.factor,
        secondFactor: data.secondFactor,
        showSteps: data.showSteps,
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

    case "crossproduct": {
      const result = crossProductSchema.safeParse({ ...data, ...base });
      if (result.success) return result.data;
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

    case "curve3d": {
      payload = {
        ...base,
        x: "x" in data ? data.x : "cos(t)",
        paramControls: data.paramControls,
        y: "y" in data ? data.y : "sin(t)",
        z: "z" in data ? data.z : "t",
        tDomain: "t" in data ? data.t : "tDomain" in data ? data.tDomain : [0, 2 * Math.PI],
        animated: data.animated,
        showVectors: data.showVectors,
        showTNB: data.showTNB,
        showLegend: data.showLegend,
        showInfo: data.showInfo,
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
        paramControls: data.paramControls,
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

    case "trajectory": {
      payload = {
        ...base,
        x: "x" in data ? data.x : "cos(t)",
        y: "y" in data ? data.y : "sin(t)",
        z: "z" in data ? data.z : undefined,
        tDomain: "t" in data ? data.t : "tDomain" in data ? data.tDomain : [0, 2 * Math.PI],
        samples: "samples" in data ? data.samples : 100,
        color: typeof data.color === "string" ? data.color : undefined,
        particleRef: typeof data.particleRef === "string" ? data.particleRef : undefined,
        timelineRef: typeof data.timelineRef === "string" ? data.timelineRef : undefined,
      };
      const result = trajectorySchema.safeParse(payload);
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

    case "particle": {
      payload = {
        ...base,
        trajectoryRef: data.trajectoryRef,
        timelineRef: typeof data.timelineRef === "string" ? data.timelineRef : undefined,
        trailLength: typeof data.trailLength === "number" ? data.trailLength : 50,
        showTrail: "showTrail" in data ? data.showTrail : true,
        size: typeof data.size === "number" ? data.size : 8,
        color: typeof data.color === "string" ? data.color : "#f43f5e",
      };
      const result = particleSchema.safeParse(payload);
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

    case "vectorarrow": {
      const origin = "origin" in data ? data.origin : [0, 0, 0];
      const vector = "vector" in data ? data.vector : [1, 0, 0];
      payload = {
        ...base,
        origin,
        vector,
        label: data.label,
        color: typeof data.color === "string" ? data.color : "#0284c7",
        physicalScale: typeof data.physicalScale === "number" ? data.physicalScale : undefined,
        visualScale: typeof data.visualScale === "number" ? data.visualScale : 1,
        showTip: "showTip" in data ? data.showTip : true,
        tipSize: typeof data.tipSize === "number" ? data.tipSize : 0.15,
        layer: typeof data.layer === "string" ? data.layer : "default",
        visible: "visible" in data ? data.visible : true,
      };
      const result = vectorArrowSchema.safeParse(payload);
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

    case "frame": {
      payload = {
        ...base,
        trajectoryRef: data.trajectoryRef,
        timelineRef: typeof data.timelineRef === "string" ? data.timelineRef : undefined,
        showT: "showT" in data ? data.showT : true,
        showN: "showN" in data ? data.showN : true,
        showB: "showB" in data ? data.showB : true,
        frameLength: typeof data.frameLength === "number" ? data.frameLength : 0.8,
        colors: typeof data.colors === "object" ? data.colors : undefined,
        curvatureType: typeof data.curvatureType === "string" ? data.curvatureType : "numerical",
        torsionType: typeof data.torsionType === "string" ? data.torsionType : "numerical",
      };
      const result = frameSchema.safeParse(payload);
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

    case "field": {
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
        dimensions: "dimensions" in data ? data.dimensions : 2,
        components: data.field ?? data.components,
        xDomain: "x" in data ? data.x : "xDomain" in data ? data.xDomain : [-5, 5],
        yDomain: "y" in data ? data.y : "yDomain" in data ? data.yDomain : [-5, 5],
        zDomain: "z" in data ? data.z : "zDomain" in data ? data.zDomain : undefined,
        density,
        color: typeof data.color === "string" ? data.color : "#0284c7",
        timelineRef: typeof data.timelineRef === "string" ? data.timelineRef : undefined,
        integrationMethod: typeof data.integrationMethod === "string" ? data.integrationMethod : "rk4",
        stepSize: typeof data.stepSize === "number" ? data.stepSize : 0.01,
      };
      const result = fieldSchema.safeParse(payload);
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

    case "region": {
      payload = {
        ...base,
        boundary: data.boundary,
        xDomain: "x" in data ? data.x : "xDomain" in data ? data.xDomain : [-5, 5],
        yDomain: "y" in data ? data.y : "yDomain" in data ? data.yDomain : [-5, 5],
        orientation: typeof data.orientation === "string" ? data.orientation : "ccw",
        color: typeof data.color === "string" ? data.color : "#6366f1",
        fillColor: typeof data.fillColor === "string" ? data.fillColor : "#6366f1",
        fillOpacity: typeof data.fillOpacity === "number" ? data.fillOpacity : 0.2,
      };
      const result = regionSchema.safeParse(payload);
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

    case "camera": {
      payload = {
        ...base,
        target: typeof data.target === "string" ? data.target : undefined,
        position: "position" in data ? data.position : undefined,
        eye: "eye" in data ? data.eye : undefined,
        up: "up" in data ? data.up : undefined,
        fov: typeof data.fov === "number" ? data.fov : undefined,
        aspect: typeof data.aspect === "number" ? data.aspect : undefined,
        mode: typeof data.mode === "string" ? data.mode : "fixed",
        timelineRef: typeof data.timelineRef === "string" ? data.timelineRef : undefined,
      };
      const result = cameraSchema.safeParse(payload);
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

    case "calculusviz": {
      // YAML parses unquoted constants like f: 0 as numbers; accept them as expressions.
      const asExpression = (value: unknown) => typeof value === "number" && Number.isFinite(value)
        ? String(value) : value;
      const payload = {
        ...base,
        mode: data.mode,
        paramControls: data.paramControls,
        domain: data.domain ?? [0, 1],
        f: asExpression(data.f), g: asExpression(data.g), integrand: asExpression(data.integrand),
        paramX: asExpression(data.paramX), paramY: asExpression(data.paramY),
        fieldP: asExpression(data.fieldP), fieldQ: asExpression(data.fieldQ),
        reverseLower: asExpression(data.reverseLower), reverseUpper: asExpression(data.reverseUpper),
        reverseDomain: data.reverseDomain,
        order: data.order ?? "dydx",
        axis: data.axis ?? "x",
        axisOffset: data.axisOffset ?? 0,
        method: data.method ?? "washers",
        samples: data.samples ?? 120,
      };
      const parsed = calculusVizSchema.safeParse(payload);
      if (!parsed.success) {
        parsed.error.issues.forEach(issue => diagnostics.push({
          severity:"error", code:"MATHMD_SCHEMA_INVALID", message:issue.message,
          range, blockType:type, blockId:id, path:issue.path,
        }));
        return null;
      }
      const node = parsed.data;
      // Parse-level semantic checks must reject unsupported combinations, not merely warn.
      const requiresFG = ["area-dx", "area-dy", "area-pieces", "area-polar",
        "double-region", "change-order", "double-polar", "revolution"];
      const invalid = (requiresFG.includes(node.mode) && (!node.f || !node.g))
        || (["area-parametric", "green"].includes(node.mode) && (!node.paramX || !node.paramY))
        || (node.mode === "green" && (!node.fieldP || !node.fieldQ))
        || (node.mode === "change-order" &&
          (!node.reverseLower || !node.reverseUpper || !node.reverseDomain))
        || (node.mode === "revolution" && (
          (node.axis === "y" && node.method !== "shells") ||
          (node.axis !== "y" && node.method === "shells")));
      if (invalid) {
        diagnostics.push({
          severity:"error", code:"MATHMD_CALCULUS_MODE_INVALID",
          message:"Missing expressions or incompatible method for the chosen calculus mode",
          range, blockType:type, blockId:id,
        });
        return null;
      }
      return node;
    }

    case "flow2d": {
      const payload = {
        ...base,
        field: data.field,
        paramControls: data.paramControls,
        seeds: data.seeds ?? [[1, 0], [0, 1], [-1, 0], [0, -1]],
        xDomain: data.xDomain ?? data.x ?? [-3, 3],
        yDomain: data.yDomain ?? data.y ?? [-3, 3],
        tMax: data.tMax ?? 6.28,
        stepSize: data.stepSize ?? 0.04,
        timelineRef: data.timelineRef,
        color: data.color,
        showVectors: data.showVectors ?? true,
        showParticles: data.showParticles ?? true,
      };
      const result = flow2dSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) diagnostics.push({
          severity: "error", code: "MATHMD_SCHEMA_INVALID", message: issue.message,
          range, blockType: type, blockId: id, path: issue.path,
        });
        return null;
      }
      return result.data;
    }

    case "parametric2d": {
      const payload = { ...base,
        x: data.x, y: data.y,
        paramControls: data.paramControls,
        tDomain: data.tDomain ?? data.t ?? [0, 2 * Math.PI],
        samples: data.samples ?? 200,
        timelineRef: data.timelineRef,
        color: data.color,
        animated: data.animated,
        showTrail: data.showTrail ?? true,
        trailLength: data.trailLength ?? 100,
        followParticle: data.followParticle ?? false,
        showVelocity: data.showVelocity ?? true,
        showAcceleration: data.showAcceleration ?? false,
        showTangent: data.showTangent ?? true,
        showNormal: data.showNormal ?? true,
      };
      const result = parametric2dSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) diagnostics.push({
          severity: "error", code: "MATHMD_SCHEMA_INVALID", message: issue.message,
          range, blockType: type, blockId: id, path: issue.path,
        });
        return null;
      }
      return result.data;
    }

    case "functiontable": {
      const payload = {
        ...base,
        caption: data.caption,
        variable: data.variable ?? "t",
        domain: data.domain ?? data.t ?? [0, 10],
        samples: data.samples ?? 51,
        expressions: data.expressions,
        columns: data.columns,
        units: data.units,
        precision: data.precision ?? 6,
      };
      const result = functionTableSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) diagnostics.push({
          severity: "error", code: "MATHMD_SCHEMA_INVALID", message: issue.message,
          range, blockType: type, blockId: id, path: issue.path,
        });
        return null;
      }
      if (result.data.columns.length !== result.data.expressions.length + 1 ||
        (result.data.units && result.data.units.length !== result.data.columns.length)) {
        diagnostics.push({ severity: "error", code: "MATHMD_TABLE_DIMENSIONS",
          message: "Columns must match sampled variable and expressions", range, blockType: type, blockId: id });
        return null;
      }
      return result.data;
    }

    case "datachart": {
      const payload = {
        ...base,
        tableRef: data.tableRef,
        kind: data.kind ?? "scatter",
        xColumn: data.xColumn ?? data.x,
        yColumn: data.yColumn ?? data.y,
        title: data.title,
        color: data.color,
        bins: data.bins,
        trendline: data.trendline ?? false,
      };
      const result = dataChartSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) diagnostics.push({
          severity: "error", code: "MATHMD_SCHEMA_INVALID", message: issue.message,
          range, blockType: type, blockId: id, path: issue.path,
        });
        return null;
      }
      return result.data;
    }

    case "statistics": {
      const payload = { ...base, tableRef: data.tableRef,
        column: data.column, pairedColumn: data.pairedColumn };
      const result = statisticsSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) diagnostics.push({
          severity: "error", code: "MATHMD_SCHEMA_INVALID", message: issue.message,
          range, blockType: type, blockId: id, path: issue.path,
        });
        return null;
      }
      return result.data;
    }

    case "datatable": {
      const payload = {
        ...base,
        caption: data.caption,
        columns: data.columns,
        units: data.units,
        rows: data.rows,
        precision: data.precision ?? 6,
      };
      const result = dataTableSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) diagnostics.push({
          severity: "error", code: "MATHMD_SCHEMA_INVALID", message: issue.message,
          range, blockType: type, blockId: id, path: issue.path,
        });
        return null;
      }
      const node = result.data;
      if ((node.units && node.units.length !== node.columns.length) ||
        node.rows.some(row => row.length !== node.columns.length)) {
        diagnostics.push({ severity: "error", code: "MATHMD_TABLE_DIMENSIONS",
          message: "Table rows and units must match the number of columns", range, blockType: type, blockId: id });
        return null;
      }
      return node;
    }

    case "timeline": {
      const timelineData = data as Record<string, unknown>;
      const minVal = "min" in data ? data.min : "domain" in timelineData ? (timelineData.domain as [number, number])[0] : 0;
      const maxVal = "max" in data ? data.max : "domain" in timelineData ? (timelineData.domain as [number, number])[1] : 2 * Math.PI;
      const defaultVal = "default" in data ? data.default : minVal;
      const speedVal = "speed" in data ? data.speed : 1.0;
      const loopVal = "loop" in data ? data.loop : true;
      const autoplayVal = "autoplay" in data ? data.autoplay : false;
      const controlsVal = "controls" in data ? data.controls : [];

      payload = {
        ...base,
        name: data.name,
        domain: [minVal, maxVal] as [number, number],
        default: defaultVal,
        speed: speedVal,
        loop: loopVal,
        autoplay: autoplayVal,
        controls: controlsVal,
        markers: data.markers,
      };
      const result = timelineSchema.safeParse(payload);
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
  const root = parseProseMarkdown(markdown);
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
