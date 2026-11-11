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

/** Self-contained slider settings; each graph has an independent namespace. */
export interface GraphParameter {
  name: string;
  min: number;
  max: number;
  step: number;
  default: number;
  integer?: boolean;
}
export interface GraphParameterControls {
  enabled: boolean;
  animate?: boolean;
  parameters: GraphParameter[];
}


export interface Plot2DNode extends MathMDNodeBase {
  type: "plot2d";
  paramControls?: GraphParameterControls;
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
  paramControls?: GraphParameterControls;
  equation: string;
  xDomain: [number, number];
  yDomain: [number, number];
  samples?: number;
  contours?: boolean;
  /** Controls whether a time-dependent surface is animated by the t timeline. */
  animated?: boolean;
  /** Optional document analysis; never required to plot a surface. */
  showInfo?: boolean;
  color?: string;
}

/** Optional educational layer on the existing vector nodes. */
export type VectorStudyMode = "classify" | "coordinates" | "translate" |
  "components" | "displacement" | "compare" | "sum" | "difference" |
  "scale" | "properties" | "combination";
export interface VectorStudyOptions {
  mode?: VectorStudyMode;
  /** The second input vector; in displacement mode, the absolute endpoint B. */
  other?: number[];
  third?: number[];
  /** A number or an explicitly declared slider/timeline variable name. */
  factor?: number | string;
  secondFactor?: number | string;
  showSteps?: boolean;
}
export interface Vector2DNode extends MathMDNodeBase, VectorStudyOptions {
  type: "vector2d";
  origin: [number, number];
  vector: [number, number];
  label?: string;
  color?: string;
}

export interface Vector3DNode extends MathMDNodeBase, VectorStudyOptions {
  type: "vector3d";
  origin: [number, number, number];
  vector: [number, number, number];
  label?: string;
  color?: string;
}

export interface Curve3DNode extends MathMDNodeBase {
  type: "curve3d";
  paramControls?: GraphParameterControls;
  x: string;
  y: string;
  z: string;
  tDomain: [number, number];
  color?: string;
  animated?: boolean;
  showVectors?: boolean;
  showTNB?: boolean;
  showLegend?: boolean;
  showInfo?: boolean;
}

export interface VectorField2DNode extends MathMDNodeBase {
  type: "vectorfield2d";
  paramControls?: GraphParameterControls;
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

/**
 * Nodo para visualización del producto cruz u×v en R^3.
 * Muestra dos vectores u, v, el plano que generan y la normal orientada u×v.
 * También puede calcular el área del paralelogramo |u×v| y detector de paralelismo.
 * Con w opcional, muestra el volumen del paralelepípedo y el producto triple escalar.
 * Con collapseFactor, anima el colapso del paralelepípedo interpolando w.
 * Con showSignChallenge, muestra un ejercicio interactivo de signos.
 */
export interface CrossProductNode extends MathMDNodeBase {
  type: "crossproduct";
  u: [number, number, number];
  v: [number, number, number];
  w?: [number, number, number];
  origin?: [number, number, number];
  showPlane?: boolean;
  showNormal?: boolean;
  showArea?: boolean;
  showTriangle?: boolean;
  showVolume?: boolean;
  showSteps?: boolean;
  reverseOrder?: boolean;
  showDeterminant?: boolean;
  showRightHand?: boolean;
  showAnticommutative?: boolean;
  showDistributive?: boolean;
  showIdentities?: boolean;
  showCollapse?: boolean;
  collapseFactor?: number;
  collapseTarget?: "zero" | "coplanar";
  showSignChallenge?: boolean;
  signChallengeMode?: "random" | "fixed" | "quiz";
  signChallengeSeed?: number;
  colorU?: string;
  colorNormal?: string;
  colorPlane?: string;
  colorTriangle?: string;
  colorVolume?: string;
  planeOpacity?: number;
  labelU?: string;
  labelV?: string;
  labelW?: string;
  labelNormal?: string;
}

/**
 * Nodo para recta 3D en forma vectorial: r(t) = P + t·v
 * P = point (punto de paso), v = direction (vector director)
 */
export interface Line3DNode extends MathMDNodeBase {
  type: "line3d";
  point: [number, number, number];
  direction: [number, number, number];
  tDomain?: [number, number];
  showPoint?: boolean;
  showDirection?: boolean;
  showSegment?: boolean;
  segmentT?: [number, number];
  color?: string;
  colorPoint?: string;
  colorDirection?: string;
  labelPoint?: string;
  labelDirection?: string;
  label?: string;
  paramName?: string;
}

/**
 * Nodo para plano 3D con múltiples formas de definición:
 * - point-normal: n·(X - P) = 0 (punto + normal)
 * - three-points: 3 puntos no colineales A, B, C → n = (B-A)×(C-A)
 * - point-vectors: punto P + 2 vectores u, v → n = u×v
 * - parametric: X = P + s·u + t·v (parametrización)
 * - general: Ax + By + Cz + D = 0 (ecuación general)
 */
export type Plane3DMode = "point-normal" | "three-points" | "point-vectors" | "parametric" | "general";

export interface Plane3DNode extends MathMDNodeBase {
  type: "plane3d";
  mode?: Plane3DMode;
  
