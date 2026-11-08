import React, { useState } from "react";
import { IconList, IconSliders, IconBookOpen, IconX } from "./icons.js";

export interface OutlineItem {
  level: number;
  text: string;
  lineNumber: number;
}

interface SidebarLeftProps {
  isOpen: boolean;
  onClose: () => void;
  outline: OutlineItem[];
  variables: Record<string, number>;
  lessons: Record<string, { title: string; filename: string }>;
  currentLessonKey: string;
  onSelectLesson: (key: string) => void;
  onNavigateOutline: (item: OutlineItem) => void;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  isOpen,
  onClose,
  outline,
  variables,
  lessons,
  currentLessonKey,
  onSelectLesson,
  onNavigateOutline,
}) => {
  const [tab, setTab] = useState<"outline" | "variables" | "lessons">("outline");

  if (!isOpen) return null;

  return (
    <aside className="bwjm-sidebar-left">
      <div className="bwjm-sidebar-header">
        <div className="bwjm-sidebar-tabs">
          <button
            className={`bwjm-sidebar-tab ${tab === "outline" ? "active" : ""}`}
            onClick={() => setTab("outline")}
            title="Esquema del Documento"
          >
            <IconList size={14} />
            <span>Esquema</span>
          </button>
          <button
            className={`bwjm-sidebar-tab ${tab === "variables" ? "active" : ""}`}
            onClick={() => setTab("variables")}
            title="Variables y Parámetros"
          >
            <IconSliders size={14} />
            <span>Variables</span>
          </button>
          <button
            className={`bwjm-sidebar-tab ${tab === "lessons" ? "active" : ""}`}
            onClick={() => setTab("lessons")}
            title="Lecciones de Ejemplo"
          >
            <IconBookOpen size={14} />
            <span>Lecciones</span>
          </button>
        </div>
        <button className="bwjm-sidebar-close" onClick={onClose} aria-label="Cerrar panel">
          <IconX size={14} />
        </button>
      </div>

      <div className="bwjm-sidebar-content">
        {tab === "outline" && (
          <div className="bwjm-outline-list">
            {outline.length === 0 ? (
              <div className="bwjm-sidebar-empty">No hay encabezados en este documento.</div>
            ) : (
              outline.map((item, idx) => (
                <div
                  key={`${item.lineNumber}-${idx}`}
                  className={`bwjm-outline-item level-${item.level}`}
                  onClick={() => onNavigateOutline(item)}
                >
                  <span className="bwjm-outline-hash">{"#".repeat(item.level)}</span>
                  <span className="bwjm-outline-text">{item.text}</span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "variables" && (
          <div className="bwjm-variables-list">
            {Object.keys(variables).length === 0 ? (
              <div className="bwjm-sidebar-empty">No hay variables o deslizadores activos.</div>
            ) : (
              Object.entries(variables).map(([name, val]) => (
                <div key={name} className="bwjm-variable-row">
                  <span className="bwjm-variable-name">{name}</span>
                  <span className="bwjm-variable-value">{Number(val.toFixed(4))}</span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "lessons" && (
          <div className="bwjm-lessons-list">
            {Object.entries(lessons).map(([key, data]) => (
              <button
                key={key}
                className={`bwjm-lesson-button ${key === currentLessonKey ? "active" : ""}`}
                onClick={() => onSelectLesson(key)}
              >
                <span className="bwjm-lesson-title">{data.title}</span>
                <span className="bwjm-lesson-file">{data.filename}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
