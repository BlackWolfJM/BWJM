import React from "react";
import { IconShield, IconLayers, IconX, IconCheck } from "./icons.js";
import type { MathMDDiagnostic, MathMDNode } from "@mathmd/ast";

interface SidebarRightProps {
  isOpen: boolean;
  onClose: () => void;
  wordCount: number;
  charCount: number;
  lineCount: number;
  nodes: MathMDNode[];
  diagnostics: MathMDDiagnostic[];
}

export const SidebarRight: React.FC<SidebarRightProps> = ({
  isOpen,
  onClose,
  wordCount,
  charCount,
  lineCount,
  nodes,
  diagnostics,
}) => {
  if (!isOpen) return null;

  const slidersCount = nodes.filter((n) => n.type === "slider").length;
  const plotsCount = nodes.filter((n) => n.type === "plot2d").length;
  const surfacesCount = nodes.filter((n) => n.type === "surface3d").length;

  return (
    <aside className="bwjm-sidebar-right">
      <div className="bwjm-sidebar-header">
        <div className="bwjm-sidebar-title">
          <IconLayers size={15} />
          <span>Propiedades del Documento</span>
        </div>
        <button className="bwjm-sidebar-close" onClick={onClose} aria-label="Cerrar panel">
          <IconX size={14} />
        </button>
      </div>

      <div className="bwjm-sidebar-content">
        <div className="bwjm-inspector-section">
          <div className="bwjm-inspector-heading">Métricas de Contenido</div>
          <div className="bwjm-stat-grid">
            <div className="bwjm-stat-card">
              <span className="bwjm-stat-num">{lineCount}</span>
              <span className="bwjm-stat-label">Líneas</span>
            </div>
            <div className="bwjm-stat-card">
              <span className="bwjm-stat-num">{wordCount}</span>
              <span className="bwjm-stat-label">Palabras</span>
            </div>
            <div className="bwjm-stat-card">
              <span className="bwjm-stat-num">{charCount}</span>
              <span className="bwjm-stat-label">Caracteres</span>
            </div>
          </div>
        </div>

        <div className="bwjm-inspector-section">
          <div className="bwjm-inspector-heading">Bloques Científicos Detectados</div>
          <div className="bwjm-blocks-summary">
            <div className="bwjm-block-item">
              <span>Gráficas 2D (plot2d)</span>
              <span className="bwjm-block-badge">{plotsCount}</span>
            </div>
            <div className="bwjm-block-item">
              <span>Superficies 3D (surface3d)</span>
              <span className="bwjm-block-badge">{surfacesCount}</span>
            </div>
            <div className="bwjm-block-item">
              <span>Deslizadores (slider)</span>
              <span className="bwjm-block-badge">{slidersCount}</span>
            </div>
          </div>
        </div>

        <div className="bwjm-inspector-section">
          <div className="bwjm-inspector-heading">Diagnósticos del Parser</div>
          {diagnostics.length === 0 ? (
            <div className="bwjm-diag-ok">
              <IconCheck size={14} />
              <span>Sintaxis íntegra sin errores</span>
            </div>
          ) : (
            <div className="bwjm-diag-list">
              {diagnostics.map((diag, i) => (
                <div key={i} className="bwjm-diag-entry">
                  <span className="bwjm-diag-sev">{diag.severity}</span>
                  <span className="bwjm-diag-txt">{diag.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bwjm-inspector-section">
          <div className="bwjm-inspector-heading">Seguridad del Entorno</div>
          <div className="bwjm-security-card">
            <IconShield size={16} />
            <div className="bwjm-security-info">
              <strong>Motor Seguro BWJM</strong>
              <p>Evaluación matemática aislada por lista blanca. Acceso al DOM y prototipos estrictamente bloqueado.</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
