import React from "react";
import {
  IconFolderOpen,
  IconDownload,
  IconFunction,
  IconBarChart,
  IconSliders,
  IconSidebar,
  IconColumns,
  IconCode,
  IconBookOpen,
} from "./icons.js";

interface ToolBarProps {
  onOpen: () => void;
  onSave: () => void;
  onExportHtml: () => void;
  onOpenFormulaModal: () => void;
  onOpenChartModal: () => void;
  onInsertMarkdown: (prefix: string, suffix?: string) => void;
  viewMode: "editor" | "split" | "reader";
  onSetViewMode: (mode: "editor" | "split" | "reader") => void;
  isSidebarLeftOpen: boolean;
  onToggleSidebarLeft: () => void;
  isSidebarRightOpen: boolean;
  onToggleSidebarRight: () => void;
}

export const ToolBar: React.FC<ToolBarProps> = ({
  onOpen,
  onSave,
  onExportHtml,
  onOpenFormulaModal,
  onOpenChartModal,
  onInsertMarkdown,
  viewMode,
  onSetViewMode,
  isSidebarLeftOpen,
  onToggleSidebarLeft,
  isSidebarRightOpen,
  onToggleSidebarRight,
}) => {
  return (
    <div className="bwjm-toolbar-root">
      <div className="bwjm-toolbar-group">
        <button
          className={`bwjm-toolbar-btn ${isSidebarLeftOpen ? "active" : ""}`}
          onClick={onToggleSidebarLeft}
          title="Alternar Esquema / Variables (Panel izquierdo)"
        >
          <IconSidebar size={15} />
        </button>
      </div>

      <div className="bwjm-toolbar-divider" />

      <div className="bwjm-toolbar-group">
        <button className="bwjm-toolbar-btn" onClick={onOpen} title="Abrir archivo .bwjm (Ctrl+O)">
          <IconFolderOpen size={14} />
          <span>Abrir</span>
        </button>
        <button className="bwjm-toolbar-btn" onClick={onSave} title="Guardar archivo .bwjm (Ctrl+S)">
          <IconDownload size={14} />
          <span>Guardar</span>
        </button>
        <button className="bwjm-toolbar-btn" onClick={onExportHtml} title="Exportar como HTML interactivo">
          <span>Exportar</span>
        </button>
      </div>

      <div className="bwjm-toolbar-divider" />

      <div className="bwjm-toolbar-group">
        <button
          className="bwjm-toolbar-btn"
          onClick={() => onInsertMarkdown("# ", "")}
          title="Título 1"
        >
          <span style={{ fontWeight: 800 }}>H1</span>
        </button>
        <button
          className="bwjm-toolbar-btn"
          onClick={() => onInsertMarkdown("## ", "")}
          title="Título 2"
        >
          <span style={{ fontWeight: 700 }}>H2</span>
        </button>
        <button
          className="bwjm-toolbar-btn"
          onClick={() => onInsertMarkdown("### ", "")}
          title="Título 3"
        >
          <span style={{ fontWeight: 600 }}>H3</span>
        </button>
        <button
          className="bwjm-toolbar-btn font-bold"
          onClick={() => onInsertMarkdown("**", "**")}
          title="Negrita"
        >
          <strong>B</strong>
        </button>
        <button
          className="bwjm-toolbar-btn font-italic"
          onClick={() => onInsertMarkdown("*", "*")}
          title="Cursiva"
        >
          <em>I</em>
        </button>
        <button
          className="bwjm-toolbar-btn"
          onClick={() => onInsertMarkdown("`", "`")}
          title="Código en línea"
        >
          <IconCode size={13} />
        </button>
        <button
          className="bwjm-toolbar-btn"
          onClick={() => onInsertMarkdown("> ", "")}
          title="Cita"
        >
          <span>"</span>
        </button>
      </div>

      <div className="bwjm-toolbar-divider" />

      <div className="bwjm-toolbar-group">
        <button
          className="bwjm-toolbar-btn highlight-math"
          onClick={onOpenFormulaModal}
          title="Insertar Fórmula Matemática (Ctrl+Shift+M)"
        >
          <IconFunction size={15} />
          <span>Fórmula</span>
          <kbd className="bwjm-btn-badge">Ctrl+Shift+M</kbd>
        </button>
        <button
          className="bwjm-toolbar-btn"
          onClick={() => onInsertMarkdown("\n$$\n\\int_{0}^{1} f(x)\\,dx\n$$\n", "")}
          title="Insertar bloque de ecuación ($$)"
        >
          <span>$$</span>
        </button>
      </div>

      <div className="bwjm-toolbar-divider" />

      <div className="bwjm-toolbar-group">
        <button
          className="bwjm-toolbar-btn highlight-chart"
          onClick={onOpenChartModal}
          title="Asistente para Insertar Gráficas y Deslizadores"
        >
          <IconBarChart size={14} />
          <span>Gráfica</span>
        </button>
        <button
          className="bwjm-toolbar-btn"
          onClick={() => onInsertMarkdown("```slider\nname: a\nmin: 0.1\nmax: 5\nstep: 0.1\ndefault: 1.0\n```\n")}
          title="Insertar Deslizador de Parámetro"
        >
          <IconSliders size={13} />
          <span>Slider</span>
        </button>
      </div>

      <div className="bwjm-toolbar-spacer" />

      <div className="bwjm-toolbar-group">
        <button
          className={`bwjm-toolbar-btn ${viewMode === "editor" ? "active" : ""}`}
          onClick={() => onSetViewMode("editor")}
          title="Solo Editor de Código"
        >
          <IconCode size={14} />
          <span>Editor</span>
        </button>
        <button
          className={`bwjm-toolbar-btn ${viewMode === "split" ? "active" : ""}`}
          onClick={() => onSetViewMode("split")}
          title="Vista Dividida"
        >
          <IconColumns size={14} />
          <span>Dividido</span>
        </button>
        <button
          className={`bwjm-toolbar-btn ${viewMode === "reader" ? "active" : ""}`}
          onClick={() => onSetViewMode("reader")}
          title="Modo Lector"
        >
          <IconBookOpen size={14} />
          <span>Lector</span>
        </button>
      </div>

      <div className="bwjm-toolbar-divider" />

      <div className="bwjm-toolbar-group">
        <button
          className={`bwjm-toolbar-btn ${isSidebarRightOpen ? "active" : ""}`}
          onClick={onToggleSidebarRight}
          title="Alternar Inspector de Propiedades (Panel derecho)"
        >
          <span style={{ display: "inline-flex", transform: "scaleX(-1)" }}>
            <IconSidebar size={15} />
          </span>
        </button>
      </div>
    </div>
  );
};
