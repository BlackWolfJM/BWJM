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

// --- Generic Scene Contract Nodes (BWJM 200 Functionalities) ---

export interface TrajectoryNode extends MathMDNodeBase {
  type: "trajectory";
  x: string;
  y: string;
  z?: string;
  tDomain: [number, number];
  samples?: number;
  color?: string;
  // Reference to particle/timeline IDs for linking
  particleRef?: string;
  timelineRef?: string;
}

export interface ParticleNode extends MathMDNodeBase {
  type: "particle";
  trajectoryRef: string; // ID of trajectory node
  timelineRef?: string;
  trailLength?: number; // number of points in trail
  showTrail?: boolean;
  size?: number;
  color?: string;
}

export interface VectorArrowNode extends MathMDNodeBase {
  type: "vectorarrow";
  origin: [number, number, number] | [number, number];
  vector: [number, number, number] | [number, number];
  label?: string;
  color?: string;
  // Scale separation
  physicalScale?: number; // physical units per visual unit
  visualScale?: number; // visual multiplier
  showTip?: boolean;
  tipSize?: number;
  // Layer/visibility
  layer?: string;
  visible?: boolean;
}

export interface FrameNode extends MathMDNodeBase {
  type: "frame";
  trajectoryRef: string; // ID of trajectory node
  timelineRef?: string;
  showT?: boolean;
  showN?: boolean;
  showB?: boolean;
  frameLength?: number;
  colors?: { T?: string; N?: string; B?: string };
  // Differentiation between symbolic, numerical, undefined
  curvatureType?: "symbolic" | "numerical" | "undefined";
  torsionType?: "symbolic" | "numerical" | "undefined";
}

export interface FieldNode extends MathMDNodeBase {
  type: "field";
  dimensions: 2 | 3;
  components: [string, string] | [string, string, string];
  xDomain: [number, number];
  yDomain: [number, number];
  zDomain?: [number, number];
  density?: number;
  color?: string;
  // For particle integration
  timelineRef?: string;
  integrationMethod?: "euler" | "rk4" | "adaptive";
  stepSize?: number;
}

export interface RegionNode extends MathMDNodeBase {
  type: "region";
  boundary: string; // curve reference or equation
  xDomain: [number, number];
  yDomain: [number, number];
  orientation?: "ccw" | "cw"; // for Green's theorem
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
}

export interface CameraNode extends MathMDNodeBase {
  type: "camera";
  target?: string; // node ID to follow
  position?: [number, number, number];
  eye?: [number, number, number];
  up?: [number, number, number];
  fov?: number;
  aspect?: number;
  mode?: "fixed" | "follow" | "orbit";
  timelineRef?: string;
}

export interface TimelineNode extends MathMDNodeBase {
  type: "timeline";
  name: string;
  domain: [number, number];
  default?: number;
  speed?: number; // 1.0 = normal
  loop?: boolean;
  autoplay?: boolean;
  // References to controlled nodes
  controls?: string[]; // IDs of nodes controlled by this timeline
  markers?: Array<{ at: number; label: string }>; // Stored in .bwjm
}

/** Table stored as native, portable scientific data within a .bwjm document. */
export interface DataTableNode extends MathMDNodeBase {
  type: "datatable";
  caption?: string;
  columns: string[];
  units?: string[];
  rows: Array<Array<string | number | boolean | null>>;
  precision?: number;
}

export interface Parametric2DNode extends MathMDNodeBase {
  type: "parametric2d";
  x: string;
  y: string;
  tDomain: [number, number];
  samples?: number;
  timelineRef?: string;
  color?: string;
  showTrail?: boolean;
  showVelocity?: boolean;
  showAcceleration?: boolean;
  showTangent?: boolean;
  showNormal?: boolean;
}

export interface Flow2DNode extends MathMDNodeBase {
  type: "flow2d";
  field: [string, string];
  seeds: Array<[number, number]>;
  xDomain: [number, number];
  yDomain: [number, number];
  tMax: number;
  stepSize?: number;
  timelineRef?: string;
  color?: string;
  showVectors?: boolean;
  showParticles?: boolean;
}

export interface FunctionTableNode extends MathMDNodeBase {
  type: "functiontable";
  caption?: string;
  variable: string;
  domain: [number, number];
  samples: number;
  expressions: string[];
  columns: string[];
  units?: string[];
  precision?: number;
}

export type DataChartKind = "scatter" | "line" | "bar" | "area" | "step" | "histogram" | "box" | "pie";

export interface DataChartNode extends MathMDNodeBase {
  type: "datachart";
  tableRef: string;
  kind: DataChartKind;
  xColumn: string;
  yColumn?: string;
  title?: string;
  color?: string;
  bins?: number;
  trendline?: boolean;
}

export interface StatisticsNode extends MathMDNodeBase {
  type: "statistics";
  tableRef: string;
  column: string;
  pairedColumn?: string;
}

