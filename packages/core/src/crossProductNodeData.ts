import type { CrossProductNode } from "@mathmd/ast";
import {
  computeCollapseStudy,
  computeCrossProductArea,
  computeCrossProductScene,
  computeCrossProductStudy,
  computeParallelepipedVolume,
  describeCrossProductDeterminant,
  isFiniteVector,
} from "@mathmd/math";

/**
 * Single source of graph and summary data for persisted nodes and live vector
 * previews. Presentation components never recalculate areas or triple products.
 */
export function prepareCrossProductNodeData(node: CrossProductNode) {
  const crossStudy = node.showSteps !== undefined
    ? computeCrossProductStudy(
      node.u, node.v, node.reverseOrder,
      node.showSteps && node.showDeterminant,
      node.w, node.showIdentities, node.origin,
    )
    : undefined;

  const collapseInfo = node.w && node.showCollapse && node.collapseFactor !== undefined
    ? computeCollapseStudy(
      node.u, node.v, node.w, Math.max(0, Math.min(1, node.collapseFactor)),
      node.collapseTarget ?? "coplanar",
    )
    : undefined;
  const effectiveW = collapseInfo?.currentW ?? node.w;
  const crossScene = crossStudy?.scene ??
    computeCrossProductScene(node.u, node.v, node.reverseOrder, effectiveW, node.origin);
  const crossArea = crossStudy?.area ??
    computeCrossProductArea(node.u, node.v, node.origin, crossScene);
  const crossDeterminant = node.showDeterminant
    ? describeCrossProductDeterminant(node.u, node.v, crossScene, node.reverseOrder)
    : undefined;
  // Preserve the existing engine contract. Consumers must explicitly test
  // showVolume === true before displaying this optional value.
  const volumeInfo = effectiveW && node.showVolume !== false && isFiniteVector(effectiveW, 3)
    ? computeParallelepipedVolume(node.u, node.v, effectiveW)
    : undefined;

  return {
    ...node, crossScene, crossStudy, crossArea, crossDeterminant,
    volumeInfo, collapseInfo, effectiveW,
  };
}

export type CrossProductNodeData = ReturnType<typeof prepareCrossProductNodeData>;
