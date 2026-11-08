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

export { compileExpression, evaluateExpression, sample1D, sampleSurface };
export { computeExactArea, computePiecewiseArea, computeRiemannPartition, findIntersections };
export { computeCrossSection, computeRevolutionVolume, sampleRevolutionMesh };

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
};
