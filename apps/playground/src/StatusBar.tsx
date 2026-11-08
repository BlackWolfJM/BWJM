import React from "react";
import { IconCheck, IconShield } from "./icons.js";
import type { MathMDDiagnostic } from "@mathmd/ast";

interface StatusBarProps {
  filename: string;
  wordCount: number;
  charCount: number;
  diagnostics: MathMDDiagnostic[];
  viewMode: "editor" | "split" | "reader";
  onOpenCommandPalette: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  filename,
  wordCount,
  charCount,
  diagnostics,
  viewMode,
  onOpenCommandPalette,
}) => {
  const errorCount = diagnostics.filter((d) => d.severity === "error").length;

  return (
    <footer className="bwjm-statusbar-root">
      <div className="bwjm-statusbar-left">
        <button
          className="bwjm-statusbar-cmd-btn"
          onClick={onOpenCommandPalette}
          title="Abrir paleta de comandos (Ctrl+K)"
        >
          <span className="bwjm-cmd-kbd">Ctrl+K</span>
          <span>Comandos</span>
        </button>
        <span className="bwjm-statusbar-item">{filename}</span>
        <span className="bwjm-statusbar-separator">|</span>
        <span className="bwjm-statusbar-item">{wordCount} palabras</span>
        <span className="bwjm-statusbar-separator">|</span>
        <span className="bwjm-statusbar-item">{charCount} caracteres</span>
      </div>

      <div className="bwjm-statusbar-right">
        {errorCount === 0 ? (
          <span className="bwjm-status-badge ok" title="Documento válido sin errores">
            <IconCheck size={12} />
            <span>0 errores</span>
          </span>
        ) : (
          <span className="bwjm-status-badge error" title="Errores de sintaxis detectados">
            <span>{errorCount} error(es)</span>
          </span>
        )}

        <span className="bwjm-statusbar-separator">|</span>
        <span className="bwjm-statusbar-item mode-tag">
          {viewMode === "editor" ? "Modo Editor" : viewMode === "reader" ? "Modo Lector" : "Vista Dividida"}
        </span>

        <span className="bwjm-statusbar-separator">|</span>
        <div className="bwjm-engine-badge">
          <IconShield size={12} />
          <span>BWJM v1.0.0</span>
        </div>
      </div>
    </footer>
  );
};