// TextNode preserved for legacy consumers
export interface TextNode extends MathMDNodeBase {
  type: "text";
  content: string;
}

// The 23 recognized MathMD visualization nodes (15 original + 8 new scene contracts)
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
  | ContourNode
  | TrajectoryNode
  | ParticleNode
  | VectorArrowNode
  | FrameNode
  | FieldNode
  | RegionNode
  | CameraNode
  | TimelineNode
  | DataTableNode
  | FunctionTableNode
  | DataChartNode
  | StatisticsNode
  | Parametric2DNode
  | Flow2DNode;

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

// --- Generic Scene Contract Schemas ---

export const trajectorySchema = mathmdNodeBaseSchema.extend({
  type: z.literal("trajectory"),
  x: z.string().min(1, "x equation must be a non-empty string"),
  y: z.string().min(1, "y equation must be a non-empty string"),
  z: z.string().min(1, "z equation must be a non-empty string").optional(),
  tDomain: domainSchema,
  samples: z.number().int().min(2).max(500).optional(),
  color: z.string().optional(),
  particleRef: z.string().optional(),
  timelineRef: z.string().optional(),
});

export const particleSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("particle"),
  trajectoryRef: z.string().min(1, "trajectoryRef must reference a trajectory node"),
  timelineRef: z.string().optional(),
  trailLength: z.number().int().min(0).max(1000).optional(),
  showTrail: z.boolean().optional(),
  size: z.number().finite().positive().optional(),
  color: z.string().optional(),
});

const vectorComponents2D = z.tuple([z.number().finite(), z.number().finite()]);
const vectorComponents3D = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
const vectorComponents = z.union([vectorComponents2D, vectorComponents3D]);

export const vectorArrowSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("vectorarrow"),
  origin: vectorComponents,
  vector: vectorComponents,
  label: z.string().optional(),
  color: z.string().optional(),
  physicalScale: z.number().finite().positive().optional(),
  visualScale: z.number().finite().positive().optional(),
  showTip: z.boolean().optional(),
  tipSize: z.number().finite().positive().optional(),
  layer: z.string().optional(),
  visible: z.boolean().optional(),
});

export const frameSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("frame"),
  trajectoryRef: z.string().min(1, "trajectoryRef must reference a trajectory node"),
  timelineRef: z.string().optional(),
  showT: z.boolean().optional(),
  showN: z.boolean().optional(),
  showB: z.boolean().optional(),
  frameLength: z.number().finite().positive().optional(),
  colors: z.object({
    T: z.string().optional(),
    N: z.string().optional(),
    B: z.string().optional(),
  }).optional(),
  curvatureType: z.enum(["symbolic", "numerical", "undefined"]).optional(),
  torsionType: z.enum(["symbolic", "numerical", "undefined"]).optional(),
});

const fieldComponents2D = z.tuple([z.string().min(1), z.string().min(1)]);
const fieldComponents3D = z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]);
const fieldComponents = z.union([fieldComponents2D, fieldComponents3D]);

export const fieldSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("field"),
  dimensions: z.literal(2).or(z.literal(3)),
  components: fieldComponents,
  xDomain: domainSchema,
  yDomain: domainSchema,
  zDomain: domainSchema.optional(),
  density: z.number().int().min(2).max(50).optional(),
  color: z.string().optional(),
  timelineRef: z.string().optional(),
  integrationMethod: z.enum(["euler", "rk4", "adaptive"]).optional(),
  stepSize: z.number().finite().positive().optional(),
});

export const regionSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("region"),
  boundary: z.string().min(1, "boundary must be a non-empty string"),
  xDomain: domainSchema,
  yDomain: domainSchema,
  orientation: z.enum(["ccw", "cw"]).optional(),
  color: z.string().optional(),
  fillColor: z.string().optional(),
  fillOpacity: z.number().finite().min(0).max(1).optional(),
});

export const cameraSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("camera"),
  target: z.string().optional(),
  position: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).optional(),
  eye: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).optional(),
  up: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).optional(),
  fov: z.number().finite().positive().optional(),
  aspect: z.number().finite().positive().optional(),
  mode: z.enum(["fixed", "follow", "orbit"]).optional(),
  timelineRef: z.string().optional(),
});

const timelineNodeSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("timeline"),
  name: controlNameSchema,
  domain: domainSchema,
  default: z.number().finite().optional(),
  speed: z.number().finite().positive().optional(),
  loop: z.boolean().optional(),
  autoplay: z.boolean().optional(),
  controls: z.array(z.string()).optional(),
  markers: z.array(z.object({
    at: z.number().finite(),
    label: z.string().min(1).max(80),
  })).max(20).optional(),
});

