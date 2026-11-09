import { describe, expect, it } from "vitest";
import { initialWorkspace, updateActiveContent, openWorkspaceDocument,
  closeWorkspaceDocument, markDocumentSaved } from "../src/workspaceDocuments.js";
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
