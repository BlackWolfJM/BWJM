import { useState } from "react";
import { chooseIntegrationMethod, integrationCases, type IntegralKind } from "./integrationDecision.js";

export function IntegrationGuide({ onSelectGreen }: { onSelectGreen: () => void }) {
  const [kind, setKind] = useState<IntegralKind>("planar-circulation");
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const choice = integrationCases[kind];
  const result = chooseIntegrationMethod(kind, confirmed);

  return (
    <details className="bwjm-integration-guide">
      <summary>Guía para elegir un método de integración</summary>
      <div className="bwjm-calculus-fields">
        <label className="bwjm-calculus-field">
          <span>¿Qué integral necesitas resolver?</span>
          <select value={kind} onChange={event => {
            setKind(event.target.value as IntegralKind);
            setConfirmed([]);
          }}>
            {Object.entries(integrationCases).map(([value, item]) => (
              <option key={value} value={value}>{item.label}</option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend>Hipótesis que has comprobado</legend>
        {choice.checks.map(check => (
          <div key={check.id}>
            <label>
              <input
                type="checkbox"
                checked={confirmed.includes(check.id)}
                onChange={event => {
                  const checked = event.target.checked;
                  setConfirmed(previous => checked
                    ? [...previous, check.id]
                    : previous.filter(id => id !== check.id));
                }}
              />{" "}{check.label}
            </label>
          </div>
        ))}
      </fieldset>
      <p>Confirma cada hipótesis para tu problema. La guía usa tus respuestas para elegir el método.</p>
      <div aria-live="polite">
        <p><strong>{result.method}</strong></p>
        <p>{result.detail}</p>
        {result.missing.length > 0 && (
          <p>Faltan {result.missing.length} hipótesis por confirmar para aplicar {choice.method}.</p>
        )}
      </div>
      {result.method === "Green" && (
        <div className="bwjm-calculus-controls">
          <button type="button" onClick={onSelectGreen}>Abrir la plantilla de Green</button>
        </div>
      )}
    </details>
  );
}
