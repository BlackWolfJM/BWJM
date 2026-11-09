import type { GraphParameter, GraphParameterControls } from "@mathmd/ast";
import {
  autoParameterValue, discoverGraphParameters, snapGraphParameter,
  type ParameterizedGraph, validateGraphControlSettings,
} from "./adaptiveGraphParameters.js";

export interface AdaptiveEditorCallbacks {
  save: (value: GraphParameterControls) => void;
  current: (name: string) => number | undefined;
  update: (name: string, value: number) => void;
}
export interface AdaptiveEditor {
  element: HTMLElement;
  dispose: () => void;
}

function checkbox(label: string, checked: boolean, changed: (value: boolean) => void): HTMLLabelElement {
  const wrap = document.createElement("label");
  wrap.className = "bwjm-adaptive-checkbox";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.onchange = () => changed(input.checked);
  wrap.append(input, document.createTextNode(label));
  return wrap;
}

/**
 * Per-chart slider editor, independent of the global slider blocks and scientific time.
 * Source of truth: paramControls in the native .bwjm graph block.
 */
export function createAdaptiveParameterEditor(
  node: ParameterizedGraph, callbacks: AdaptiveEditorCallbacks,
): AdaptiveEditor {
  const container = document.createElement("section");
  container.className = "bwjm-adaptive-parameters";
  container.setAttribute("aria-label", "Parámetros matemáticos de esta gráfica");

  const defaults = discoverGraphParameters(node);
  const settings = node.paramControls ?? { enabled: false, animate: false, parameters: [] };
  const configured: GraphParameterControls = {
    ...settings,
    parameters: settings.parameters.length ? settings.parameters : defaults,
  };
  let disposed = false;
  let frameId: number | null = null;
  let startedAt: number | null = null;
  let lastUpdate = -Infinity;

  const persist = (next: GraphParameterControls) => {
    const error = validateGraphControlSettings(next);
    if (error) { message.textContent = error; return; }
    callbacks.save(next);
  };
  const message = document.createElement("small");
  message.className = "bwjm-adaptive-message";

  const title = document.createElement("div");
  title.className = "bwjm-adaptive-heading";
  const strong = document.createElement("strong");
  strong.textContent = "Parámetros interactivos";
  const count = document.createElement("span");
  count.textContent = defaults.length + " detectados";
  title.append(strong, count);
  container.append(title);

  container.append(checkbox("Habilitar controles para esta gráfica",
    settings.enabled, checked => persist({ ...configured, enabled: checked })));

  if (!settings.enabled) {
    const explanation = document.createElement("small");
    explanation.className = "bwjm-adaptive-hint";
    explanation.textContent = defaults.length
      ? "Detectados: " + defaults.map(item => item.name).join(", ") +
        ". Al desactivar los controles configurados, sus coeficientes toman el valor provisional 1 si no hay slider global. Actívalos para establecer sus valores."
      : "Esta gráfica no tiene coeficientes libres detectables. La variable temporal t se controla con reproducción.";
    container.append(explanation, message);
    return { element: container, dispose: () => { disposed = true; } };
  }
  if (!configured.parameters.length) {
    const explanation = document.createElement("small");
    explanation.className = "bwjm-adaptive-hint";
    explanation.textContent = "No hay parámetros libres. Añade un coeficiente a la ecuación y vuelve a activar el control.";
    container.append(explanation, message);
    return { element: container, dispose: () => { disposed = true; } };
  }

  const numericOutputs = new Map<string, HTMLOutputElement>();
  const numericSliders = new Map<string, HTMLInputElement>();
  const setLiveValue = (parameter: GraphParameter, value: number) => {
    const corrected = snapGraphParameter(value, parameter);
    callbacks.update(parameter.name, corrected);
    const output = numericOutputs.get(parameter.name);
    if (output) output.textContent = String(corrected);
    const slider = numericSliders.get(parameter.name);
    if (slider) slider.value = String(corrected);
  };

  for (const parameter of configured.parameters) {
    const row = document.createElement("div");
    row.className = "bwjm-adaptive-parameter";
    const header = document.createElement("div");
    header.className = "bwjm-adaptive-parameter-header";
    const name = document.createElement("strong");
    name.textContent = parameter.name + (parameter.integer ? " (entero)" : "");
    const output = document.createElement("output");
    output.textContent = String(callbacks.current(parameter.name) ?? parameter.default);
    numericOutputs.set(parameter.name, output);
    header.append(name, output);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.className = "bwjm-adaptive-range";
    slider.min = String(parameter.min);
    slider.max = String(parameter.max);
    slider.step = String(parameter.step);
    slider.value = String(callbacks.current(parameter.name) ?? parameter.default);
    slider.setAttribute("aria-label", "Valor del parámetro " + parameter.name);
    numericSliders.set(parameter.name, slider);
    slider.oninput = () => setLiveValue(parameter, Number(slider.value));
    slider.onchange = () => {
      // Save only on release; dragging never reparses the entire source document.
      const value = snapGraphParameter(Number(slider.value), parameter);
      const next = configured.parameters.map(p => p.name === parameter.name
        ? { ...p, default: value } : p);
      persist({ ...configured, parameters: next });
    };
    row.append(header, slider);

    const fields = document.createElement("div");
    fields.className = "bwjm-adaptive-configuration";
    const labels: Array<[keyof Pick<GraphParameter, "min" | "max" | "step" | "default">, string]> = [
      ["min","Mín."],["max","Máx."],["step","Paso"],["default","Inicial"],
    ];
    labels.forEach(([field, label]) => {
      const wrapper = document.createElement("label");
      const text = document.createElement("span");
      text.textContent = label;
      const input = document.createElement("input");
      input.type = "number";
      input.className = "bwjm-adaptive-number";
      input.value = String(parameter[field]);
      input.step = parameter.integer ? "1" : "any";
      input.setAttribute("aria-label", label + " de " + parameter.name);
      input.onchange = () => {
        const nextValue = Number(input.value);
        if (!input.value.trim() || !Number.isFinite(nextValue)) {
          message.textContent = "El valor debe ser un número finito.";
          input.value = String(parameter[field]);
          return;
        }
        const candidate = { ...parameter, [field]: nextValue };
        const nextSettings = {
          ...configured,
          parameters: configured.parameters.map(item =>
            item.name === parameter.name ? candidate : item),
        };
        const invalid = validateGraphControlSettings(nextSettings);
        if (invalid) {
          message.textContent = invalid;
          input.value = String(parameter[field]);
          return;
        }
        persist(nextSettings);
      };
      wrapper.append(text, input);
      fields.append(wrapper);
    });
    row.append(fields);
    container.append(row);
  }

  const tools = document.createElement("div");
  tools.className = "bwjm-adaptive-actions";
  tools.append(checkbox("Animar parámetros automáticamente", settings.animate === true,
    checked => persist({ ...configured, animate: checked })));
  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "Restablecer";
  reset.onclick = () => configured.parameters.forEach(parameter => setLiveValue(parameter, parameter.default));
  tools.append(reset);
  container.append(tools, message);

  if (settings.animate) {
    const stepFrame = (now: number) => {
      frameId = null;
      if (disposed || !container.isConnected) return;
      if (startedAt === null) startedAt = now;
      if (now - lastUpdate >= 170) { // cap expensive 3D recomputation to ~6 fps
        configured.parameters.forEach((parameter, index) => {
          setLiveValue(parameter, autoParameterValue(parameter, now-startedAt!, index));
        });
        lastUpdate = now;
      }
      frameId = requestAnimationFrame(stepFrame);
    };
    frameId = requestAnimationFrame(stepFrame);
  }

  return {
    element: container,
    dispose: () => {
      disposed = true;
      if (frameId !== null) cancelAnimationFrame(frameId);
    },
  };
}