  // point-normal (default)
  point?: [number, number, number];
  normal?: [number, number, number];
  
  // three-points
  pointA?: [number, number, number];
  pointB?: [number, number, number];
  pointC?: [number, number, number];
  
  // point-vectors / parametric
  vectorU?: [number, number, number];
  vectorV?: [number, number, number];
  
  // general: Ax + By + Cz + D = 0
  A?: number;
  B?: number;
  C?: number;
  D?: number;
  
  xDomain?: [number, number];
  yDomain?: [number, number];
  showPoint?: boolean;
  showNormal?: boolean;
  showIntercepts?: boolean;
  color?: string;
  colorPoint?: string;
  colorNormal?: string;
  opacity?: number;
  labelPoint?: string;
  labelNormal?: string;
  labelU?: string;
  labelV?: string;
  label?: string;
}

/**
 * Nodo para visualización del ángulo entre dos rectas 3D.
 * Muestra dos rectas con sus vectores directores y el arco del ángulo menor.
 */
export interface AngleBetweenLinesNode extends MathMDNodeBase {
  type: "anglebetweenlines";
  line1: Line3DNode;
  line2: Line3DNode;
  showArc?: boolean;
  showProjection?: boolean;
  colorLine1?: string;
  colorLine2?: string;
  colorArc?: string;
  labelLine1?: string;
  labelLine2?: string;
  labelArc?: string;
}

/**
 * Nodo para visualización del ángulo entre dos planos.
 * Muestra dos planos con sus normales y el diedro (ángulo agudo).
 */
export interface AngleBetweenPlanesNode extends MathMDNodeBase {
  type: "anglebetweenplanes";
  plane1: Plane3DNode;
  plane2: Plane3DNode;
  showDiedro?: boolean;
  showNormals?: boolean;
  colorPlane1?: string;
  colorPlane2?: string;
  colorNormal1?: string;
  colorNormal2?: string;
  colorDiedro?: string;
  labelPlane1?: string;
  labelPlane2?: string;
  labelNormal1?: string;
  labelNormal2?: string;
}

/**
 * Nodo para visualización del ángulo entre una recta y un plano.
 * Muestra la recta, el plano, la proyección ortogonal y el ángulo complementario.
 */
export interface LinePlaneAngleNode extends MathMDNodeBase {
  type: "lineplaneangle";
  line: Line3DNode;
  plane: Plane3DNode;
  showProjection?: boolean;
  showPerpendicular?: boolean;
  colorLine?: string;
  colorPlane?: string;
  colorProjection?: string;
  colorPerpendicular?: string;
  labelLine?: string;
  labelPlane?: string;
  labelProjection?: string;
}

/**
 * Nodo para visualización de distancia punto-punto.
 */
export interface PointPlaneDistanceNode extends MathMDNodeBase {
  type: "pointplanedistance";
  point: Point3DNode;
  plane: Plane3DNode;
  showPerpendicular?: boolean;
  showFoot?: boolean;
  colorPoint?: string;
  colorPlane?: string;
  colorPerpendicular?: string;
  labelPoint?: string;
  labelPlane?: string;
  labelFoot?: string;
}

/**
 * Nodo para visualización de distancia punto-recta.
 */
export interface PointLineDistanceNode extends MathMDNodeBase {
  type: "pointlinedistance";
  point: Point3DNode;
  line: Line3DNode;
  showPerpendicular?: boolean;
  showFoot?: boolean;
  colorPoint?: string;
  colorLine?: string;
  colorPerpendicular?: string;
  labelPoint?: string;
  labelLine?: string;
  labelFoot?: string;
}

/**
 * Nodo para visualización de distancia entre dos rectas (alabeadas o paralelas).
 */
export interface LinesDistanceNode extends MathMDNodeBase {
  type: "linesdistance";
  line1: Line3DNode;
  line2: Line3DNode;
  showClosestPoints?: boolean;
  showCommonPerpendicular?: boolean;
  colorLine1?: string;
  colorLine2?: string;
  colorPerpendicular?: string;
  labelLine1?: string;
  labelLine2?: string;
}

/**
 * Tipo de cónica para el nodo.
 */
export type ConicType = "circle" | "ellipse" | "parabola" | "hyperbola";

/**
 * Modo de definición de una cónica.
 */
export type ConicMode = "focus-directrix" | "foci" | "center-radius" | "center-axes" | "general" | "three-points" | "focus-point";

/**
 * Nodo para visualización de cónicas 2D (circunferencia, elipse, parábola, hipérbola).
 * Soporta múltiples modos de definición: foco-directriz, dos focos, centro-radio, centro-ejes, general, tres puntos, foco-punto.
 */
export interface ConicNode extends MathMDNodeBase {
  type: "conic";
  conicType?: ConicType;
  mode?: ConicMode;
  
