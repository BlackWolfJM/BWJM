import { z } from "zod";

// --- Source Position Contracts ---

export interface SourcePoint {
  line: number;   // 1-based
  column: number; // 1-based
  offset: number; // 0-based
}

export interface SourceRange {
  start: SourcePoint;
  end: SourcePoint;
}

export type MathMDDiagnosticSeverity = "error" | "warning";

export interface MathMDDiagnostic {
  severity: MathMDDiagnosticSeverity;
  code: string;
  message: string;
  range?: SourceRange;
  blockType?: string;
  blockId?: string;
  path?: ReadonlyArray<string | number>;
}

export interface MathMDNodeBase {
  id: string;
  range: SourceRange;
}

export interface MathMDDocument {
  type: "document";
  source: string;
  children: MathMDNode[];
  diagnostics: MathMDDiagnostic[];
}

// --- Specific AST Nodes ---

export interface Plot2DNode extends MathMDNodeBase {
  type: "plot2d";
  equation: string;
  xDomain: [number, number];
  yDomain?: [number, number];
  grid?: boolean;
  axes?: boolean;
  interactive?: boolean;
  label?: string;
  color?: string;
}

export interface Surface3DNode extends MathMDNodeBase {
  type: "surface3d";
  equation: string;
  xDomain: [number, number];
  yDomain: [number, number];
  samples?: number;
  contours?: boolean;
  color?: string;
}

export interface Vector2DNode extends MathMDNodeBase {
  type: "vector2d";
  origin: [number, number];
  vector: [number, number];
  label?: string;
  color?: string;
}

export interface Vector3DNode extends MathMDNodeBase {
  type: "vector3d";
  origin: [number, number, number];
  vector: [number, number, number];
  label?: string;
  color?: string;
}

export interface Curve3DNode extends MathMDNodeBase {
  type: "curve3d";
  x: string;
  y: string;
  z: string;
  tDomain: [number, number];
  color?: string;
}

export interface VectorField2DNode extends MathMDNodeBase {
  type: "vectorfield2d";
  field: [string, string];
  xDomain: [number, number];
  yDomain: [number, number];
  density?: number;
  color?: string;
}

export interface GradientNode extends MathMDNodeBase {
  type: "gradient";
  function: string;
  point: [number, number];
  showSurface?: boolean;
  showLevelCurves?: boolean;
  color?: string;
}

export interface TangentPlaneNode extends MathMDNodeBase {
  type: "tangentplane";
  function: string;
  point: [number, number];
  color?: string;
}

