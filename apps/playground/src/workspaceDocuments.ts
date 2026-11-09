import { useCallback, useState } from "react";
import type { SetStateAction } from "react";

export interface WorkspaceDocument {
  id: string;
  filename: string;
  content: string;
  savedContent: string;
  lessonKey: string | null;
}
export interface WorkspaceState {
  documents: WorkspaceDocument[];
  activeId: string;
}
let nextDocumentNumber = 1;
export function createWorkspaceDocument(filename: string, content: string, lessonKey: string | null = null): WorkspaceDocument {
  return { id: "bwjm-doc-" + nextDocumentNumber++, filename, content, savedContent: content, lessonKey };
}
export function initialWorkspace(filename: string, content: string, lessonKey: string | null = null): WorkspaceState {
  const document = createWorkspaceDocument(filename, content, lessonKey);
  return { documents: [document], activeId: document.id };
}
export function normalizeFilename(filename: string): string | null {
  const cleaned = filename.trim().replace(/[\\/]/g, "").replace(/[\u0000-\u001f\u007f]/g, "");
  if (!cleaned || cleaned.length > 140 || cleaned === "." || cleaned === "..") return null;
  return /\.(bwjm|jm)$/i.test(cleaned) ? cleaned : cleaned + ".bwjm";
}
export function renameWorkspaceDocument(workspace: WorkspaceState, id: string, name: string): WorkspaceState {
  const filename = normalizeFilename(name);
  if (!filename) return workspace;
  return {
    ...workspace,
    documents: workspace.documents.map(document => document.id === id
      ? { ...document, filename } : document),
  };
}
export function updateActiveContent(workspace: WorkspaceState, next: SetStateAction<string>): WorkspaceState {
  return {
    ...workspace,
    documents: workspace.documents.map(document => document.id === workspace.activeId
      ? { ...document, content: typeof next === "function" ? next(document.content) : next }
      : document),
  };
}
export function openWorkspaceDocument(workspace: WorkspaceState, filename: string, content: string, lessonKey: string | null = null): WorkspaceState {
  if (lessonKey) {
    const found = workspace.documents.find(document => document.lessonKey === lessonKey);
    if (found) return { ...workspace, activeId: found.id };
  }
  const document = createWorkspaceDocument(filename, content, lessonKey);
  return { documents: [...workspace.documents, document], activeId: document.id };
}
export function closeWorkspaceDocument(workspace: WorkspaceState, id: string): WorkspaceState {
  const index = workspace.documents.findIndex(document => document.id === id);
  if (index < 0) return workspace;
  const remaining = workspace.documents.filter(document => document.id !== id);
  if (remaining.length === 0) return initialWorkspace("sin_titulo.bwjm", "# Nuevo documento\n\n");
  return {
    documents: remaining,
    activeId: workspace.activeId === id ? remaining[Math.min(index, remaining.length - 1)].id : workspace.activeId,
  };
}
export function markDocumentSaved(workspace: WorkspaceState): WorkspaceState {
  return {
    ...workspace,
    documents: workspace.documents.map(document =>
      document.id === workspace.activeId ? { ...document, savedContent: document.content } : document),
  };
}
export function useDocumentWorkspace(filename: string, content: string, lessonKey: string | null = null) {
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => initialWorkspace(filename, content, lessonKey));
  const active = workspace.documents.find(document => document.id === workspace.activeId) ?? workspace.documents[0];
  const setMarkdown = useCallback((next: SetStateAction<string>) => {
    setWorkspace(previous => updateActiveContent(previous, next));
  }, []);
  const openDocument = useCallback((name: string, text: string, lesson: string | null = null) => {
    setWorkspace(previous => openWorkspaceDocument(previous, name, text, lesson));
  }, []);
  const createDocument = useCallback(() => {
    setWorkspace(previous => openWorkspaceDocument(previous, "sin_titulo.bwjm",
      "# Nuevo documento BWJM\n\nComienza a escribir texto, fórmulas y gráficas matemáticas.\n"));
  }, []);
  const selectDocument = useCallback((id: string) => {
    setWorkspace(previous => previous.documents.some(document => document.id === id)
      ? { ...previous, activeId: id } : previous);
  }, []);
  const closeDocument = useCallback((id: string) => {
    setWorkspace(previous => closeWorkspaceDocument(previous, id));
  }, []);
  const markSaved = useCallback(() => setWorkspace(previous => markDocumentSaved(previous)), []);
  const renameDocument = useCallback((id: string, filename: string) => {
    setWorkspace(previous => renameWorkspaceDocument(previous, id, filename));
  }, []);
  return {
    documents: workspace.documents,
    activeId: workspace.activeId,
    filename: active.filename,
    markdown: active.content,
    selectedTemplate: active.lessonKey ?? "",
    setMarkdown, openDocument, createDocument, selectDocument, closeDocument, markSaved, renameDocument,
  };
}