  // focus-directrix (foco-directriz)
  focus?: [number, number];
  directrix?: { A: number; B: number; C: number }; // Ax + By + C = 0
  eccentricity?: number;
  
  // foci (dos focos)
  focus1?: [number, number];
  focus2?: [number, number];
  sumDistances?: number; // para elipse: 2a
  diffDistances?: number; // para hipérbola: 2a
  
  // center-radius (circunferencia)
  center?: [number, number];
  radius?: number;
  
  // center-axes (elipse con centro y ejes)
  semiMajorAxis?: number; // a
  semiMinorAxis?: number; // b
  rotation?: number; // radianes
  
  // general: Ax² + Bxy + Cy² + Dx + Ey + F = 0
  A?: number;
  B?: number;
  C?: number;
  D?: number;
  E?: number;
  F?: number;
  
  // three-points (circunferencia por 3 puntos)
  pointA?: [number, number];
  pointB?: [number, number];
  pointC?: [number, number];
  
  // focus-point (parábola foco-punto en directriz)
  focusPoint?: [number, number];
  directrixPoint?: [number, number];
  
  // Visualización
  xDomain?: [number, number];
  yDomain?: [number, number];
  showFocus?: boolean;
  showDirectrix?: boolean;
  showCenter?: boolean;
  showVertices?: boolean;
  showAxes?: boolean;
  showAsymptotes?: boolean;
  showDirectrices?: boolean;
  color?: string;
  colorFocus?: string;
  colorDirectrix?: string;
  colorCenter?: string;
  colorVertices?: string;
  colorAxes?: string;
  colorAsymptotes?: string;
  opacity?: number;
  labelFocus?: string;
  labelDirectrix?: string;
  labelCenter?: string;
  labelVertices?: string;
  label?: string;
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
  paramControls?: GraphParameterControls;
  x: string;
  y: string;
  tDomain: [number, number];
  samples?: number;
  timelineRef?: string;
  color?: string;
  animated?: boolean;
  showTrail?: boolean;
  trailLength?: number;
  followParticle?: boolean;
  showVelocity?: boolean;
  showAcceleration?: boolean;
  showTangent?: boolean;
  showNormal?: boolean;
}

export interface Flow2DNode extends MathMDNodeBase {
  type: "flow2d";
  paramControls?: GraphParameterControls;
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

/** Ten independent calculus visualization modes, all serializable as .bwjm text. */
export type CalculusVizMode =
  | "area-dx" | "area-dy" | "area-pieces" | "area-parametric" | "area-polar"
  | "double-region" | "change-order" | "double-polar" | "revolution" | "green";

export interface CalculusVizNode extends MathMDNodeBase {
  type: "calculusviz";
  paramControls?: GraphParameterControls;
  mode: CalculusVizMode;
  domain: [number, number];
  f?: string;
  g?: string;
  integrand?: string;
  paramX?: string;
  paramY?: string;
  fieldP?: string;
  fieldQ?: string;
  reverseLower?: string;
  reverseUpper?: string;
  reverseDomain?: [number, number];
  order?: "dydx" | "dxdy";
  axis?: "x" | "y";
  axisOffset?: number;
  method?: "disks" | "washers" | "shells";
  samples?: number;
}

// TextNode preserved for legacy consumers
export interface TextNode extends MathMDNodeBase {
  type: "text";
  content: string;
}

// The 24 recognized MathMD visualization nodes (15 original + 8 new scene contracts + 1 cross product)
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
  | Flow2DNode
  | CalculusVizNode
  | CrossProductNode
  | Line3DNode
  | Plane3DNode
  | AngleBetweenLinesNode
  | AngleBetweenPlanesNode
  | LinePlaneAngleNode
  | PointPlaneDistanceNode
  | PointLineDistanceNode
  | LinesDistanceNode
  | ConicNode;

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

/** Shared schema: invalid ranges/duplicate names never enter the rendering engine. */
export const graphParameterSchema = z.object({
  name: controlNameSchema.refine(name =>
    !["x","y","z","t","r","theta","phi","pi","e"].includes(name.toLowerCase()),
    { message: "Independent variables and mathematical constants are not parameters" }),
  min: z.number().finite().min(-1e6).max(1e6),
  max: z.number().finite().min(-1e6).max(1e6),
  step: z.number().finite().positive().max(1e6),
  default: z.number().finite(),
  integer: z.boolean().optional(),
}).superRefine((p,ctx) => {
  if(p.max<=p.min) ctx.addIssue({code:z.ZodIssueCode.custom,
    message:"Maximum must exceed minimum",path:["max"]});
  if(p.default<p.min||p.default>p.max) ctx.addIssue({code:z.ZodIssueCode.custom,
    message:"Default is outside range",path:["default"]});
  if(p.integer&&![p.min,p.max,p.default,p.step].every(Number.isInteger)) {
    ctx.addIssue({code:z.ZodIssueCode.custom,
      message:"Integer control requires integer limits, default and step",path:["integer"]});
  }
});
export const graphParameterControlsSchema = z.object({
  enabled: z.boolean(),
  animate: z.boolean().optional(),
  parameters: z.array(graphParameterSchema).max(8),
}).superRefine((config,ctx) => {
  const names=new Set<string>();
  config.parameters.forEach((p,i)=>{
    if(names.has(p.name)) ctx.addIssue({code:z.ZodIssueCode.custom,
      message:"Duplicate graph parameter",path:["parameters",i,"name"]});
    names.add(p.name);
  });
});

export const plot2dSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("plot2d"),
  paramControls: graphParameterControlsSchema.optional(),
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
  paramControls: graphParameterControlsSchema.optional(),
  equation: z.string().min(1, "Equation must be a non-empty string"),
  xDomain: domainSchema,
  yDomain: domainSchema,
  samples: z.number().int().min(2).max(200).optional(),
  contours: z.boolean().optional(),
  animated: z.boolean().optional(),
  showInfo: z.boolean().optional(),
  color: z.string().optional(),
});

