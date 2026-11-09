import React, { useState } from "react";
import { normalizeFilename } from "./workspaceDocuments.js";
import { IconPlus, IconX } from "./icons.js";
import type { WorkspaceDocument } from "./workspaceDocuments.js";

interface Props {
  documents: readonly WorkspaceDocument[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, filename: string) => void;
}
export const DocumentTabs: React.FC<Props> = ({ documents, activeId, onSelect, onClose, onNew, onRename }) => {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const beginRename = (id: string, name: string) => { setRenaming(id); setDraft(name); };
  const completeRename = (id: string) => {
    const filename = normalizeFilename(draft);
    if (filename) onRename(id, filename);
    setRenaming(null);
  };
  return <nav className="bwjm-document-tabs" aria-label="Documentos abiertos">
    <div className="bwjm-document-tab-list" role="tablist" aria-label="Archivos BWJM">
      {documents.map((document, index) =>
        <div key={document.id} className={"bwjm-document-tab " + (activeId === document.id ? "active" : "")}>
          {renaming === document.id ? (
            <input className="bwjm-document-rename-input" autoFocus
              aria-label={"Nuevo nombre del documento " + document.filename}
              value={draft} onChange={event => setDraft(event.target.value)}
              onFocus={event => event.target.select()}
              onBlur={() => completeRename(document.id)}
              onKeyDown={event => {
                if (event.key === "Enter") { event.preventDefault(); completeRename(document.id); }
                if (event.key === "Escape") { event.preventDefault(); setRenaming(null); }
              }} />
          ) : <button type="button" role="tab" id={"tab-" + document.id}
            aria-controls="bwjm-workspace-active" aria-selected={activeId === document.id}
            tabIndex={activeId === document.id ? 0 : -1}
            title={document.filename + (document.content !== document.savedContent ? " · Sin guardar" : "")}
            onClick={() => onSelect(document.id)}
            onDoubleClick={() => beginRename(document.id, document.filename)}
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
          </button>}
          <button type="button" className="bwjm-tab-rename"
            aria-label={"Renombrar " + document.filename} title="Cambiar el nombre del archivo"
            onClick={() => beginRename(document.id, document.filename)}>✎</button>
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