export interface SliderNode extends MathMDNodeBase {
  type: "slider";
  name: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface CheckboxNode extends MathMDNodeBase {
  type: "checkbox";
  name: string;
  label?: string;
  default?: boolean;
}

export interface Point2DNode extends MathMDNodeBase {
  type: "point2d";
  x: number;
  y: number;
  label?: string;
  color?: string;
}

export interface Point3DNode extends MathMDNodeBase {
  type: "point3d";
  x: number;
  y: number;
  z: number;
  label?: string;
  color?: string;
}

export interface DiagramNode extends MathMDNodeBase {
  type: "diagram";
  elements: string;
}

export interface GeometryPrimitive {
  type: "line" | "circle" | "polygon" | "arc";
  points: number[][];
  style?: {
    color?: string;
    width?: number;
    fill?: string;
  };
}

export interface GeometryNode extends MathMDNodeBase {
  type: "geometry";
  primitives: GeometryPrimitive[];
}

export interface ContourNode extends MathMDNodeBase {
  type: "contour";
  function: string;
  xDomain: [number, number];
  yDomain: [number, number];
  levels?: number | number[];
  color?: string;
}

// TextNode preserved for legacy consumers
export interface TextNode extends MathMDNodeBase {
  type: "text";
  content: string;
}

// The 15 recognized MathMD visualization nodes
export type MathMDNode =
  | Plot2DNode
  | Surface3DNode
  | Vector2DNode
  | Vector3DNode
  | Curve3DNode
  | VectorField2DNode
  | GradientNode
  | TangentPlaneNode
  | SliderNode
  | CheckboxNode
  | Point2DNode
  | Point3DNode
  | DiagramNode
  | GeometryNode
  | ContourNode;

// --- Deterministic & Unicode-Safe ID Helper ---

/**
 * Computes a pure, deterministic 32-bit FNV-1a hash of a Unicode string.
 * Returns an 8-character hex string.
 */
export function simpleHash(str: string): string {
  let hash = 0x811c9dc5; // FNV-1 offset basis
  for (let i = 0; i < str.length; i++) {
    const codePoint = str.codePointAt(i);
    if (codePoint === undefined) continue;
    if (codePoint > 0xffff) {
      i++; // Skip low surrogate
    }
    hash ^= codePoint & 0xff;
    hash = Math.imul(hash, 0x01000193);
    hash ^= (codePoint >> 8) & 0xff;
    hash = Math.imul(hash, 0x01000193);
    hash ^= (codePoint >> 16) & 0xff;
    hash = Math.imul(hash, 0x01000193);
    hash ^= (codePoint >> 24) & 0xff;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Generates a deterministic, pure ID in the format `<prefix>-<ordinal>-<shortHash>`.
 * Safe for Unicode content and portable across Node and browser without crypto/Date/Math.random.
 */
export function generateID(prefix: string = "node", ordinal: number = 0, content: string = ""): string {
  const shortHash = simpleHash(content).slice(0, 8);
  return `${prefix}-${ordinal}-${shortHash}`;
}

// --- Zod Schemas ---

export const sourcePointSchema = z.object({
  line: z.number().int().positive(),
  column: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export const sourceRangeSchema = z.object({
  start: sourcePointSchema,
  end: sourcePointSchema,
});

export const mathmdDiagnosticSeveritySchema = z.enum(["error", "warning"]);

export const mathmdDiagnosticSchema = z.object({
  severity: mathmdDiagnosticSeveritySchema,
  code: z.string(),
  message: z.string(),
  range: sourceRangeSchema.optional(),
  blockType: z.string().optional(),
  blockId: z.string().optional(),
  path: z.array(z.union([z.string(), z.number()])).readonly().optional(),
});

export const mathmdNodeBaseSchema = z.object({
  id: z.string(),
  range: sourceRangeSchema,
});

export const domainSchema = z.tuple([
  z.number().finite(),
  z.number().finite(),
]).refine(([min, max]) => min < max, {
  message: "Domain minimum must be strictly less than maximum",
});

export const controlNameSchema = z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, {
  message: "Control name must be a valid non-empty identifier",
});

export const plot2dSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("plot2d"),
  equation: z.string().min(1, "Equation must be a non-empty string"),
  xDomain: domainSchema,
  yDomain: domainSchema.optional(),
  grid: z.boolean().optional(),
  axes: z.boolean().optional(),
  interactive: z.boolean().optional(),
  label: z.string().optional(),
  color: z.string().optional(),
});

export const surface3dSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("surface3d"),
  equation: z.string().min(1, "Equation must be a non-empty string"),
  xDomain: domainSchema,
  yDomain: domainSchema,
  samples: z.number().int().min(2).max(200).optional(),
  contours: z.boolean().optional(),
  color: z.string().optional(),
});

export const vector2dSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("vector2d"),
  origin: z.tuple([z.number().finite(), z.number().finite()]),
  vector: z.tuple([z.number().finite(), z.number().finite()]),
  label: z.string().optional(),
  color: z.string().optional(),
});

export const vector3dSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("vector3d"),
  origin: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]),
  vector: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]),
  label: z.string().optional(),
  color: z.string().optional(),
});

export const curve3dSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("curve3d"),
  x: z.string().min(1, "x equation must be a non-empty string"),
  y: z.string().min(1, "y equation must be a non-empty string"),
  z: z.string().min(1, "z equation must be a non-empty string"),
  tDomain: domainSchema,
  color: z.string().optional(),
});

