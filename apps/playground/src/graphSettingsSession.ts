import type { MathMDNode } from "@mathmd/ast";

/**
 * UI-only state: no source edits, DOM nodes, React components or renderer IDs.
 * Tab IDs originate from workspaceDocuments; they are never filenames.
 */
type GraphBlock = Pick<MathMDNode, "id" | "type" | "range">;

export interface GraphSettingsIdentity {
  key: string;
  open: boolean;
  generation: number;
}

interface Entry {
  key: string;
  type: string;
  explicitId: string | null;
  source: string;
  structural: string;
  open: boolean;
}

interface Snapshot {
  entries: Entry[];
  generation: number;
}

/** Only keys changed by the existing "Personalizar gráfica" controls. */
const presentationOptions = new Set([
  "animated", "showInfo", "showLegend", "showTNB", "showVectors", "contours",
  "showTrail", "showVelocity", "showAcceleration", "showTangent", "showNormal",
  "followParticle", "showSteps", "showPlane", "showArea", "showTriangle",
  "showVolume", "showCollapse", "showSignChallenge", "reverseOrder",
  "showDeterminant", "showRightHand", "showAnticommutative",
  "showDistributive", "showIdentities", "showPoint", "showDirection",
  "showSegment", "showIntercepts", "collapseFactor", "collapseTarget",
  "signChallengeMode", "signChallengeSeed", "trailLength", "paramControls",
  "mode", "paramName", "point", "normal", "pointA", "pointB", "pointC",
  "vectorU", "vectorV", "tDomain", "xDomain", "yDomain",
  "A", "B", "C", "D",
]);

function explicitId(fence: string): string | null {
  // Only a top-level ID of the fenced block counts, not a nested YAML field.
  const value = fence.match(/^id:\s*(.*?)\s*$/m)?.[1]?.trim();
  return value ? value.replace(/^(['"])(.*)\1$/, "$2") : null;
}

function structuralSignature(fence: string): string {
  const lines = fence.replace(/\r\n/g, "\n").trim().split("\n");
  let skipNestedIndent = -1;
  return lines.filter((line, index) => {
    if (index === 0 || index === lines.length - 1) return true;
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    if (skipNestedIndent >= 0) {
      if (!line.trim() || indent > skipNestedIndent) return false;
      skipNestedIndent = -1;
    }
    const match = line.match(/^\s*([A-Za-z][A-Za-z0-9]*):(?:\s|$)/);
    if (!match) return true;
    if (!presentationOptions.has(match[1])) return true;
    if (match[1] === "paramControls" && !line.trim().slice(match[1].length + 1).trim()) {
      skipNestedIndent = indent;
    }
    return false;
  }).map(line => line.trimEnd()).join("\n");
}

function newEntry(source: string, node: GraphBlock): Entry {
  const fragment = source.slice(node.range.start.offset, node.range.end.offset);
  return {
    key: "",
    type: node.type,
    explicitId: explicitId(fragment),
    source: fragment,
    structural: structuralSignature(fragment),
    open: false,
  };
}

/**
 * Tracks the open state of the graph-settings disclosure for each *tab*.
 *
 * Matching is conservative:
 *  1. a unique explicit ID of the same block type;
 *  2. identical, unique implicit fence contents;
 *  3. unique implicit scientific contents after stripping only saved UI options.
 *
 * Replacements/ambiguous duplicates start closed. The opening state is never
 * written to .bwjm/.jm and does not change the workspace dirty indicator.
 */
export class GraphSettingsSession {
  private readonly documents = new Map<string, Snapshot>();
  private nextKey = 0;

  reconcile(
    documentId: string,
    markdown: string,
    nodes: readonly GraphBlock[],
  ): Map<GraphBlock, GraphSettingsIdentity> {
    const prior = this.documents.get(documentId);
    const next = nodes.map(node => newEntry(markdown, node));
    const oldEntries = prior?.entries ?? [];
    const remainingOld = new Set(oldEntries);
    const remainingNew = new Set(next);

    const adopt = (current: Entry, previous: Entry) => {
      current.key = previous.key;
      current.open = previous.open;
      remainingNew.delete(current);
      remainingOld.delete(previous);
    };

    // Explicit identifiers belong to one specific document and graph type.
    for (const current of [...remainingNew]) {
      if (!current.explicitId) continue;
      const previousCandidates = [...remainingOld].filter(old =>
        old.type === current.type && old.explicitId === current.explicitId);
      const nextCandidates = [...remainingNew].filter(item =>
        item.type === current.type && item.explicitId === current.explicitId);
      if (previousCandidates.length === 1 && nextCandidates.length === 1) {
        adopt(current, previousCandidates[0]);
      }
    }

    const adoptUnique = (signature: (item: Entry) => string) => {
      for (const current of [...remainingNew]) {
        if (current.explicitId) continue;
        const key = signature(current);
        const previousCandidates = [...remainingOld].filter(old =>
          !old.explicitId && old.type === current.type && signature(old) === key);
        const nextCandidates = [...remainingNew].filter(item =>
          !item.explicitId && item.type === current.type && signature(item) === key);
        if (previousCandidates.length === 1 && nextCandidates.length === 1) {
          adopt(current, previousCandidates[0]);
        }
      }
    };
    adoptUnique(item => item.source);
    adoptUnique(item => item.structural);

    for (const current of remainingNew) current.key = "graph-settings-" + ++this.nextKey;

    const generation = (prior?.generation ?? 0) + 1;
    this.documents.set(documentId, { entries: next, generation });
    return new Map(nodes.map((node, index) => [node, {
      key: next[index].key,
      open: next[index].open,
      generation,
    }]));
  }

  /** Prevent pending toggle callbacks from older trees from changing state. */
  setOpen(documentId: string, key: string, generation: number, open: boolean): boolean {
    const snapshot = this.documents.get(documentId);
    if (!snapshot || snapshot.generation !== generation) return false;
    const entry = snapshot.entries.find(item => item.key === key);
    if (!entry) return false;
    entry.open = open;
    return true;
  }

  getOpen(documentId: string, key: string): boolean {
    return this.documents.get(documentId)?.entries.some(item => item.key === key && item.open) ?? false;
  }

  removeDocument(documentId: string): void {
    this.documents.delete(documentId);
  }

  prune(openDocumentIds: ReadonlySet<string>): void {
    for (const id of this.documents.keys()) {
      if (!openDocumentIds.has(id)) this.documents.delete(id);
    }
  }
}