function validateTimelineBounds(
  data: z.infer<typeof timelineNodeSchema>,
  context: z.RefinementCtx,
): void {
  data.markers?.forEach((marker, index) => {
    if (marker.at < data.domain[0] || marker.at > data.domain[1]) {
      context.addIssue({ code: z.ZodIssueCode.custom,
        message: "Timeline annotation must be within the time domain",
        path: ["markers", index, "at"] });
    }
  });
  if (data.default !== undefined && (data.default < data.domain[0] || data.default > data.domain[1])) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Timeline default must be within domain",
      path: ["default"],
    });
  }
}

export const timelineSchema = timelineNodeSchema.superRefine(validateTimelineBounds);

export const dataTableSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("datatable"),
  caption: z.string().max(256).optional(),
  columns: z.array(z.string().min(1).max(100)).min(1).max(25),
  units: z.array(z.string().max(32)).max(25).optional(),
  rows: z.array(z.array(z.union([
    z.string().max(512),
    z.number().finite(),
    z.boolean(),
    z.null(),
  ])).max(25)).max(500),
  precision: z.number().int().min(0).max(12).optional(),
});

export const flow2dSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("flow2d"),
  field: z.tuple([z.string().min(1), z.string().min(1)]),
  seeds: z.array(z.tuple([z.number().finite(), z.number().finite()])).min(1).max(12),
  xDomain: domainSchema,
  yDomain: domainSchema,
  tMax: z.number().finite().positive().max(20),
  stepSize: z.number().finite().min(0.01).max(1).optional(),
  timelineRef: z.string().optional(),
  color: z.string().max(64).optional(),
  showVectors: z.boolean().optional(),
  showParticles: z.boolean().optional(),
});

export const parametric2dSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("parametric2d"),
  x: z.string().min(1),
  y: z.string().min(1),
  tDomain: domainSchema,
  samples: z.number().int().min(2).max(500).optional(),
  timelineRef: z.string().optional(),
  color: z.string().max(64).optional(),
  showTrail: z.boolean().optional(),
  showVelocity: z.boolean().optional(),
  showAcceleration: z.boolean().optional(),
  showTangent: z.boolean().optional(),
  showNormal: z.boolean().optional(),
});

export const functionTableSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("functiontable"),
  caption: z.string().max(256).optional(),
  variable: controlNameSchema,
  domain: domainSchema,
  samples: z.number().int().min(2).max(500),
  expressions: z.array(z.string().min(1).max(1024)).min(1).max(12),
  columns: z.array(z.string().min(1).max(100)).min(2).max(13),
  units: z.array(z.string().max(32)).max(13).optional(),
  precision: z.number().int().min(0).max(12).optional(),
});

export const dataChartSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("datachart"),
  tableRef: z.string().min(1),
  kind: z.enum(["scatter", "line", "bar", "area", "step", "histogram", "box", "pie"]),
  xColumn: z.string().min(1),
  yColumn: z.string().optional(),
  title: z.string().max(120).optional(),
  color: z.string().max(64).optional(),
  bins: z.number().int().min(2).max(80).optional(),
  trendline: z.boolean().optional(),
});

export const statisticsSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("statistics"),
  tableRef: z.string().min(1),
  column: z.string().min(1),
  pairedColumn: z.string().optional(),
});

// Discriminated union of all 27 MathMD block schemas
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
  trajectorySchema,
  particleSchema,
  vectorArrowSchema,
  frameSchema,
  fieldSchema,
  regionSchema,
  cameraSchema,
  timelineNodeSchema,
  dataTableSchema,
  functionTableSchema,
  dataChartSchema,
  statisticsSchema,
  parametric2dSchema,
  flow2dSchema,
]);

export const mathmdNodeSchema = mathmdNodeDiscriminatedUnion.superRefine((node, context) => {
  if (node.type === "slider") {
    validateSliderBounds(node, context);
  }
  if (node.type === "timeline") {
    validateTimelineBounds(node, context);
  }
  if (node.type === "functiontable") {
    if (node.columns.length !== node.expressions.length + 1 ||
      (node.units && node.units.length !== node.columns.length)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "column count must be expressions + 1, with matching units", path: ["columns"] });
    }
  }
  if (node.type === "datatable") {
    if (node.units && node.units.length !== node.columns.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "units must match column count", path: ["units"] });
    }
    node.rows.forEach((row, index) => {
      if (row.length !== node.columns.length) context.addIssue({
        code: z.ZodIssueCode.custom, message: "row width must match column count", path: ["rows", index],
      });
    });
  }
  if (node.type === "field") {
    const data = node as z.infer<typeof fieldSchema>;
    if (data.dimensions === 3 && !data.zDomain) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "3D field requires zDomain",
        path: ["zDomain"],
      });
    }
    if (data.dimensions === 2 && data.components.length !== 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "2D field requires exactly 2 components",
        path: ["components"],
      });
    }
    if (data.dimensions === 3 && data.components.length !== 3) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "3D field requires exactly 3 components",
        path: ["components"],
      });
    }
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