const vectorStudyModeSchema = z.enum([
  "classify", "coordinates", "translate", "components", "displacement",
  "compare", "sum", "difference", "scale", "properties", "combination",
]);
const vectorFactorSchema = z.union([
  z.number().finite(),
  z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,31}$/),
]);
const vectorStudyOptionsSchema = {
  mode: vectorStudyModeSchema.optional(),
  factor: vectorFactorSchema.optional(),
  secondFactor: vectorFactorSchema.optional(),
  showSteps: z.boolean().optional(),
};

export const vector2dSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("vector2d"),
  origin: z.tuple([z.number().finite(), z.number().finite()]),
  vector: z.tuple([z.number().finite(), z.number().finite()]),
  other: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  third: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  ...vectorStudyOptionsSchema,
  label: z.string().optional(),
  color: z.string().optional(),
});

export const vector3dSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("vector3d"),
  origin: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]),
  vector: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]),
  other: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).optional(),
  third: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).optional(),
  ...vectorStudyOptionsSchema,
  label: z.string().optional(),
  color: z.string().optional(),
});

export const curve3dSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("curve3d"),
  paramControls: graphParameterControlsSchema.optional(),
  x: z.string().min(1, "x equation must be a non-empty string"),
  y: z.string().min(1, "y equation must be a non-empty string"),
  z: z.string().min(1, "z equation must be a non-empty string"),
  tDomain: domainSchema,
  color: z.string().optional(),
  animated: z.boolean().optional(),
  showVectors: z.boolean().optional(),
  showTNB: z.boolean().optional(),
  showLegend: z.boolean().optional(),
  showInfo: z.boolean().optional(),
});

export const vectorfield2dSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("vectorfield2d"),
  paramControls: graphParameterControlsSchema.optional(),
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
  paramControls: graphParameterControlsSchema.optional(),
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
  paramControls: graphParameterControlsSchema.optional(),
  x: z.string().min(1),
  y: z.string().min(1),
  tDomain: domainSchema,
  samples: z.number().int().min(2).max(500).optional(),
  timelineRef: z.string().optional(),
  color: z.string().max(64).optional(),
  animated: z.boolean().optional(),
  showTrail: z.boolean().optional(),
  trailLength: z.number().int().min(2).max(500).optional(),
  followParticle: z.boolean().optional(),
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

export const calculusVizSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("calculusviz"),
  paramControls: graphParameterControlsSchema.optional(),
  mode: z.enum([
    "area-dx", "area-dy", "area-pieces", "area-parametric", "area-polar",
    "double-region", "change-order", "double-polar", "revolution", "green",
  ]),
  domain: domainSchema,
  f: z.string().min(1).max(1024).optional(),
  g: z.string().min(1).max(1024).optional(),
  integrand: z.string().min(1).max(1024).optional(),
  paramX: z.string().min(1).max(1024).optional(),
  paramY: z.string().min(1).max(1024).optional(),
  fieldP: z.string().min(1).max(1024).optional(),
  fieldQ: z.string().min(1).max(1024).optional(),
  reverseLower: z.string().min(1).max(1024).optional(),
  reverseUpper: z.string().min(1).max(1024).optional(),
  reverseDomain: domainSchema.optional(),
  order: z.enum(["dydx", "dxdy"]).optional(),
  axis: z.enum(["x", "y"]).optional(),
  axisOffset: z.number().finite().optional(),
  method: z.enum(["disks", "washers", "shells"]).optional(),
  samples: z.number().int().min(30).max(300).optional(),
});

