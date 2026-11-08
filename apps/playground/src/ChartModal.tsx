import React, { useState } from "react";
import { IconX, IconCheck, IconBarChart } from "./icons.js";

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (codeBlock: string) => void;
}

type ChartKind = "plot2d" | "surface3d" | "slider";

export const ChartModal: React.FC<ChartModalProps> = ({ isOpen, onClose, onInsert }) => {
  const [kind, setKind] = useState<ChartKind>("plot2d");

  const [eq2d, setEq2d] = useState<string>("sin(x)");
  const [xMin2d, setXMin2d] = useState<string>("-5");
  const [xMax2d, setXMax2d] = useState<string>("5");
  const [color2d, setColor2d] = useState<string>("#0284c7");
  const [grid2d, setGrid2d] = useState<boolean>(true);

  const [eq3d, setEq3d] = useState<string>("sin(sqrt(x^2 + y^2))");
  const [xMin3d, setXMin3d] = useState<string>("-4");
  const [xMax3d, setXMax3d] = useState<string>("4");
  const [yMin3d, setYMin3d] = useState<string>("-4");
  const [yMax3d, setYMax3d] = useState<string>("4");
  const [samples3d, setSamples3d] = useState<string>("40");
  const [contours3d, setContours3d] = useState<boolean>(true);

  const [sliderName, setSliderName] = useState<string>("a");
  const [sliderMin, setSliderMin] = useState<string>("0.1");
  const [sliderMax, setSliderMax] = useState<string>("5");
  const [sliderStep, setSliderStep] = useState<string>("0.1");
  const [sliderDefault, setSliderDefault] = useState<string>("1.0");

  if (!isOpen) return null;

  let generatedCode = "";
  if (kind === "plot2d") {
    generatedCode = `\`\`\`plot2d\nequation: ${eq2d}\nx: [${xMin2d}, ${xMax2d}]\ngrid: ${grid2d}\ncolor: "${color2d}"\n\`\`\``;
  } else if (kind === "surface3d") {
    generatedCode = `\`\`\`surface3d\nequation: ${eq3d}\nx: [${xMin3d}, ${xMax3d}]\ny: [${yMin3d}, ${yMax3d}]\nsamples: ${samples3d}\ncontours: ${contours3d}\n\`\`\``;
  } else {
    generatedCode = `\`\`\`slider\nname: ${sliderName}\nmin: ${sliderMin}\nmax: ${sliderMax}\nstep: ${sliderStep}\ndefault: ${sliderDefault}\n\`\`\``;
  }

  const handleConfirm = () => {
    onInsert(`\n${generatedCode}\n`);
    onClose();
  };

  return (
    <div className="bwjm-modal-overlay" onClick={onClose}>
      <div className="bwjm-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="bwjm-modal-header">
          <div className="bwjm-modal-title">
            <IconBarChart size={18} />
            <span>Asistente para Insertar Gráfica y Parámetros</span>
          </div>
          <button className="bwjm-modal-close" onClick={onClose} aria-label="Cerrar">
            <IconX size={16} />
          </button>
        </div>

        <div className="bwjm-modal-body">
          <div className="bwjm-tabs-bar">
            <button
              className={`bwjm-tab-item ${kind === "plot2d" ? "active" : ""}`}
              onClick={() => setKind("plot2d")}
            >
              Función 2D (plot2d)
            </button>
            <button
              className={`bwjm-tab-item ${kind === "surface3d" ? "active" : ""}`}
              onClick={() => setKind("surface3d")}
            >
              Superficie 3D (surface3d)
            </button>
            <button
              className={`bwjm-tab-item ${kind === "slider" ? "active" : ""}`}
              onClick={() => setKind("slider")}
            >
              Deslizador (slider)
            </button>
          </div>

          {kind === "plot2d" && (
            <div className="bwjm-modal-grid">
              <div className="bwjm-modal-field full-width">
                <label className="bwjm-modal-label">Ecuación y = f(x)</label>
                <input
                  type="text"
                  className="bwjm-modal-input"
                  value={eq2d}
                  onChange={(e) => setEq2d(e.target.value)}
                  placeholder="Ej. sin(x), x^2, a * x"
                />
              </div>

              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">Dominio X mínimo</label>
                <input
                  type="text"
                  className="bwjm-modal-input"
                  value={xMin2d}
                  onChange={(e) => setXMin2d(e.target.value)}
                />
              </div>

              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">Dominio X máximo</label>
                <input
                  type="text"
                  className="bwjm-modal-input"
                  value={xMax2d}
                  onChange={(e) => setXMax2d(e.target.value)}
                />
              </div>

              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">Color de Trazo</label>
                <input
                  type="color"
                  className="bwjm-modal-color"
                  value={color2d}
                  onChange={(e) => setColor2d(e.target.value)}
                />
              </div>

              <div className="bwjm-modal-field align-center">
                <label className="bwjm-checkbox-label">
                  <input
                    type="checkbox"
                    checked={grid2d}
                    onChange={(e) => setGrid2d(e.target.checked)}
                  />
                  <span>Mostrar cuadrícula</span>
                </label>
              </div>
            </div>
          )}

          {kind === "surface3d" && (
            <div className="bwjm-modal-grid">
              <div className="bwjm-modal-field full-width">
                <label className="bwjm-modal-label">Ecuación z = f(x, y)</label>
                <input
                  type="text"
                  className="bwjm-modal-input"
                  value={eq3d}
                  onChange={(e) => setEq3d(e.target.value)}
                  placeholder="Ej. sin(sqrt(x^2 + y^2))"
                />
              </div>

              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">X [mín, máx]</label>
                <div className="bwjm-range-fields">
                  <input
                    type="text"
                    className="bwjm-modal-input"
                    value={xMin3d}
                    onChange={(e) => setXMin3d(e.target.value)}
                  />
                  <input
                    type="text"
                    className="bwjm-modal-input"
                    value={xMax3d}
                    onChange={(e) => setXMax3d(e.target.value)}
                  />
                </div>
              </div>

              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">Y [mín, máx]</label>
                <div className="bwjm-range-fields">
                  <input
                    type="text"
                    className="bwjm-modal-input"
                    value={yMin3d}
                    onChange={(e) => setYMin3d(e.target.value)}
                  />
                  <input
                    type="text"
                    className="bwjm-modal-input"
                    value={yMax3d}
                    onChange={(e) => setYMax3d(e.target.value)}
                  />
                </div>
              </div>

              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">Resolución (Muestras)</label>
                <input
                  type="number"
                  className="bwjm-modal-input"
                  value={samples3d}
                  onChange={(e) => setSamples3d(e.target.value)}
                />
              </div>

              <div className="bwjm-modal-field align-center">
                <label className="bwjm-checkbox-label">
                  <input
                    type="checkbox"
                    checked={contours3d}
                    onChange={(e) => setContours3d(e.target.checked)}
                  />
                  <span>Curvas de nivel</span>
                </label>
              </div>
            </div>
          )}

          {kind === "slider" && (
            <div className="bwjm-modal-grid">
              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">Nombre del Parámetro</label>
                <input
                  type="text"
                  className="bwjm-modal-input"
                  value={sliderName}
                  onChange={(e) => setSliderName(e.target.value)}
                  placeholder="Ej. a, omega, n"
                />
              </div>

              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">Valor Inicial (Default)</label>
                <input
                  type="number"
                  step="any"
                  className="bwjm-modal-input"
                  value={sliderDefault}
                  onChange={(e) => setSliderDefault(e.target.value)}
                />
              </div>

              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">Mínimo</label>
                <input
                  type="number"
                  step="any"
                  className="bwjm-modal-input"
                  value={sliderMin}
                  onChange={(e) => setSliderMin(e.target.value)}
                />
              </div>

              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">Máximo</label>
                <input
                  type="number"
                  step="any"
                  className="bwjm-modal-input"
                  value={sliderMax}
                  onChange={(e) => setSliderMax(e.target.value)}
                />
              </div>

              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">Paso (Step)</label>
                <input
                  type="number"
                  step="any"
                  className="bwjm-modal-input"
                  value={sliderStep}
                  onChange={(e) => setSliderStep(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="bwjm-modal-field full-width">
            <label className="bwjm-modal-label">Bloque de Código Generado</label>
            <pre className="bwjm-code-preview">
              <code>{generatedCode}</code>
            </pre>
          </div>
        </div>

        <div className="bwjm-modal-footer">
          <button className="bwjm-btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="bwjm-btn-primary" onClick={handleConfirm}>
            <IconCheck size={14} />
            <span>Insertar en el Editor</span>
          </button>
        </div>
      </div>
    </div>
  );
};
