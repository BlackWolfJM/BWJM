import React, { useState, useEffect, useRef } from "react";
import { IconX, IconCheck, IconFunction } from "./icons.js";

interface FormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (formulaText: string) => void;
}

const TEMPLATES: Array<{ label: string; snippet: string; description: string }> = [
  { label: "a/b", snippet: "\\frac{a}{b}", description: "Fracción" },
  { label: "√x", snippet: "\\sqrt{x}", description: "Raíz cuadrada" },
  { label: "xⁿ", snippet: "x^{n}", description: "Exponente" },
  { label: "∫ₐᵇ", snippet: "\\int_{a}^{b} f(x)\\,dx", description: "Integral definida" },
  { label: "∑", snippet: "\\sum_{i=1}^{n} x_i", description: "Sumatoria" },
  { label: "lim", snippet: "\\lim_{x \\to 0} f(x)", description: "Límite" },
  { label: "df/dx", snippet: "\\frac{df}{dx}", description: "Derivada" },
  { label: "[a b; c d]", snippet: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", description: "Matriz 2x2" },
  { label: "(a/b)", snippet: "\\left( \\frac{a}{b} \\right)", description: "Paréntesis escalables" },
  { label: "π", snippet: "\\pi", description: "Número pi" },
  { label: "α", snippet: "\\alpha", description: "Alfa" },
  { label: "θ", snippet: "\\theta", description: "Theta" },
  { label: "∞", snippet: "\\infty", description: "Infinito" },
  { label: "≤", snippet: "\\le", description: "Menor o igual" },
  { label: "≥", snippet: "\\ge", description: "Mayor o igual" },
  { label: "±", snippet: "\\pm", description: "Más o menos" },
  { label: "⟹", snippet: "\\implies", description: "Implica" },
];

export const FormulaModal: React.FC<FormulaModalProps> = ({ isOpen, onClose, onInsert }) => {
  const [latex, setLatex] = useState<string>("\\int_{0}^{1} (x - x^2)\\,dx = \\frac{1}{6}");
  const [mode, setMode] = useState<"inline" | "block" | "numbered">("block");
  const [label, setLabel] = useState<string>("1");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [hasError, setHasError] = useState<boolean>(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window !== "undefined" && window.katex) {
      try {
        const rendered = window.katex.renderToString(latex.trim() || "\\text{...}", {
          displayMode: mode !== "inline",
          throwOnError: true,
        });
        setPreviewHtml(rendered);
        setHasError(false);
      } catch {
        setHasError(true);
        setPreviewHtml(`<span class="bwjm-modal-error">Error de sintaxis LaTeX</span>`);
      }
    } else {
      setPreviewHtml(`<code>${latex}</code>`);
      setHasError(false);
    }
  }, [latex, mode, isOpen]);

  if (!isOpen) return null;

  const handleApplyTemplate = (snippet: string) => {
    setLatex((prev) => (prev.trim().length === 0 ? snippet : `${prev} ${snippet}`));
    inputRef.current?.focus();
  };

  const handleConfirm = () => {
    const trimmed = latex.trim();
    if (!trimmed) return;

    let output = "";
    if (mode === "inline") {
      output = `$${trimmed}$`;
    } else if (mode === "block") {
      output = `\n$$\n${trimmed}\n$$\n`;
    } else {
      output = `\n$$\n${trimmed} \\tag{${label || "1"}}\n$$\n`;
    }

    onInsert(output);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleConfirm();
    }
  };

  return (
    <div className="bwjm-modal-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="bwjm-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="bwjm-modal-header">
          <div className="bwjm-modal-title">
            <IconFunction size={18} />
            <span>Insertar Fórmula Matemática</span>
          </div>
          <button className="bwjm-modal-close" onClick={onClose} aria-label="Cerrar">
            <IconX size={16} />
          </button>
        </div>

        <div className="bwjm-modal-body">
          <div className="bwjm-modal-field">
            <label className="bwjm-modal-label">Paleta de Plantillas y Símbolos</label>
            <div className="bwjm-template-palette">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.label}
                  type="button"
                  className="bwjm-template-chip"
                  title={tmpl.description}
                  onClick={() => handleApplyTemplate(tmpl.snippet)}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bwjm-modal-field">
            <label className="bwjm-modal-label">Código LaTeX</label>
            <textarea
              ref={inputRef}
              className={`bwjm-modal-textarea ${hasError ? "has-error" : ""}`}
              rows={3}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder="Escribe la expresión en notación LaTeX, p. ej. \\frac{a}{b}"
            />
          </div>

          <div className="bwjm-modal-field">
            <label className="bwjm-modal-label">Modo de Inserción</label>
            <div className="bwjm-modal-radios">
              <label className="bwjm-radio-label">
                <input
                  type="radio"
                  name="formula-mode"
                  checked={mode === "inline"}
                  onChange={() => setMode("inline")}
                />
                <span>En línea ($ ... $)</span>
              </label>
              <label className="bwjm-radio-label">
                <input
                  type="radio"
                  name="formula-mode"
                  checked={mode === "block"}
                  onChange={() => setMode("block")}
                />
                <span>En bloque ($$ ... $$)</span>
              </label>
              <label className="bwjm-radio-label">
                <input
                  type="radio"
                  name="formula-mode"
                  checked={mode === "numbered"}
                  onChange={() => setMode("numbered")}
                />
                <span>Ecuación numerada</span>
              </label>
              {mode === "numbered" && (
                <input
                  type="text"
                  className="bwjm-modal-tag-input"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ej. 1"
                  style={{ width: "60px", marginLeft: "0.5rem" }}
                />
              )}
            </div>
          </div>

          <div className="bwjm-modal-field">
            <label className="bwjm-modal-label">Vista Previa KaTeX</label>
            <div
              className="bwjm-modal-preview-box"
              role="region"
              aria-label="Vista previa de la fórmula"
              tabIndex={0}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>

        <div className="bwjm-modal-footer">
          <button className="bwjm-btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="bwjm-btn-primary" onClick={handleConfirm} disabled={hasError}>
            <IconCheck size={14} />
            <span>Insertar Fórmula</span>
          </button>
        </div>
      </div>
    </div>
  );
};
