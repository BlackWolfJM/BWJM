import type { MathMDNode } from "@mathmd/ast";

/**
 * Match scientific AST nodes across one source edit. This is deliberately
 * conservative: equal explicit IDs or unique untouched fences are certain,
 * and an edited implicit fence is matched only if the edit intersects exactly
 * one old and one new scientific block of the same kind. Ambiguous copies are
 * left unmatched so the caller can replace only those mounts.
 */
export function matchScientificNodes(
  previousSource: string,
  previousNodes: readonly MathMDNode[],
  nextSource: string,
  nextNodes: readonly MathMDNode[],
): Map<MathMDNode, MathMDNode> {
  const matches = new Map<MathMDNode, MathMDNode>();
  const used = new Set<MathMDNode>();
  const block = (source: string, node: MathMDNode) =>
    source.slice(node.range.start.offset, node.range.end.offset);
  const explicitId = (source: string, node: MathMDNode): string | undefined => {
    const content = block(source, node);
    // Only a property inside the original fenced node counts as an explicit ID.
    const match = content.match(/^\s*id:\s*(.*?)\s*$/m);
    return match && match[1] ? match[1].replace(/^['"]|['"]$/g, "") : undefined;
  };
  const take = (oldNode: MathMDNode, newNode: MathMDNode) => {
    if (used.has(oldNode) || matches.has(newNode)) return;
    used.add(oldNode);
    matches.set(newNode, oldNode);
  };

  // First match unique explicit IDs; a changed source range cannot alter
  // their identity. Duplicate explicit IDs must never borrow one mount.
  for (const next of nextNodes) {
    const key = explicitId(nextSource, next);
    if (!key) continue;
    const before = previousNodes.filter(old =>
      old.type === next.type && explicitId(previousSource, old) === key);
    const after = nextNodes.filter(current =>
      current.type === next.type && explicitId(nextSource, current) === key);
    if (before.length === 1 && after.length === 1) take(before[0], next);
  }

  // Unchanged fenced content remains identifiable if its IDs shift because
  // ordinal numbers or surrounding prose changed. Require uniqueness.
  for (const next of nextNodes) {
    if (matches.has(next)) continue;
    const text = block(nextSource, next);
    const before = previousNodes.filter(old =>
      !used.has(old) && old.type === next.type && block(previousSource, old) === text);
    const after = nextNodes.filter(current =>
      !matches.has(current) && current.type === next.type &&
      block(nextSource, current) === text);
    if (before.length === 1 && after.length === 1) take(before[0], next);
  }

  if (previousSource === nextSource) return matches;
  let prefix = 0;
  while (prefix < previousSource.length && prefix < nextSource.length &&
    previousSource[prefix] === nextSource[prefix]) prefix++;
  let oldEnd = previousSource.length;
  let newEnd = nextSource.length;
  while (oldEnd > prefix && newEnd > prefix &&
    previousSource[oldEnd - 1] === nextSource[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  const intersects = (node: MathMDNode, start: number, end: number) =>
    // Insertions at a range boundary are prose edits, not node edits.
    start < node.range.end.offset && end > node.range.start.offset;
  const impactedOld = previousNodes.filter(old =>
    !used.has(old) && intersects(old, prefix, oldEnd));
  const impactedNew = nextNodes.filter(next =>
    !matches.has(next) && intersects(next, prefix, newEnd));
  if (impactedOld.length === 1 && impactedNew.length === 1 &&
    impactedOld[0].type === impactedNew[0].type &&
    block(previousSource, impactedOld[0]).split(/\r?\n/, 1)[0] ===
      block(nextSource, impactedNew[0]).split(/\r?\n/, 1)[0]) {
    take(impactedOld[0], impactedNew[0]);
  }
  return matches;
}