function validateCalculusViz(
  data: z.infer<typeof calculusVizSchema>,
  context: z.RefinementCtx,
): void {
  const betweenModes = ["area-dx", "area-dy", "area-pieces", "area-polar",
    "double-region", "change-order", "double-polar", "revolution"];
  if (betweenModes.includes(data.mode) && (!data.f || !data.g)) {
    context.addIssue({code:z.ZodIssueCode.custom,
      message:"This mode requires nonempty expressions f and g", path:["f"]});
  }
  if (["area-parametric", "green"].includes(data.mode) && (!data.paramX || !data.paramY)) {
    context.addIssue({code:z.ZodIssueCode.custom,
      message:"This mode requires paramX and paramY", path:["paramX"]});
  }
  if (data.mode === "green" && (!data.fieldP || !data.fieldQ)) {
    context.addIssue({code:z.ZodIssueCode.custom,
      message:"Green mode requires fieldP and fieldQ", path:["fieldP"]});
  }
  if (data.mode === "change-order" &&
    (!data.reverseLower || !data.reverseUpper || !data.reverseDomain)) {
    context.addIssue({code:z.ZodIssueCode.custom,
      message:"Change of order requires reverseLower, reverseUpper and reverseDomain",
      path:["reverseLower"]});
  }
  if (data.mode === "revolution" &&
    ((data.axis === "y" && data.method !== "shells") ||
      (data.axis !== "y" && data.method === "shells"))) {
    context.addIssue({code:z.ZodIssueCode.custom,
      message:"Use shells around vertical axes, or disks/washers around horizontal axes",
      path:["method"]});
  }
}

// Schema for CrossProduct visualization node
export const crossProductSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("crossproduct"),
  u: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]),
  v: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]),
  w: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).optional(),
  origin: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).optional(),
  showPlane: z.boolean().optional(),
  showNormal: z.boolean().optional(),
  showArea: z.boolean().optional(),
  showTriangle: z.boolean().optional(),
  showVolume: z.boolean().optional(),
  showSteps: z.boolean().optional(),
  reverseOrder: z.boolean().optional(),
  showDeterminant: z.boolean().optional(),
  showRightHand: z.boolean().optional(),
  showAnticommutative: z.boolean().optional(),
  showDistributive: z.boolean().optional(),
  showIdentities: z.boolean().optional(),
  showCollapse: z.boolean().optional(),
  collapseFactor: z.number().finite().min(0).max(1).optional(),
  collapseTarget: z.enum(["zero", "coplanar"]).optional(),
  showSignChallenge: z.boolean().optional(),
  signChallengeMode: z.enum(["random", "fixed", "quiz"]).optional(),
  signChallengeSeed: z.number().int().optional(),
  colorU: z.string().optional(),
  colorNormal: z.string().optional(),
  colorPlane: z.string().optional(),
  colorTriangle: z.string().optional(),
  colorVolume: z.string().optional(),
  planeOpacity: z.number().finite().min(0).max(1).optional(),
  labelU: z.string().optional(),
  labelV: z.string().optional(),
  labelW: z.string().optional(),
  labelNormal: z.string().optional(),
});

// Schema for Line3D visualization node
export const line3dNodeSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("line3d"),
  point: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]),
  direction: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]),
  tDomain: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  showPoint: z.boolean().optional(),
  showDirection: z.boolean().optional(),
  showSegment: z.boolean().optional(),
  segmentT: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  color: z.string().optional(),
  colorPoint: z.string().optional(),
  colorDirection: z.string().optional(),
  labelPoint: z.string().optional(),
  labelDirection: z.string().optional(),
  label: z.string().optional(),
  paramName: z.string().optional(),
});

export function validateLine3D(data: any, ctx: z.RefinementCtx): void {
  // Validate direction is not zero vector
  if (data.direction && data.direction[0] === 0 && data.direction[1] === 0 && data.direction[2] === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Vector director no puede ser cero", path: ["direction"] });
  }
}

export const line3dSchema = line3dNodeSchema.superRefine(validateLine3D);

// Schema for Plane3D visualization node
export const plane3dNodeSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("plane3d"),
  mode: z.enum(["point-normal", "three-points", "point-vectors", "parametric", "general"]).optional(),
  
  // point-normal
  point: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).optional(),
  normal: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).optional(),
  
  // three-points
  pointA: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).optional(),
  pointB: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).optional(),
  pointC: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).optional(),
  
  // point-vectors / parametric
  vectorU: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).optional(),
  vectorV: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).optional(),
  
  // general: Ax + By + Cz + D = 0
  A: z.number().finite().optional(),
  B: z.number().finite().optional(),
  C: z.number().finite().optional(),
  D: z.number().finite().optional(),
  
  xDomain: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  yDomain: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  showPoint: z.boolean().optional(),
  showNormal: z.boolean().optional(),
  showIntercepts: z.boolean().optional(),
  color: z.string().optional(),
  colorPoint: z.string().optional(),
  colorNormal: z.string().optional(),
  opacity: z.number().finite().min(0).max(1).optional(),
  labelPoint: z.string().optional(),
  labelNormal: z.string().optional(),
  labelU: z.string().optional(),
  labelV: z.string().optional(),
  label: z.string().optional(),
});

