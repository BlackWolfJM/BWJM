import { compileExpression, evaluateExpression, sample1D, sampleSurface, extractFreeParameters } from "./mathEngine.js";
import {
  computeExactArea,
  computePiecewiseArea,
  computeRiemannPartition,
  findIntersections,
} from "./regionRiemann.js";
import {
  computeCrossSection,
  computeRevolutionVolume,
  sampleRevolutionMesh,
} from "./solidRevolution.js";
import {
  computeGreensTheorem,
  computeKinematics,
  computeKinematicsSeries,
  computeLineIntegral,
  integrateFieldLine,
  sampleParametricTrajectory,
  sampleVectorField2D,
} from "./vectorCalculus.js";

export { compileExpression, evaluateExpression, sample1D, sampleSurface, extractFreeParameters };
export { expressionToLatex } from "./latex.js";
export { serializeScientificTable } from "./scientificTable.js";
export { generateFunctionTable, summarizeColumn, fitLinearRegression } from "./scientificAnalysis.js";
export { sampleParametric2D } from "./parametric2d.js";
export { sampleFlow2D } from "./flow2d.js";
export { computeCalculusViz } from "./calculusViz.js";
export type { CalculusSpec, CalculusVizResult } from "./calculusViz.js";
export type { ScientificSummary, RegressionResult } from "./scientificAnalysis.js";
export type { ScientificCell, ScientificTableFormat } from "./scientificTable.js";
export { computeExactArea, computePiecewiseArea, computeRiemannPartition, findIntersections };
export { computeCrossSection, computeRevolutionVolume, sampleRevolutionMesh };
export {
  computeGreensTheorem,
  computeKinematics,
  computeKinematicsSeries,
  computeLineIntegral,
  integrateFieldLine,
  sampleParametricTrajectory,
  sampleVectorField2D,
};

export type {
  ExactAreaResult,
  IntersectionPoint,
  PiecewiseAreaResult,
  RiemannPartitionResult,
  RiemannRectangle,
  SubintervalArea,
} from "./regionRiemann.js";
export type {
  CrossSectionResult,
  RevolutionAxis,
  RevolutionMeshResult,
  RevolutionVolumeResult,
} from "./solidRevolution.js";
export type {
  CurveParametric,
  FieldLineOptions,
  FieldLineResult,
  GreensTheoremOptions,
  GreensTheoremResult,
  KinematicsResult,
  KinematicsSeries,
  LineIntegralResult,
  Vector2D,
  Vector3D,
  VectorFieldAnalysis2D,
  VectorFieldPoint2D,
} from "./vectorCalculus.js";

export default {
  compileExpression,
  evaluateExpression,
  sample1D,
  sampleSurface,
  findIntersections,
  computeExactArea,
  computePiecewiseArea,
  computeRiemannPartition,
  computeRevolutionVolume,
  computeCrossSection,
  sampleRevolutionMesh,
  computeGreensTheorem,
  computeKinematics,
  computeKinematicsSeries,
  integrateFieldLine,
  sampleParametricTrajectory,
  sampleVectorField2D,
  computeLineIntegral,
};