export const vectorfield2dSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("vectorfield2d"),
  field: z.tuple([
    z.string().min(1, "fx component must be a non-empty string"),
    z.string().min(1, "fy component must be a non-empty string"),
  ]),
  xDomain: domainSchema,
  yDomain: domainSchema,
  density: z.number().int().min(2).max(50).optional(),
  color: z.string().optional(),
});

export const gradientSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("gradient"),
  function: z.string().min(1, "Function must be a non-empty string"),
  point: z.tuple([z.number().finite(), z.number().finite()]),
  showSurface: z.boolean().optional(),
  showLevelCurves: z.boolean().optional(),
  color: z.string().optional(),
});

export const tangentplaneSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("tangentplane"),
  function: z.string().min(1, "Function must be a non-empty string"),
  point: z.tuple([z.number().finite(), z.number().finite()]),
  color: z.string().optional(),
});

const sliderNodeSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("slider"),
  name: controlNameSchema,
  min: z.number().finite(),
  max: z.number().finite(),
  step: z.number().finite().positive("Slider step must be positive"),
  default: z.number().finite(),
});

function validateSliderBounds(
  data: z.infer<typeof sliderNodeSchema>,
  context: z.RefinementCtx,
): void {
  if (data.min >= data.max) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Slider min must be strictly less than max",
      path: ["min"],
    });
  }

  if (data.default < data.min || data.default > data.max) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Slider default must be between min and max",
      path: ["default"],
    });
  }
}

export const sliderSchema = sliderNodeSchema.superRefine(validateSliderBounds);

export const checkboxSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("checkbox"),
  name: controlNameSchema,
  label: z.string().optional(),
  default: z.boolean().optional(),
});

export const point2dSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("point2d"),
  x: z.number().finite(),
  y: z.number().finite(),
  label: z.string().optional(),
  color: z.string().optional(),
});

export const point3dSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("point3d"),
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
  label: z.string().optional(),
  color: z.string().optional(),
});

export const diagramSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("diagram"),
  elements: z.string(),
});

export const geometryPrimitiveSchema = z.object({
  type: z.enum(["line", "circle", "polygon", "arc"]),
  points: z.array(z.array(z.number().finite())),
  style: z.object({
    color: z.string().optional(),
    width: z.number().finite().nonnegative().optional(),
    fill: z.string().optional(),
  }).optional(),
});

export const geometrySchema = mathmdNodeBaseSchema.extend({
  type: z.literal("geometry"),
  primitives: z.array(geometryPrimitiveSchema),
});

export const contourSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("contour"),
  function: z.string().min(1, "Function must be a non-empty string"),
  xDomain: domainSchema,
  yDomain: domainSchema,
  levels: z.union([
    z.number().int().positive(),
    z.array(z.number().finite()),
  ]).optional(),
  color: z.string().optional(),
});

// Discriminated union of all 15 MathMD block schemas
const mathmdNodeDiscriminatedUnion = z.discriminatedUnion("type", [
  plot2dSchema,
  surface3dSchema,
  vector2dSchema,
  vector3dSchema,
  curve3dSchema,
  vectorfield2dSchema,
  gradientSchema,
  tangentplaneSchema,
  sliderNodeSchema,
  checkboxSchema,
  point2dSchema,
  point3dSchema,
  diagramSchema,
  geometrySchema,
  contourSchema,
]);

export const mathmdNodeSchema = mathmdNodeDiscriminatedUnion.superRefine((node, context) => {
  if (node.type === "slider") {
    validateSliderBounds(node, context);
  }
});

// Document schema
export const mathmdDocumentSchema = z.object({
  type: z.literal("document"),
  source: z.string(),
  children: z.array(mathmdNodeSchema),
  diagnostics: z.array(mathmdDiagnosticSchema),
}).strict();

export type { z };
