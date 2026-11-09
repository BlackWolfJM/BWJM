import React, { useState } from "react";
import { IconX, IconCheck, IconBarChart } from "./icons.js";

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (codeBlock: string) => void;
}

type ChartKind = "plot2d" | "surface3d" | "curve3d" | "vectorfield2d" | "slider" | "parametric2d" | "experiment" | "flow2d";

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

  const [curveX, setCurveX] = useState<string>("cos(t)");
  const [curveY, setCurveY] = useState<string>("sin(t)");
  const [curveZ, setCurveZ] = useState<string>("t / 3");
  const [curveTMin, setCurveTMin] = useState<string>("0");
  const [curveTMax, setCurveTMax] = useState<string>("6.28");
  const [curveColor, setCurveColor] = useState<string>("#0284c7");
  const [sampleFormula, setSampleFormula] = useState<string>("sin(t)");
  const [sampleCount, setSampleCount] = useState<string>("101");

  const [fieldX, setFieldX] = useState<string>("-y");
  const [fieldY, setFieldY] = useState<string>("x");
  const [fieldXMin, setFieldXMin] = useState<string>("-3");
  const [fieldXMax, setFieldXMax] = useState<string>("3");
  const [fieldYMin, setFieldYMin] = useState<string>("-3");
  const [fieldYMax, setFieldYMax] = useState<string>("3");
  const [fieldDensity, setFieldDensity] = useState<string>("12");

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
  } else if (kind === "curve3d") {
    generatedCode = `\`\`\`curve3d\nx: ${curveX}\ny: ${curveY}\nz: ${curveZ}\ntDomain: [${curveTMin}, ${curveTMax}]\ncolor: "${curveColor}"\n\`\`\``;
  } else if (kind === "flow2d") {
    generatedCode = [
      "```slider", "name: t", "min: 0", "max: 6.28",
      "step: 0.04", "default: 0", "```", "",
      "```flow2d", 'field: ["-y", "x"]',
      "seeds: [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0]]",
      "x: [-3, 3]", "y: [-3, 3]", "tMax: 6.28",
      "stepSize: 0.04", "showParticles: true", "showVectors: true", "```",
    ].join("\n");
  } else if (kind === "parametric2d") {
    generatedCode = [
      "```slider", "name: t", "min: " + curveTMin, "max: " + curveTMax,
      "step: 0.02", "default: " + curveTMin, "```", "",
      "```parametric2d", "x: " + curveX, "y: " + curveY,
      "tDomain: [" + curveTMin + ", " + curveTMax + "]",
      'color: "' + curveColor + '"', "samples: 200", "showTrail: true",
      "showVelocity: true", "showAcceleration: false",
      "showTangent: true", "showNormal: true", "```",
    ].join("\n");
  } else if (kind === "experiment") {
    generatedCode = [
      "```functiontable", "id: experimento",
      "caption: Muestreo de una función", "variable: t",
      "domain: [" + curveTMin + ", " + curveTMax + "]",
      "samples: " + sampleCount, "columns: [tiempo, valor]",
      'expressions: ["' + sampleFormula + '"]', "precision: 5", "```", "",
      "```datachart", "tableRef: experimento", "kind: line",
      "x: tiempo", "y: valor", "title: Datos muestreados", "```", "",
      "```statistics", "tableRef: experimento", "column: valor", "```",
    ].join("\n");
  } else if (kind === "vectorfield2d") {
    generatedCode = `\`\`\`vectorfield2d\nfield: ["${fieldX}", "${fieldY}"]\nxDomain: [${fieldXMin}, ${fieldXMax}]\nyDomain: [${fieldYMin}, ${fieldYMax}]\ndensity: ${fieldDensity}\n\`\`\``;
  } else {
    generatedCode = `\`\`\`slider\nname: ${sliderName}\nmin: ${sliderMin}\nmax: ${sliderMax}\nstep: ${sliderStep}\ndefault: ${sliderDefault}\n\`\`\``;
  }

  const handleConfirm = () => {
    onInsert(`\n${generatedCode}\n`);
    onClose();
  };

  return (
    <div className="bwjm-modal-overlay" onClick={onClose}>
      <div className="bwjm-modal-container bwjm-chart-modal" role="dialog" aria-modal="true" aria-label="Asistente para insertar gráficas" onClick={(e) => e.stopPropagation()}>
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
              className={`bwjm-tab-item ${kind === "curve3d" ? "active" : ""}`}
              onClick={() => setKind("curve3d")}
            >
              Curva 3D (curve3d)
            </button>
            <button
              className={`bwjm-tab-item ${kind === "flow2d" ? "active" : ""}`}
              onClick={() => setKind("flow2d")}
            >
              Líneas de corriente
            </button>
            <button
              className={`bwjm-tab-item ${kind === "parametric2d" ? "active" : ""}`}
              onClick={() => setKind("parametric2d")}
            >
              Curva móvil 2D
            </button>
            <button
              className={`bwjm-tab-item ${kind === "experiment" ? "active" : ""}`}
              onClick={() => setKind("experiment")}
            >
              Experimento + tablas
            </button>
            <button
              className={`bwjm-tab-item ${kind === "vectorfield2d" ? "active" : ""}`}
              onClick={() => setKind("vectorfield2d")}
            >
              Campo 2D (vectorfield2d)
            </button>
            <button
              className={`bwjm-tab-item ${kind === "slider" ? "active" : ""}`}
              onClick={() => setKind("slider")}
            >
              Deslizador (slider)
            </button>
          </div>

          {kind === "flow2d" && (
            <div className="bwjm-modal-grid">
              <p style={{ gridColumn: "1 / -1", color: "#475569" }}>
                Inserta un campo rotacional 2D con partículas que siguen sus líneas de corriente mediante RK4. Edita después el campo y las semillas directamente en el archivo.
              </p>
            </div>
          )}
          {kind === "parametric2d" && (
            <div className="bwjm-modal-grid">
              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">x(t)</label>
                <input className="bwjm-modal-input" value={curveX} onChange={e => setCurveX(e.target.value)} />
              </div>
              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">y(t)</label>
                <input className="bwjm-modal-input" value={curveY} onChange={e => setCurveY(e.target.value)} />
              </div>
              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">t mínimo</label>
                <input className="bwjm-modal-input" value={curveTMin} onChange={e => setCurveTMin(e.target.value)} />
              </div>
              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">t máximo</label>
                <input className="bwjm-modal-input" value={curveTMax} onChange={e => setCurveTMax(e.target.value)} />
              </div>
            </div>
          )}
          {kind === "experiment" && (
            <div className="bwjm-modal-grid">
              <div className="bwjm-modal-field full-width">
                <label className="bwjm-modal-label">Expresión a muestrear</label>
                <input className="bwjm-modal-input" value={sampleFormula} onChange={e => setSampleFormula(e.target.value)} />
              </div>
              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">Mínimo</label>
                <input className="bwjm-modal-input" value={curveTMin} onChange={e => setCurveTMin(e.target.value)} />
              </div>
              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">Máximo</label>
                <input className="bwjm-modal-input" value={curveTMax} onChange={e => setCurveTMax(e.target.value)} />
              </div>
              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">Número de muestras (2 a 500)</label>
                <input className="bwjm-modal-input" value={sampleCount} onChange={e => setSampleCount(e.target.value)} />
              </div>
            </div>
          )}
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

          {kind === "curve3d" && (
            <div className="bwjm-modal-grid">
              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">x(t)</label>
                <input
                  type="text"
                  className="bwjm-modal-input"
                  value={curveX}
                  onChange={(e) => setCurveX(e.target.value)}
                  placeholder="cos(t)"
                />
              </div>
              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">y(t)</label>
                <input
                  type="text"
                  className="bwjm-modal-input"
                  value={curveY}
                  onChange={(e) => setCurveY(e.target.value)}
                  placeholder="sin(t)"
                />
              </div>
              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">z(t)</label>
                <input
                  type="text"
                  className="bwjm-modal-input"
                  value={curveZ}
                  onChange={(e) => setCurveZ(e.target.value)}
                  placeholder="t / 3"
                />
              </div>
              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">Color de la curva</label>
                <input
                  type="text"
                  className="bwjm-modal-input"
                  value={curveColor}
                  onChange={(e) => setCurveColor(e.target.value)}
                />
              </div>
              <div className="bwjm-modal-field full-width">
                <label className="bwjm-modal-label">Dominio del parámetro t [mín, máx]</label>
                <div className="bwjm-modal-range-group">
                  <input
                    type="text"
                    className="bwjm-modal-input"
                    value={curveTMin}
                    onChange={(e) => setCurveTMin(e.target.value)}
                  />
                  <input
                    type="text"
                    className="bwjm-modal-input"
                    value={curveTMax}
                    onChange={(e) => setCurveTMax(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {kind === "vectorfield2d" && (
            <div className="bwjm-modal-grid">
              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">Componente P(x, y)</label>
                <input
                  type="text"
                  className="bwjm-modal-input"
                  value={fieldX}
                  onChange={(e) => setFieldX(e.target.value)}
                  placeholder="-y"
                />
              </div>
              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">Componente Q(x, y)</label>
                <input
                  type="text"
                  className="bwjm-modal-input"
                  value={fieldY}
                  onChange={(e) => setFieldY(e.target.value)}
                  placeholder="x"
                />
              </div>
              <div className="bwjm-modal-field full-width">
                <label className="bwjm-modal-label">Dominio X [mín, máx]</label>
                <div className="bwjm-modal-range-group">
                  <input
                    type="text"
                    className="bwjm-modal-input"
                    value={fieldXMin}
                    onChange={(e) => setFieldXMin(e.target.value)}
                  />
                  <input
                    type="text"
                    className="bwjm-modal-input"
                    value={fieldXMax}
                    onChange={(e) => setFieldXMax(e.target.value)}
                  />
                </div>
              </div>
              <div className="bwjm-modal-field full-width">
                <label className="bwjm-modal-label">Dominio Y [mín, máx]</label>
                <div className="bwjm-modal-range-group">
                  <input
                    type="text"
                    className="bwjm-modal-input"
                    value={fieldYMin}
                    onChange={(e) => setFieldYMin(e.target.value)}
                  />
                  <input
                    type="text"
                    className="bwjm-modal-input"
                    value={fieldYMax}
                    onChange={(e) => setFieldYMax(e.target.value)}
                  />
                </div>
              </div>
              <div className="bwjm-modal-field">
                <label className="bwjm-modal-label">Densidad de flechas</label>
                <input
                  type="number"
                  className="bwjm-modal-input"
                  value={fieldDensity}
                  onChange={(e) => setFieldDensity(e.target.value)}
                />
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
