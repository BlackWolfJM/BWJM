import { compileExpression, evaluateExpression, sample1D, sampleSurface } from "./mathEngine.js";
import {
  computeExactArea,
  computeRiemannPartition,
  findIntersections,
} from "./regionRiemann.js";
import {
  computeCrossSection,
  computeRevolutionVolume,
  sampleRevolutionMesh,
} from "./solidRevolution.js";

export { compileExpression, evaluateExpression, sample1D, sampleSurface };
export { computeExactArea, computeRiemannPartition, findIntersections };
export { computeCrossSection, computeRevolutionVolume, sampleRevolutionMesh };

export type { Expression } from "./mathEngine.js";
export type {
  ExactAreaResult,
  IntersectionPoint,
  RiemannPartitionResult,
  RiemannRectangle,
} from "./regionRiemann.js";
export type {
  CrossSectionResult,
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
  computeRiemannPartition,
  computeRevolutionVolume,
  computeCrossSection,
  sampleRevolutionMesh,
};