export function validatePlane3D(data: any, ctx: z.RefinementCtx): void {
  const mode = data.mode ?? "point-normal";
  
  // Validate based on mode
  if (mode === "point-normal") {
    if (!data.point || !data.normal) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Modo point-normal requiere point y normal", path: ["mode"] });
    } else if (data.normal[0] === 0 && data.normal[1] === 0 && data.normal[2] === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Vector normal no puede ser cero", path: ["normal"] });
    }
  } else if (mode === "three-points") {
    if (!data.pointA || !data.pointB || !data.pointC) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Modo three-points requiere pointA, pointB y pointC", path: ["mode"] });
    }
    // Check collinearity: (B-A) × (C-A) != 0
    if (data.pointA && data.pointB && data.pointC) {
      const AB = [data.pointB[0] - data.pointA[0], data.pointB[1] - data.pointA[1], data.pointB[2] - data.pointA[2]];
      const AC = [data.pointC[0] - data.pointA[0], data.pointC[1] - data.pointA[1], data.pointC[2] - data.pointA[2]];
      const cross = [
        AB[1] * AC[2] - AB[2] * AC[1],
        AB[2] * AC[0] - AB[0] * AC[2],
        AB[0] * AC[1] - AB[1] * AC[0],
      ];
      const mag = Math.sqrt(cross[0]**2 + cross[1]**2 + cross[2]**2);
      if (mag < 1e-12) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Los tres puntos son colineales, no definen un plano único", path: ["mode"] });
      }
    }
  } else if (mode === "point-vectors" || mode === "parametric") {
    if (!data.point || !data.vectorU || !data.vectorV) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Modo ${mode} requiere point, vectorU y vectorV`, path: ["mode"] });
    } else {
      const cross = [
        data.vectorU[1] * data.vectorV[2] - data.vectorU[2] * data.vectorV[1],
        data.vectorU[2] * data.vectorV[0] - data.vectorU[0] * data.vectorV[2],
        data.vectorU[0] * data.vectorV[1] - data.vectorU[1] * data.vectorV[0],
      ];
      const mag = Math.sqrt(cross[0]**2 + cross[1]**2 + cross[2]**2);
      if (mag < 1e-12) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Los vectores u y v son paralelos, no definen un plano único", path: ["mode"] });
      }
    }
  } else if (mode === "general") {
    if (data.A === undefined || data.B === undefined || data.C === undefined || data.D === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Modo general requiere A, B, C, D", path: ["mode"] });
    }
    const mag = Math.sqrt((data.A??0)**2 + (data.B??0)**2 + (data.C??0)**2);
    if (mag < 1e-12) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Normal (A,B,C) no puede ser cero", path: ["mode"] });
    }
  }
  
  if (data.normal && data.normal[0] === 0 && data.normal[1] === 0 && data.normal[2] === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Vector normal no puede ser cero", path: ["normal"] });
  }
}

export const plane3dSchema = plane3dNodeSchema.superRefine(validatePlane3D);

// Schema for AngleBetweenLines visualization node
export const angleBetweenLinesSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("anglebetweenlines"),
  line1: z.object({}).optional(),
  line2: z.object({}).optional(),
  showArc: z.boolean().optional(),
  showProjection: z.boolean().optional(),
  colorLine1: z.string().optional(),
  colorLine2: z.string().optional(),
  colorArc: z.string().optional(),
  labelLine1: z.string().optional(),
  labelLine2: z.string().optional(),
  labelArc: z.string().optional(),
});

// Schema for AngleBetweenPlanes visualization node
export const angleBetweenPlanesSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("anglebetweenplanes"),
  plane1: z.object({}).optional(),
  plane2: z.object({}).optional(),
  showDiedro: z.boolean().optional(),
  showNormals: z.boolean().optional(),
  colorPlane1: z.string().optional(),
  colorPlane2: z.string().optional(),
  colorNormal1: z.string().optional(),
  colorNormal2: z.string().optional(),
  colorDiedro: z.string().optional(),
  labelPlane1: z.string().optional(),
  labelPlane2: z.string().optional(),
  labelNormal1: z.string().optional(),
  labelNormal2: z.string().optional(),
});

// Schema for LinePlaneAngle visualization node
export const linePlaneAngleSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("lineplaneangle"),
  line: z.object({}).optional(),
  plane: z.object({}).optional(),
  showProjection: z.boolean().optional(),
  showPerpendicular: z.boolean().optional(),
  colorLine: z.string().optional(),
  colorPlane: z.string().optional(),
  colorProjection: z.string().optional(),
  colorPerpendicular: z.string().optional(),
  labelLine: z.string().optional(),
  labelPlane: z.string().optional(),
  labelProjection: z.string().optional(),
});

// Schema for PointPlaneDistance visualization node
export const pointPlaneDistanceSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("pointplanedistance"),
  point: z.object({}).optional(),
  plane: z.object({}).optional(),
  showPerpendicular: z.boolean().optional(),
  showFoot: z.boolean().optional(),
  colorPoint: z.string().optional(),
  colorPlane: z.string().optional(),
  colorPerpendicular: z.string().optional(),
  labelPoint: z.string().optional(),
  labelPlane: z.string().optional(),
  labelFoot: z.string().optional(),
});

// Schema for PointLineDistance visualization node
export const pointLineDistanceSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("pointlinedistance"),
  point: z.object({}).optional(),
  line: z.object({}).optional(),
  showPerpendicular: z.boolean().optional(),
  showFoot: z.boolean().optional(),
  colorPoint: z.string().optional(),
  colorLine: z.string().optional(),
  colorPerpendicular: z.string().optional(),
  labelPoint: z.string().optional(),
  labelLine: z.string().optional(),
  labelFoot: z.string().optional(),
});

// Schema for LinesDistance visualization node
// Schema for LinesDistance visualization node
export const linesDistanceSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("linesdistance"),
  line1: z.object({}).optional(),
  line2: z.object({}).optional(),
  showClosestPoints: z.boolean().optional(),
  showCommonPerpendicular: z.boolean().optional(),
  colorLine1: z.string().optional(),
  colorLine2: z.string().optional(),
  colorPerpendicular: z.string().optional(),
  labelLine1: z.string().optional(),
  labelLine2: z.string().optional(),
});

// Schema for Conic visualization node
export const conicBaseSchema = mathmdNodeBaseSchema.extend({
  type: z.literal("conic"),
  conicType: z.enum(["circle", "ellipse", "parabola", "hyperbola"]).optional(),
  mode: z.enum(["focus-directrix", "foci", "center-radius", "center-axes", "general", "three-points", "focus-point"]).optional(),
  
  // focus-directrix
  focus: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  directrix: z.object({ A: z.number().finite(), B: z.number().finite(), C: z.number().finite() }).optional(),
  eccentricity: z.number().finite().optional(),
  
  // foci
  focus1: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  focus2: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  sumDistances: z.number().finite().positive().optional(),
  diffDistances: z.number().finite().positive().optional(),
  
  // center-radius
  center: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  radius: z.number().finite().positive().optional(),
  
  // center-axes
  semiMajorAxis: z.number().finite().positive().optional(),
  semiMinorAxis: z.number().finite().positive().optional(),
  rotation: z.number().finite().optional(),
  
  // general
  A: z.number().finite().optional(),
  B: z.number().finite().optional(),
  C: z.number().finite().optional(),
  D: z.number().finite().optional(),
  E: z.number().finite().optional(),
  F: z.number().finite().optional(),
  
  // three-points
  pointA: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  pointB: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  pointC: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  
  // focus-point
  focusPoint: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  directrixPoint: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  
  // Visualización
  xDomain: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  yDomain: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  showFocus: z.boolean().optional(),
  showDirectrix: z.boolean().optional(),
  showCenter: z.boolean().optional(),
  showVertices: z.boolean().optional(),
  showAxes: z.boolean().optional(),
  showAsymptotes: z.boolean().optional(),
  showDirectrices: z.boolean().optional(),
  color: z.string().optional(),
  colorFocus: z.string().optional(),
  colorDirectrix: z.string().optional(),
  colorCenter: z.string().optional(),
  colorVertices: z.string().optional(),
  colorAxes: z.string().optional(),
  colorAsymptotes: z.string().optional(),
  opacity: z.number().finite().min(0).max(1).optional(),
  labelFocus: z.string().optional(),
  labelDirectrix: z.string().optional(),
  labelCenter: z.string().optional(),
  labelVertices: z.string().optional(),
  label: z.string().optional(),
});

export function validateConic(data: any, ctx: z.RefinementCtx): void {
  const mode = data.mode ?? "center-radius";
  const type = data.conicType ?? "circle";
  
  if (mode === "focus-directrix") {
    if (!data.focus || !data.directrix) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Modo focus-directrix requiere focus y directrix", path: ["mode"] });
    }
    if (data.eccentricity !== undefined && data.eccentricity <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Excentricidad debe ser positiva", path: ["eccentricity"] });
    }
  } else if (mode === "foci") {
    if (!data.focus1 || !data.focus2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Modo foci requiere focus1 y focus2", path: ["mode"] });
    }
    if (data.sumDistances !== undefined && data.sumDistances <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Suma de distancias debe ser positiva", path: ["sumDistances"] });
    }
    if (data.diffDistances !== undefined && data.diffDistances <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Diferencia de distancias debe ser positiva", path: ["diffDistances"] });
    }
  } else if (mode === "center-radius") {
    if (!data.center || !data.radius) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Modo center-radius requiere center y radius", path: ["mode"] });
    }
    if (data.radius !== undefined && data.radius <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Radio debe ser positivo", path: ["radius"] });
    }
  } else if (mode === "center-axes") {
    if (!data.center || !data.semiMajorAxis || !data.semiMinorAxis) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Modo center-axes requiere center, semiMajorAxis y semiMinorAxis", path: ["mode"] });
    }
    if (data.semiMajorAxis !== undefined && data.semiMinorAxis !== undefined && data.semiMinorAxis > data.semiMajorAxis) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Eje menor no puede ser mayor que eje mayor", path: ["semiMinorAxis"] });
    }
  } else if (mode === "general") {
    if (data.A === undefined || data.B === undefined || data.C === undefined || data.D === undefined || data.E === undefined || data.F === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Modo general requiere A, B, C, D, E, F", path: ["mode"] });
    }
    const disc = (data.B??0)**2 - 4 * (data.A??0) * (data.C??0);
    if (disc === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Discriminante B² - 4AC = 0: parábola degenerada o rectas", path: ["mode"] });
    }
  } else if (mode === "three-points") {
    if (!data.pointA || !data.pointB || !data.pointC) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Modo three-points requiere pointA, pointB y pointC", path: ["mode"] });
    }
    // Check collinearity
    if (data.pointA && data.pointB && data.pointC) {
      const area = 0.5 * Math.abs(
        data.pointA[0] * (data.pointB[1] - data.pointC[1]) +
        data.pointB[0] * (data.pointC[1] - data.pointA[1]) +
        data.pointC[0] * (data.pointA[1] - data.pointB[1])
      );
      if (area < 1e-12) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Los tres puntos son colineales, no definen una circunferencia única", path: ["mode"] });
      }
    }
  } else if (mode === "focus-point") {
    if (!data.focusPoint || !data.directrixPoint) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Modo focus-point requiere focusPoint y directrixPoint", path: ["mode"] });
    }
  }
  
  // Validate conicType consistency with mode
  if (mode === "center-radius" && data.conicType && data.conicType !== "circle") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Modo center-radius solo compatible con circle", path: ["conicType"] });
  }
  if (mode === "center-axes" && data.conicType && data.conicType !== "ellipse") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Modo center-axes solo compatible con ellipse", path: ["conicType"] });
  }
  if (mode === "focus-directrix" && data.conicType && data.conicType === "circle") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Modo focus-directrix no compatible con circle (excentricidad = 1 para parábola)", path: ["conicType"] });
  }
}

export const conicSchema = conicBaseSchema.superRefine(validateConic);

// Discriminated union of all MathMD block schemas
const mathmdNodeDiscriminatedUnion = z.discriminatedUnion("type", [
  plot2dSchema as any,
  surface3dSchema as any,
  vector2dSchema as any,
  vector3dSchema as any,
  curve3dSchema as any,
  vectorfield2dSchema as any,
  gradientSchema as any,
  tangentplaneSchema as any,
  sliderNodeSchema as any,
  checkboxSchema as any,
  point2dSchema as any,
  point3dSchema as any,
  diagramSchema as any,
  geometrySchema as any,
  contourSchema as any,
  trajectorySchema as any,
  particleSchema as any,
  vectorArrowSchema as any,
  frameSchema as any,
  fieldSchema as any,
  regionSchema as any,
  cameraSchema as any,
  timelineNodeSchema as any,
  dataTableSchema as any,
  functionTableSchema as any,
  dataChartSchema as any,
  statisticsSchema as any,
  parametric2dSchema as any,
  flow2dSchema as any,
  calculusVizSchema as any,
  crossProductSchema as any,
  line3dNodeSchema as any,
  plane3dNodeSchema as any,
  angleBetweenLinesSchema as any,
  angleBetweenPlanesSchema as any,
  linePlaneAngleSchema as any,
  pointPlaneDistanceSchema as any,
  pointLineDistanceSchema as any,
  linesDistanceSchema as any,
  conicBaseSchema as any,
]);

export const mathmdNodeSchema = mathmdNodeDiscriminatedUnion.superRefine((node, context) => {
  if (node.type === "line3d") {
    validateLine3D(node, context);
  }
  if (node.type === "plane3d") {
    validatePlane3D(node, context);
  }
  if (node.type === "conic") {
    validateConic(node, context);
  }
  if (node.type === "calculusviz") {
    validateCalculusViz(node, context);
  }
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
    node.rows.forEach((row: (string | number | boolean | null)[], index: number) => {
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
