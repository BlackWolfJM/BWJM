import type { CheckboxNode, MathMDNode, SliderNode } from "@mathmd/ast";
import { MathMDCore } from "@mathmd/core";
import { PlotlyRenderer } from "@mathmd/renderer-plotly";
import { SVGRenderer } from "@mathmd/renderer-svg";
import { segmentMathMDDocument, type PreviewUpdate } from "./services.js";

interface VsCodeWebviewApi {
  postMessage(message: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeWebviewApi;

type RendererEntry =
  | { type: "svg"; container: HTMLDivElement }
  | { type: "plotly"; renderer: PlotlyRenderer; container: HTMLDivElement }
  | { type: "control" | "text" | "error"; container: HTMLDivElement };

const root = document.getElementById("mathmd-root");
const renderers = new Map<string, RendererEntry>();
const animationTimers = new Map<string, number>();
let core: MathMDCore | undefined;
let nodes: MathMDNode[] = [];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function appendText(
  container: HTMLElement,
  tag: "p" | "pre" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span",
  text: string,
  className?: string,
): void {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  container.appendChild(element);
}

function clearRenderers(): void {
  for (const timerId of animationTimers.values()) {
    window.clearInterval(timerId);
  }
  animationTimers.clear();
  for (const renderer of renderers.values()) {
    if (renderer.type === "plotly") renderer.renderer.destroy();
  }
  renderers.clear();
}

function stepDecimals(step: number): number {
  const text = String(step);
  const dotIndex = text.indexOf(".");
  return dotIndex === -1 ? 0 : text.length - dotIndex - 1;
}

function normalizeStepValue(value: number, step: number): number {
  const decimals = Math.min(8, Math.max(0, stepDecimals(step)));
  return Number(value.toFixed(decimals));
}

function renderSlider(node: SliderNode, container: HTMLDivElement): void {
  if (!core) return;
  const wrapper = document.createElement("div");
  wrapper.className = "control-row slider-control-row";

  const name = document.createElement("span");
  name.className = "control-name";
  name.textContent = node.name;

  const input = document.createElement("input");
  input.type = "range";
  input.min = String(node.min);
  input.max = String(node.max);
  input.step = String(node.step);
  input.value = String(core.getVariable(node.name) ?? node.default);
  input.setAttribute("aria-label", node.name);

  const value = document.createElement("output");
  value.textContent = input.value;

  const playButton = document.createElement("button");
  playButton.type = "button";
  playButton.className = "slider-play-btn";
  playButton.setAttribute("aria-label", `Animar ${node.name}`);
  playButton.textContent = "▶ Play";

  const applySliderValue = (nextValue: number): void => {
    const formatted = String(nextValue);
    input.value = formatted;
    value.textContent = formatted;
    for (const nodeId of core?.setVariable(node.name, nextValue) ?? []) {
      updateNode(nodeId);
    }
  };

  input.addEventListener("input", () => {
    const nextValue = Number(input.value);
    value.textContent = input.value;
    for (const nodeId of core?.setVariable(node.name, nextValue) ?? []) {
      updateNode(nodeId);
    }
  });

  playButton.addEventListener("click", () => {
    const activeTimer = animationTimers.get(node.id);
    if (activeTimer !== undefined) {
      window.clearInterval(activeTimer);
      animationTimers.delete(node.id);
      playButton.textContent = "▶ Play";
      playButton.classList.remove("playing");
      return;
    }

    playButton.textContent = "⏸ Pause";
    playButton.classList.add("playing");
    const step = node.step > 0 ? node.step : 0.1;
    const timerId = window.setInterval(() => {
      const currentValue = Number(input.value);
      const rawNext = currentValue + step;
      const nextValue = rawNext > node.max ? node.min : normalizeStepValue(rawNext, step);
      applySliderValue(nextValue);
    }, 60);
    animationTimers.set(node.id, timerId);
  });

  wrapper.append(name, input, value, playButton);
  container.appendChild(wrapper);
}

function renderCheckbox(node: CheckboxNode, container: HTMLDivElement): void {
  if (!core) return;
  const wrapper = document.createElement("label");
  wrapper.className = "control-row checkbox-row";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(core.getVariable(node.name) ?? node.default);
  const label = document.createElement("span");
  label.textContent = node.label ?? node.name;
  input.addEventListener("change", () => {
    for (const nodeId of core?.setVariable(node.name, input.checked ? 1 : 0) ?? []) updateNode(nodeId);
  });
  wrapper.append(input, label);
  container.appendChild(wrapper);
}

function appendInlineFormatted(target: HTMLElement, text: string): void {
  const tokenPattern = /(`[^`]+`|\$[^$\n]+\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = tokenPattern.exec(text);

  while (match !== null) {
    if (match.index > lastIndex) {
      target.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const token = match[0];
    if (token.startsWith("`") && token.endsWith("`")) {
      const inner = token.slice(1, -1);
      if (inner.startsWith("$") && inner.endsWith("$") && inner.length > 2) {
        const mathSpan = document.createElement("span");
        mathSpan.className = "math-inline";
        mathSpan.textContent = inner.slice(1, -1);
        target.appendChild(mathSpan);
      } else {
        const codeEl = document.createElement("code");
        codeEl.textContent = inner;
        target.appendChild(codeEl);
      }
    } else if (token.startsWith("$") && token.endsWith("$")) {
      const mathSpan = document.createElement("span");
      mathSpan.className = "math-inline";
      mathSpan.textContent = token.slice(1, -1);
      target.appendChild(mathSpan);
    }
    lastIndex = match.index + token.length;
    match = tokenPattern.exec(text);
  }

  if (lastIndex < text.length) {
    target.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

function renderProse(content: string, container: HTMLElement): void {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("$$")) {
      if (trimmed.endsWith("$$") && trimmed.length > 4) {
        appendText(container, "pre", trimmed.slice(2, -2).trim(), "math-block");
        index += 1;
        continue;
      }
      const mathLines: string[] = [];
      if (trimmed.length > 2) mathLines.push(trimmed.slice(2));
      index += 1;
      while (index < lines.length) {
        const currentLine = lines[index] ?? "";
        if (currentLine.trim().endsWith("$$")) {
          const beforeClose = currentLine.trim().slice(0, -2).trim();
          if (beforeClose.length > 0) mathLines.push(beforeClose);
          index += 1;
          break;
        }
        mathLines.push(currentLine);
        index += 1;
      }
      appendText(container, "pre", mathLines.join("\n").trim(), "math-block");
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }
      if (index < lines.length) index += 1;
      const pre = document.createElement("pre");
      pre.className = "code-block";
      const code = document.createElement("code");
      code.textContent = codeLines.join("\n");
      pre.appendChild(code);
      container.appendChild(pre);
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1]?.length ?? 1;
      const tag = `h${Math.min(6, Math.max(1, level))}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      const heading = document.createElement(tag);
      appendInlineFormatted(heading, headingMatch[2] ?? "");
      container.appendChild(heading);
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const list = document.createElement("ul");
      while (index < lines.length && /^[-*]\s+/.test((lines[index] ?? "").trim())) {
        const itemText = (lines[index] ?? "").trim().replace(/^[-*]\s+/, "");
        const li = document.createElement("li");
        appendInlineFormatted(li, itemText);
        list.appendChild(li);
        index += 1;
      }
      container.appendChild(list);
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      (lines[index] ?? "").trim().length > 0 &&
      !(lines[index] ?? "").trim().startsWith("$$") &&
      !(lines[index] ?? "").trim().startsWith("```") &&
      !/^(#{1,6})\s+/.test((lines[index] ?? "").trim()) &&
      !/^[-*]\s+/.test((lines[index] ?? "").trim())
    ) {
      paragraphLines.push((lines[index] ?? "").trim());
      index += 1;
    }
    const paragraph = document.createElement("p");
    appendInlineFormatted(paragraph, paragraphLines.join(" "));
    container.appendChild(paragraph);
  }
}

function renderNode(node: MathMDNode, processed: MathMDNode, container: HTMLDivElement): void {
  if (
    node.type === "plot2d" ||
    node.type === "vector2d" ||
    node.type === "point2d" ||
    node.type === "vectorfield2d" ||
    node.type === "contour"
  ) {
    const renderer = new SVGRenderer(container, container.clientWidth || 640, 360);
    renderer.render(processed);
    renderers.set(node.id, { type: "svg", container });
    return;
  }
  if (node.type === "surface3d") {
    const renderer = new PlotlyRenderer(container);
    renderer.render(processed);
    renderers.set(node.id, { type: "plotly", renderer, container });
    return;
  }
  if (node.type === "slider") {
    container.classList.add("control-container");
    renderSlider(node, container);
    renderers.set(node.id, { type: "control", container });
    return;
  }
  if (node.type === "checkbox") {
    container.classList.add("control-container");
    renderCheckbox(node, container);
    renderers.set(node.id, { type: "control", container });
    return;
  }

  appendText(container, "pre", JSON.stringify(node, null, 2));
  renderers.set(node.id, { type: "text", container });
}

function updateNode(nodeId: string): void {
  if (!core) return;
  const original = nodes.find((node) => node.id === nodeId);
  const current = renderers.get(nodeId);
  if (!original || !current) return;
  if (current.type === "plotly") current.renderer.destroy();
  current.container.replaceChildren();
  current.container.classList.remove("control-container");
  try {
    renderNode(original, core.getNodeData(nodeId) as MathMDNode, current.container);
  } catch (error: unknown) {
    appendText(current.container, "p", errorMessage(error), "error");
    renderers.set(nodeId, { type: "error", container: current.container });
  }
}

function renderDocument(message: PreviewUpdate): void {
  const currentRoot = document.getElementById("mathmd-root") || root;
  if (!currentRoot) return;
  clearRenderers();
  currentRoot.replaceChildren();

  const { segments, document: parsed } = segmentMathMDDocument(message.source);
  nodes = parsed.children;
  core = new MathMDCore(parsed);

  const sheet = document.createElement("article");
  sheet.className = "bwjm-sheet";
  currentRoot.appendChild(sheet);

  const header = document.createElement("header");
  header.className = "sheet-header";
  const isBwjm = /\.(bwjm|jm)$/i.test(message.documentUri);
  appendText(
    header,
    "span",
    isBwjm ? "BWJM • Hoja Interactiva" : "MathMD • Vista Previa",
    "bwjm-badge",
  );
  appendText(header, "p", message.documentUri, "document-uri");
  sheet.appendChild(header);

  if (parsed.diagnostics.length > 0) {
    const diagnostics = document.createElement("section");
    diagnostics.className = "diagnostics";
    diagnostics.setAttribute("aria-label", "Diagnósticos MathMD");
    for (const diagnostic of parsed.diagnostics) {
      appendText(
        diagnostics,
        "p",
        `${diagnostic.severity.toUpperCase()} ${diagnostic.code}: ${diagnostic.message}`,
        diagnostic.severity,
      );
    }
    sheet.appendChild(diagnostics);
  }

  if (segments.length === 0 && parsed.diagnostics.length === 0) {
    appendText(sheet, "p", "Este documento está vacío.", "empty-state");
    return;
  }

  for (const segment of segments) {
    if (segment.kind === "prose") {
      const proseSection = document.createElement("section");
      proseSection.className = "markdown-prose";
      renderProse(segment.content, proseSection);
      sheet.appendChild(proseSection);
      continue;
    }

    const node = segment.node;
    const card = document.createElement("section");
    card.className = "node-card";
    appendText(card, "h2", node.type.toUpperCase(), "node-type-badge");
    const container = document.createElement("div");
    container.className = "visualization";
    card.appendChild(container);
    sheet.appendChild(card);
    try {
      renderNode(node, core.getNodeData(node.id) as MathMDNode, container);
    } catch (error: unknown) {
      appendText(container, "p", errorMessage(error), "error");
      renderers.set(node.id, { type: "error", container });
    }
  }
}

function isPreviewUpdate(value: unknown): value is PreviewUpdate {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PreviewUpdate>;
  return candidate.type === "update" && typeof candidate.source === "string" && typeof candidate.documentUri === "string";
}

window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (isPreviewUpdate(event.data)) renderDocument(event.data);
});

if (typeof acquireVsCodeApi === "function") {
  try {
    acquireVsCodeApi().postMessage({ type: "ready" });
  } catch {
    // Modo visor independiente o navegador
  }
}
