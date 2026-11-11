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
export { computeVectorStudy } from "./vectorStudy.js";
export type { VectorStudyInput, VectorStudyResult, VectorStudyStep, VectorStudyArrow, VectorStudyMode } from "./vectorStudy.js";
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
export {
  crossProduct,
  crossMagnitude,
  computeCrossProductScene,
  computeCrossProductStudy,
  computeCrossProductOrientation,
  computeCrossProductArea,
  computeCrossProductAnticommutativity,
  computeCrossProductDistributivity,
  inspectCrossProductIdentities,
  verifyPerpendicularity,
  describeCrossProductDeterminant,
  isParallel,
  tripleProduct,
  parallelepipedVolume,
  computeParallelepipedVolume,
  computeTripleProductStudy,
  interpolateCollapseVector,
  computeCollapseStudy,
  testCoplanarity,
  detectCrossProductErrors,
  generateSignChallengeExercise,
  computeLine3DInfo,
  computePlane3DInfo,
  lineLineRelation,
  linePlaneIntersection,
  computePlaneFromPoints,
  computePlaneFromVectors,
  planePlaneIntersection,
  threePlanesIntersection,
  angleBetweenLines,
  angleBetweenPlanes,
  linePlaneAngle,
  pointPlaneDistance,
  pointLineDistance,
  linesDistance,
  normalToPlaneFromVectors,
  crossProductWithSteps,
  isFiniteVector,
} from "./vectorOps.js";
export {
  classifyConic,
  focusDirectrixToGeneral,
  fociToGeneral,
  centerRadiusToGeneral,
  centerAxesToGeneral,
  focusPointToParabola,
  circleFromThreePoints,
  completeSquare,
  identifyConicFromMode,
} from "./conicOps.js";
export type { ConicType, ConicMode, ConicInfo } from "./conicOps.js";
export type {
  AnticommutativityInfo,
  DistributivityInfo,
  SymbolicIdentityProof,
  CrossProductIdentityReport,
  CrossProductAreaInfo,
  CrossProductCofactor,
  CrossProductDeterminant,
  CrossProductOrientation,
  CrossProductScene,
  CrossProductStudy,
  CrossStep,
  PerpendicularityInfo,
  ParallelepipedVolumeInfo,
  TripleProductStudy,
  CollapseStudy,
  CoplanarityTest,
  CrossProductErrorType,
  CrossProductError,
  SignChallengeExercise,
  Line3DInfo,
  Plane3DInfo,
  LineLineRelation,
  LinePlaneIntersection,
  PlaneFromPointsInfo,
  PlaneFromVectorsInfo,
  PlanePlaneIntersection,
  ThreePlanesIntersection,
  AngleBetweenLinesInfo,
  AngleBetweenPlanesInfo,
  LinePlaneAngleInfo,
  PointPlaneDistanceInfo,
  PointLineDistanceInfo,
  LinesDistanceInfo,
  Vector2,
  Vector3,
} from "./vectorOps.js";
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

