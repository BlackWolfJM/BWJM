import type { MathMDDocument } from "@mathmd/ast";
import type { MathMDCore } from "@mathmd/core";

/** Ephemeral values belong to a workspace tab, never to a filename or a graph id alone. */
export interface DocumentRuntimeValues {
  variables: Record<string, number>;
  parameters: Record<string, Record<string, number>>;
}

/** Snapshot the currently rendered engine before switching tabs or re-parsing Markdown. */
export function captureDocumentRuntime(
  core: MathMDCore, document: MathMDDocument,
): DocumentRuntimeValues {
  const parameters: DocumentRuntimeValues["parameters"] = {};
  document.children.forEach(node => {
    if ("paramControls" in node && node.paramControls?.enabled) {
      parameters[node.id] = core.getGraphParameters(node.id);
    }
  });
  return { variables: core.getVariables(), parameters };
}

/**
 * Restore only values admitted by definitions in the *new* AST.
 * The newly constructed MathMDCore already holds the current document defaults.
 * Removed or out-of-range values are deliberately not replayed.
 */
export function restoreDocumentRuntime(
  core: MathMDCore, document: MathMDDocument, saved?: DocumentRuntimeValues,
): void {
  if (!saved) return;
  document.children.forEach(node => {
    if (node.type === "slider") {
      const value = saved.variables[node.name];
      if (Number.isFinite(value) && value >= node.min && value <= node.max) {
        core.setVariable(node.name, value);
      }
    } else if (node.type === "checkbox") {
      const value = saved.variables[node.name];
      if (value === 0 || value === 1) core.setVariable(node.name, value);
    } else if (node.type === "timeline") {
      const value = saved.variables[node.name];
      if (Number.isFinite(value) && value >= node.domain[0] && value <= node.domain[1]) {
        core.setVariable(node.name, value);
      }
    }

    if ("paramControls" in node && node.paramControls?.enabled) {
      const previous = saved.parameters[node.id];
      if (!previous) return;
      node.paramControls.parameters.forEach(parameter => {
        const value = previous[parameter.name];
        if (Number.isFinite(value)) {
          // This API validates the current graph's bounds and integer requirement.
          core.setGraphParameter(node.id, parameter.name, value);
        }
      });
    }
  });
}
