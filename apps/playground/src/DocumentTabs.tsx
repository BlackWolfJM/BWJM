import React from "react";
import { IconPlus, IconX } from "./icons.js";
import type { WorkspaceDocument } from "./workspaceDocuments.js";

interface Props {
  documents: readonly WorkspaceDocument[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}
export const DocumentTabs: React.FC<Props> = ({ documents, activeId, onSelect, onClose, onNew }) => {
  return <nav className="bwjm-document-tabs" aria-label="Documentos abiertos">
    <div className="bwjm-document-tab-list" role="tablist" aria-label="Archivos BWJM">
      {documents.map((document, index) =>
        <div key={document.id} className={"bwjm-document-tab " + (activeId === document.id ? "active" : "")}>
          <button type="button" role="tab" id={"tab-" + document.id}
            aria-controls="bwjm-workspace-active" aria-selected={activeId === document.id}
            tabIndex={activeId === document.id ? 0 : -1}
            title={document.filename + (document.content !== document.savedContent ? " · Sin guardar" : "")}
            onClick={() => onSelect(document.id)}
            onKeyDown={event => {
              const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
              if (!direction) return;
              event.preventDefault();
              const target = documents[(index + direction + documents.length) % documents.length];
              onSelect(target.id);
              const button = window.document.getElementById("tab-" + target.id);
              button?.focus();
            }}>
            <span className="bwjm-document-tab-icon" aria-hidden="true">▤</span>
            <span className="bwjm-document-tab-name">{document.filename}</span>
            {document.content !== document.savedContent && <span className="bwjm-document-unsaved" aria-label="Cambios sin guardar" />}
          </button>
          <button type="button" className="bwjm-tab-close" aria-label={"Cerrar " + document.filename}
            title={"Cerrar " + document.filename} onClick={() => onClose(document.id)}>
            <IconX size={12}/>
          </button>
        </div>)}
    </div>
    <button type="button" className="bwjm-document-new" onClick={onNew}
      title="Crear una pestaña con un documento nuevo" aria-label="Nuevo documento">
      <IconPlus size={16}/>
    </button>
  </nav>;
};
