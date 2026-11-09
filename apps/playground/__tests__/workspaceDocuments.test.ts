import { describe, expect, it } from "vitest";
import { initialWorkspace, updateActiveContent, openWorkspaceDocument,
  closeWorkspaceDocument, markDocumentSaved, renameWorkspaceDocument, normalizeFilename
} from "../src/workspaceDocuments.js";
import { updateGraphOption } from "../src/graphOptionSource.js";
import { RIBBON_GROUPS } from "../src/Ribbon.js";
import { findTextMatches } from "../src/DocumentSearch.js";

describe("multi-document studio workspace", () => {
  it("keeps two document contents isolated across tab switches", () => {
    let state = initialWorkspace("a.bwjm", "# A", "riemann");
    const first = state.activeId;
    state = updateActiveContent(state, previous => previous + "\neditado");
    state = openWorkspaceDocument(state, "b.bwjm", "# B");
    const second = state.activeId;
    state = updateActiveContent(state, "# B modificado");
    state = {...state, activeId:first};
    expect(state.documents.find(d=>d.id===first)?.content).toBe("# A\neditado");
    expect(state.documents.find(d=>d.id===second)?.content).toBe("# B modificado");
  });
  it("reuses a lesson tab and does not destroy unsaved changes", () => {
    let state = initialWorkspace("a.bwjm", "# A", "riemann");
    state = updateActiveContent(state, "# A modificado");
    state = openWorkspaceDocument(state, "b.bwjm", "# B");
    const count = state.documents.length;
    state = openWorkspaceDocument(state,"a.bwjm","# A","riemann");
    expect(state.documents.length).toBe(count);
    expect(state.documents.find(d=>d.id===state.activeId)?.content).toBe("# A modificado");
  });
  it("marks only the active tab as saved", () => {
    let state = initialWorkspace("a.bwjm", "# A");
    state = updateActiveContent(state, "changed");
    state = openWorkspaceDocument(state, "b.bwjm", "ok");
    state = markDocumentSaved(state);
    expect(state.documents[0].savedContent).toBe("# A");
    expect(state.documents[0].content).toBe("changed");
  });
  it("closes a tab and retains at least one editable document", () => {
    let state = initialWorkspace("a.bwjm","# A");
    state = openWorkspaceDocument(state,"b.bwjm","# B");
    const first = state.documents[0].id;
    state = closeWorkspaceDocument(state,state.activeId);
    expect(state.activeId).toBe(first);
    state = closeWorkspaceDocument(state,first);
    expect(state.documents.length).toBe(1);
  });
});
describe("Word-like scientific ribbon and document search", () => {
  it("does not repeat action IDs across ribbon tabs", () => {
    const ids = Object.values(RIBBON_GROUPS).flatMap(groups=>
      groups.flatMap(group=>group.actions.map(action=>action.id)));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("finds case-insensitive words and exposes true selection positions", () => {
    expect(findTextMatches("Área entre curvas. ÁREA entre curvas.","área"))
      .toEqual([{start:0,end:4},{start:19,end:23}]);
    expect(findTextMatches("uno dos","")).toEqual([]);
  });
});


describe("personalizable scientific graphs and filenames", () => {
  it("renames the requested tab but leaves its content and other tabs intact", () => {
    let state = initialWorkspace("original.bwjm", "# área");
    const first = state.activeId;
    state = openWorkspaceDocument(state, "otra.bwjm", "# otro");
    state = renameWorkspaceDocument(state, first, "nuevo-nombre");
    expect(state.documents[0].filename).toBe("nuevo-nombre.bwjm");
    expect(state.documents[0].content).toBe("# área");
    expect(state.documents[1].filename).toBe("otra.bwjm");
    expect(state.documents[1].content).toBe("# otro");
  });
  it("preserves the .jm extension and rejects blank names", () => {
    expect(normalizeFilename("mi-curva.jm")).toBe("mi-curva.jm");
    expect(normalizeFilename("nuevo archivo")).toBe("nuevo archivo.bwjm");
    expect(normalizeFilename(" ")).toBeNull();
  });
  it("edits only the selected code block and preserves its other expressions", () => {
    const fence = String.fromCharCode(96).repeat(3);
    const block = [fence+"curve3d","x: cos(t)","y: sin(t)","z: t/3",fence].join("\n");
    const previous = "# Gráfica\n" + block + "\n\n" + fence+"surface3d\n" +
      "equation: x^2+y^2\n"+fence;
    const begin = "# Gráfica\n".length;
    const end = begin + block.length;
    const range = {
      start: { line: 2, column: 1, offset: begin },
      end: { line: 6, column: 4, offset: end },
    };
    const next = updateGraphOption(previous, range, "curve3d", "animated", true);
    expect(next).toContain("animated: true");
    expect(next).toContain("x: cos(t)");
    expect(next).toContain("equation: x^2+y^2");
    expect(next).toContain("# Gráfica\n");
  });
  it("refuses modifying a block whose source range does not match", () => {
    const code = "# Título\n";
    const range = { start:{line:1,column:1,offset:0}, end:{line:1,column:7,offset:7} };
    expect(updateGraphOption(code, range, "surface3d", "showInfo", true)).toBe(code);
  });
  it("does not permit arbitrary YAML keys to be injected", () => {
    const fence = String.fromCharCode(96).repeat(3);
    const code = fence+"surface3d\nequation: x+y\n"+fence;
    const range = { start:{line:1,column:1,offset:0}, end:{line:3,column:4,offset:code.length} };
    expect(updateGraphOption(code,range,"surface3d","constructor",true)).toBe(code);
  });
});
