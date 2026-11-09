import { compileExpression, evaluateExpression, sample1D, sampleSurface } from "./mathEngine.js";
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

export { compileExpression, evaluateExpression, sample1D, sampleSurface };
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

