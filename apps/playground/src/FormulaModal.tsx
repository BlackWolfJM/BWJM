import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { IconX, IconCheck, IconFunction } from "./icons.js";
import { evaluateFormula, insertFormulaSnippet } from "./formulaDraft.js";
import type { FormulaDraft, FormulaMode } from "./formulaDraft.js";

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
  const [mode, setMode] = useState<FormulaMode>("block");
  const [label, setLabel] = useState<string>("1");
  const [rendererRevision, setRendererRevision] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingCursorRef = useRef<number | null>(null);
  const submittedRef = useRef(false);
  // Updated in each input/change event before React schedules a render.
  // Keyboard shortcuts therefore validate even the newest keystroke/label.
  const draftRef = useRef<FormulaDraft>({ latex, mode, label });

  const getRenderer = () => typeof window === "undefined" ? null : window.katex;
  const evaluation = useMemo(
    () => evaluateFormula({ latex, mode, label }, getRenderer()),
    [latex, mode, label, rendererRevision],
  );

  const changeLatex = (next: string): void => {
    draftRef.current = { ...draftRef.current, latex: next };
    setLatex(next);
  };
  const changeMode = (next: FormulaMode): void => {
    draftRef.current = { ...draftRef.current, mode: next };
    setMode(next);
  };
  const changeLabel = (next: string): void => {
    draftRef.current = { ...draftRef.current, label: next };
    setLabel(next);
  };

  useEffect(() => {
    if (!isOpen) return;
    submittedRef.current = false;
    const timeout = setTimeout(() => inputRef.current?.focus(), 50);
    const refreshRenderer = () => setRendererRevision(previous => previous + 1);
    // The base branch can still load KaTeX via a deferred script. Do not
    // treat its absence as a valid formula while the script is unavailable.
    window.addEventListener("load", refreshRenderer);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("load", refreshRenderer);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    const cursor = pendingCursorRef.current;
    if (cursor === null || !inputRef.current) return;
    pendingCursorRef.current = null;
    inputRef.current.focus();
    inputRef.current.setSelectionRange(cursor, cursor);
  }, [latex]);

  const handleApplyTemplate = (snippet: string): void => {
    const textarea = inputRef.current;
    const current = draftRef.current.latex;
    const start = textarea?.selectionStart ?? current.length;
    const end = textarea?.selectionEnd ?? start;
    const insertion = insertFormulaSnippet(current, start, end, snippet);
    pendingCursorRef.current = insertion.cursor;
    changeLatex(insertion.latex);
  };

  const handleConfirm = (): void => {
    console.log("VIS09 handleConfirm entered", { isOpen, submitted: submittedRef.current });
    if (!isOpen || submittedRef.current) return;
    // Re-evaluate synchronously. Never trust a hasError value produced by an
    // earlier effect if the user just changed TeX, mode or equation number.
    const current = evaluateFormula(draftRef.current, getRenderer());
    console.log("VIS09 confirmation diagnostic", {
      isOpen, submitted: submittedRef.current, mode: draftRef.current.mode,
      latex: draftRef.current.latex, label: draftRef.current.label,
      status: current.status, previewStatus: evaluation.status,
    });
    if (!current.valid) return;
    submittedRef.current = true;
    onInsert(current.source);
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.stopPropagation();
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
                  onMouseDown={(event) => event.preventDefault()}
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
              className={`bwjm-modal-textarea ${evaluation.status === "invalid" ? "has-error" : ""}`}
              rows={3}
              value={latex}
              onChange={(e) => changeLatex(e.target.value)}
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
                  onChange={() => changeMode("inline")}
                />
                <span>En línea ($ ... $)</span>
              </label>
              <label className="bwjm-radio-label">
                <input
                  type="radio"
                  name="formula-mode"
                  checked={mode === "block"}
                  onChange={() => changeMode("block")}
                />
                <span>En bloque ($$ ... $$)</span>
              </label>
              <label className="bwjm-radio-label">
                <input
                  type="radio"
                  name="formula-mode"
                  checked={mode === "numbered"}
                  onChange={() => changeMode("numbered")}
                />
                <span>Ecuación numerada</span>
              </label>
              {mode === "numbered" && (
                <input
                  type="text"
                  className="bwjm-modal-tag-input"
                  value={label}
                  onChange={(e) => changeLabel(e.target.value)}
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
            >
              {evaluation.valid
                ? <div dangerouslySetInnerHTML={{ __html: evaluation.previewHtml }} />
                : <span className="bwjm-modal-error" role="status">
                    {evaluation.status === "empty"
                      ? "Escribe una fórmula para previsualizarla."
                      : evaluation.status === "unavailable"
                        ? "KaTeX aún no está disponible. La fórmula no se puede validar."
                        : "Error de sintaxis LaTeX en la fórmula o su etiqueta."}
                  </span>}
              {evaluation.status === "invalid" && <code>{evaluation.tex}</code>}
            </div>
            {mode === "numbered" && evaluation.existingTag && (
              <p className="bwjm-modal-label">
                La fórmula ya contiene una etiqueta \\tag; se conserva la del código LaTeX.
              </p>
            )}
          </div>
        </div>

        <div className="bwjm-modal-footer">
          <button className="bwjm-btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="bwjm-btn-primary" onClick={handleConfirm} disabled={!evaluation.valid}>
            <IconCheck size={14} />
            <span>Insertar Fórmula</span>
          </button>
        </div>
      </div>
    </div>
  );
};
