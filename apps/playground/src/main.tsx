import React, { useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore, ChangeEvent } from "react";
import { createRoot } from "react-dom/client";
import { parseMathMD, parseProseMarkdown, collectMarkdownDefinitions } from "@mathmd/parser";
import { isSafeEmbeddedRasterUrl, MAX_LOCAL_IMAGE_BYTES, portableImageMarkdown, validateLocalRaster } from "./localImages.js";
import { compactImageEditor } from "./compactImageEditor.js";
import type { DocumentInsertSnapshot } from "./workspaceDocuments.js";
import type { MdastNode } from "@mathmd/parser";
import { MathMDCore, prepareCrossProductNodeData } from "@mathmd/core";
import { SVGRenderer } from "@mathmd/renderer-svg";
import { PlotlyRenderer } from "@mathmd/renderer-plotly";
import {
  findIntersections,
  computeExactArea,
  computeRiemannPartition,
  computeRevolutionVolume,
  computeCrossSection,
  computeKinematics,
  sampleVectorField2D,
  expressionToLatex,
  serializeScientificTable,
} from "@mathmd/math";
import type { CheckboxNode, MathMDDiagnostic, MathMDNode, SliderNode, TimelineNode, DataTableNode, FunctionTableNode, Parametric2DNode } from "@mathmd/ast";
import type { VectorStudyResult } from "@mathmd/math";
import { SidebarLeft, OutlineItem, type SidebarTab } from "./SidebarLeft.js";
import { Ribbon, type RibbonAction } from "./Ribbon.js";
import { DocumentTabs } from "./DocumentTabs.js";
import { createAdaptiveParameterEditor } from "./AdaptiveParameterEditor.js";
import { createCrossProductDeterminant, createCrossProductEditor, createCrossProductReport, createCrossProductSummary } from "./CrossProductEditor.js";
import {
  supportsAdaptiveParameters, writeGraphParameterControls,
} from "./adaptiveGraphParameters.js";
import { updateCrossProductVector, updateGraphOption, updateGraphNumericOption } from "./graphOptionSource.js";
import { DocumentSearch, type TextMatch } from "./DocumentSearch.js";
import { useDocumentWorkspace } from "./workspaceDocuments.js";
import { IconAtom, IconCheck } from "./icons.js";
import { FormulaModal } from "./FormulaModal.js";
import { ChartModal } from "./ChartModal.js";
import { CommandPalette, CommandItem } from "./CommandPalette.js";
import { createInlinePlayback, supportsInlinePlayback, type InlinePlaybackController } from "./inlineGraphPlayback.js";
import { readStoredTheme, persistStudioTheme, type StudioThemeId } from "./studioThemes.js";
import "./theme.css";

declare global {
  interface Window {
    katex?: {
      renderToString(tex: string, options?: { displayMode?: boolean; throwOnError?: boolean }): string;
    };
  }
}

/** The document and interactive slider share this one educational readout. */
function updateVectorStudyReport(
  report: HTMLElement,
  data: { study?: VectorStudyResult; error?: string; showSteps?: boolean }
): void {
  const expanded = report.querySelector("details")?.open ?? false;
  report.replaceChildren();
  if (data.error) {
    report.textContent = "No se pudo construir el laboratorio: " + data.error;
    report.classList.add("has-error");
    return;
  }
  report.classList.remove("has-error");
  if (!data.study) return;
  const study = data.study;
  const heading = document.createElement("strong");
  heading.textContent = study.topic + " · Resultado: ⟨" +
    study.result.map(x => Number(x.toPrecision(10))).join(", ") + "⟩";
  report.appendChild(heading);
  const explanation = document.createElement("p");
  explanation.textContent = study.explanation;
  report.appendChild(explanation);
  const check = document.createElement("p");
  check.textContent = "Verificación: " + study.verification;
  report.appendChild(check);
  if (data.showSteps === false) return;
  const details = document.createElement("details");
  details.open = expanded;
  const summary = document.createElement("summary");
  summary.textContent = "Ver procedimiento (" + study.steps.length + " pasos)";
  details.appendChild(summary);
  const list = document.createElement("ol");
  for (const item of study.steps) {
    const li = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = item.title + ": ";
    li.appendChild(title);
    const math = document.createElement("span");
    math.textContent = item.expression;
    li.appendChild(math);
    const note = document.createElement("p");
    note.textContent = item.explanation;
    li.appendChild(note);
    list.appendChild(li);
  }
  details.appendChild(list);
  report.appendChild(details);
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMathToString(tex: string, displayMode: boolean): string {
  if (typeof window !== "undefined" && window.katex) {
    try {
      return window.katex.renderToString(tex, { displayMode, throwOnError: false });
    } catch (_err) {
      void _err;
    }
  }

  const cleaned = escapeHtml(
    tex
      .replace(/\\implies/g, " ⟹ ")
      .replace(/\\ge/g, " ≥ ")
      .replace(/\\le/g, " ≤ ")
      .replace(/\\approx/g, " ≈ ")
      .replace(/\\int_{([^}]+)}\^{([^}]+)}/g, "∫_{$1}^{$2} ")
      .replace(/\\frac{([^}]+)}{([^}]+)}/g, "($1 / $2)")
      .replace(/\\left\[/g, "[")
      .replace(/\\right\]_0\^1/g, "]_{0}^{1}")
      .replace(/\\left\(/g, "(")
      .replace(/\\right\)/g, ")")
      .replace(/\\cdot/g, " · ")
      .replace(/\\pi/g, "π")
      .replace(/\\alpha/g, "α")
      .replace(/\\omega/g, "ω")
      .replace(/\\,/g, " ")
      .replace(/\\;/g, " ")
      .replace(/\\/g, "")
  );

  if (displayMode) {
    return `<div style="font-family: 'Cambria Math', KaTeX_Math, serif; font-size: 1.25rem; font-style: italic; color: #0284c7;">${cleaned}</div>`;
  }
  return `<span style="font-family: 'Cambria Math', KaTeX_Math, serif; font-style: italic; color: #0369a1; padding: 0 2px;">${cleaned}</span>`;
}



function renderTableBody(
  tbody: HTMLTableSectionElement,
  rows: ReadonlyArray<ReadonlyArray<string | number | boolean | null>>,
  precision: number = 6,
): void {
  tbody.replaceChildren();
  rows.forEach(values => {
    const tr = document.createElement("tr");
    values.forEach(value => {
      const td = document.createElement("td");
      const display = typeof value === "number" ? Number(value.toFixed(precision)) : value;
      td.textContent = display === null ? "—" : String(display);
      if (typeof value === "number") td.className = "numeric";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function renderStatisticsPanel(report: HTMLElement, data: any): void {
  report.replaceChildren();
  if (data?.error) { report.textContent = data.error; return; }
  if (!data?.summary) { report.textContent = "No hay muestras numéricas válidas."; return; }
  const metrics = { ...data.summary, ...(data.regression ?? {}) };
  Object.entries(metrics).forEach(([key, value]) => {
    const item = document.createElement("div");
    item.className = "bwjm-statistic";
    const label = document.createElement("span");
    label.textContent = key;
    const figure = document.createElement("strong");
    figure.textContent = typeof value === "number" ? String(Number(value.toPrecision(8))) : String(value);
    item.append(label, figure);
    report.appendChild(item);
  });
}

const SAMPLE_LESSONS: Record<string, { title: string; filename: string; content: string }> = {
  riemann: {
    title: "1. Área entre Curvas & Suma de Riemann (f=x, g=x²)",
    filename: "area_riemann.bwjm",
    content: `# Área entre Curvas y Sumas de Riemann

> **Teoría Fundamental (Sección 3):** Sean dos funciones continuas $f(x) = x$ y $g(x) = x^2$ definidas en el intervalo $[0, 1]$.

La región acotada $R$ viene delimitada por los puntos de intersección calculados automáticamente:

$$
x = x^2 \\implies x(1 - x) = 0 \\implies x_1 = 0,\\; x_2 = 1
$$

En el intervalo $[0, 1]$, se verifica que $x \\ge x^2$. Por tanto, el área exacta bajo la curva es:

$$
A = \\int_{0}^{1} (x - x^2)\\,dx = \\left[ \\frac{x^2}{2} - \\frac{x^3}{3} \\right]_0^1 = \\frac{1}{6} \\approx 0.16667
$$

## Parámetros de Riemann

Ajusta el número de particiones rectangulares para observar la convergencia:

\`\`\`slider
name: n
min: 2
max: 50
step: 1
default: 10
\`\`\`

\`\`\`slider
name: a
min: 0.1
max: 2.0
step: 0.1
default: 1.0
\`\`\`

## Gráfica de la Curva Superior e Inferior

\`\`\`plot2d
equation: a * x
x: [0, 1.2]
grid: true
color: "#0284c7"
\`\`\`

\`\`\`plot2d
equation: x^2
x: [0, 1.2]
grid: true
color: "#ea580c"
\`\`\`
`,
  },
  revolution: {
    title: "2. Sólidos de Revolución & Giro a 3π",
    filename: "solido_revolucion.bwjm",
    content: `# Sólido de Revolución y Giro Continuo

> **Regla geométrica (Sección 4):** Cuando una región plana gira en torno a un eje, tras $2\\pi$ se completa una vuelta entera. Continuar el barrido hasta $3\\pi$ añade un ciclo cinemático adicional, pero **el volumen del conjunto de puntos no varía tras $2\\pi$**.

El volumen del sólido generado por $y=x$ y $y=x^2$ al girar alrededor del eje $x$ es:

$$
V = \\pi \\int_{0}^{1} (x^2 - x^4)\\,dx = \\pi \\left[ \\frac{x^3}{3} - \\frac{x^5}{5} \\right]_0^1 = \\frac{2\\pi}{15} \\approx 0.41888
$$

## Control del Ángulo de Giro

Pulsa **Play** para observar el barrido en el espacio tridimensional de $0$ a $3\\pi$:

\`\`\`slider
name: alpha
min: 0.1
max: 9.42
step: 0.15
default: 6.28
\`\`\`

## Vista Tridimensional del Sólido

\`\`\`surface3d
equation: sqrt(x^2 + y^2) * sin(alpha * 0.1)
x: [-2, 2]
y: [-2, 2]
samples: 50
contours: true
\`\`\`
`,
  },
  surface: {
    title: "3. Superficie 3D y Oscilador Armónico",
    filename: "onda_armonica.bwjm",
    content: `# Superficie 3D y Oscilador Armónico

Visualización tridimensional interactiva de ondas estacionarias:

$$
z(x, y) = A \\cdot \\frac{\\sin(\\omega \\sqrt{x^2 + y^2})}{\\sqrt{x^2 + y^2}}
$$

\`\`\`slider
name: amplitud
min: 0.2
max: 3.0
step: 0.1
default: 1.5
\`\`\`

\`\`\`slider
name: frecuencia
min: 0.5
max: 4.0
step: 0.25
default: 1.5
\`\`\`

\`\`\`surface3d
equation: amplitud * sin(frecuencia * sqrt(x^2 + y^2 + 0.1))
x: [-6, 6]
y: [-6, 6]
samples: 55
contours: true
\`\`\`
`,
  },
  vector_calculus: {
    title: "4. Cinemática Espacial & Marco Frenet (TNB) en Hélice 3D",
    filename: "cinematica_helice_3d.bwjm",
    content: `# Cinemática Espacial y Triedro de Frenet-Serret

> **Geometría Diferencial de Curvas:** Para una partícula con trayectoria $\\mathbf{r}(t) = (\\cos t, \\sin t, t/3)$, el vector tangente $\\mathbf{T}$, la normal principal $\\mathbf{N}$ y la binormal $\\mathbf{B} = \\mathbf{T} \\times \\mathbf{N}$ constituyen un marco ortonormal móvil. La curvatura $\\kappa = 0.9$ y la torsión $\\tau = 0.3$ describen cómo la curva se flexiona y escapa de su plano osculador.

$$
\\mathbf{r}(t) = \\left( \\cos(t), \\sin(t), \\frac{t}{3} \\right), \\quad |\\mathbf{v}(t)| = \\frac{\\sqrt{10}}{3} \\approx 1.054, \\quad \\kappa = \\frac{9}{10} = 0.9, \\quad \\tau = \\frac{3}{10} = 0.3
$$

## Control de Tiempo y Movimiento

Ajusta el parámetro temporal $t$ o pulsa Play para activar la cinemática animada:

\`\`\`slider
name: t
min: 0.0
max: 6.28
step: 0.05
default: 1.57
\`\`\`

## Visualización Tridimensional de la Curva y Triedro Móvil

\`\`\`curve3d
x: cos(t)
y: sin(t)
z: t / 3
tDomain: [0, 6.28]
color: "#0284c7"
animated: true
showVectors: true
showTNB: true
showLegend: false
showInfo: false
\`\`\`
`,
  },
  vector_field: {
    title: "5. Campos Vectoriales 2D & Teorema de Green",
    filename: "campo_vectorial_green.bwjm",
    content: `# Campos Vectoriales, Circulación y Teorema de Green

> **Cálculo Vectorial:** Para el campo de velocidades en rotación rígida $\\mathbf{F}(x, y) = (-y, x)$, el rotacional mide la velocidad angular local $(\\nabla \\times \\mathbf{F})_z = 2$. Por el Teorema de Green, la circulación a lo largo de la frontera circular $C$ es igual a la integral doble del rotacional sobre el disco encerrado:

$$
\\oint_C \\mathbf{F} \\cdot d\\mathbf{r} = \\iint_D (\\nabla \\times \\mathbf{F})_z\\,dA = 2 \\cdot \\text{Área}(D) = 2\\pi \\approx 6.28318
$$

## Visualización del Campo Vectorial 2D

\`\`\`vectorfield2d
field: ["-y", "x"]
xDomain: [-3, 3]
yDomain: [-3, 3]
density: 12
color: "#0284c7"
\`\`\`
`,
  },
};

type ViewMode = "editor" | "split" | "reader";
const compactWorkspaceQuery = "(max-width: 960px)";

function subscribeToCompactWorkspace(listener: () => void): () => void {
  const query = window.matchMedia(compactWorkspaceQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function isCompactWorkspace(): boolean {
  return window.matchMedia(compactWorkspaceQuery).matches;
}

interface DocumentSegment {
  kind: "prose" | "mathmd" | "diagnostic";
  content?: string;
  node?: MathMDNode;
  diagnostic?: MathMDDiagnostic;
}

function parseDocumentSegments(
  source: string,
  docNodes: MathMDNode[],
  diagnostics: MathMDDiagnostic[]
): DocumentSegment[] {
  type Span =
    | { start: number; end: number; kind: "mathmd"; node: MathMDNode }
    | { start: number; end: number; kind: "diagnostic"; diagnostic: MathMDDiagnostic };

  const spans: Span[] = [];
  for (const node of docNodes) {
    spans.push({
      start: node.range.start.offset,
      end: node.range.end.offset,
      kind: "mathmd",
      node,
    });
  }
  for (const diagnostic of diagnostics) {
    if (diagnostic.range && diagnostic.blockType) {
      spans.push({
        start: diagnostic.range.start.offset,
        end: diagnostic.range.end.offset,
        kind: "diagnostic",
        diagnostic,
      });
    }
  }

  spans.sort((a, b) => a.start - b.start || a.end - b.end);

  const segments: DocumentSegment[] = [];
  let cursor = 0;

  for (const span of spans) {
    if (span.start > cursor) {
      const proseSlice = source.slice(cursor, span.start).trim();
      if (proseSlice.length > 0) {
        segments.push({ kind: "prose", content: proseSlice });
      }
    }
    if (span.kind === "mathmd") {
      segments.push({ kind: "mathmd", node: span.node });
    } else if (span.kind === "diagnostic") {
      segments.push({
        kind: "diagnostic",
        diagnostic: span.diagnostic,
        content: source.slice(span.start, span.end),
      });
    }
    cursor = Math.max(cursor, span.end);
  }

  if (cursor < source.length) {
    const text = source.slice(cursor).trim();
    if (text.length > 0) {
      segments.push({ kind: "prose", content: text });
    }
  }

  return segments;
}

function extractOutline(source: string): OutlineItem[] {
  const lines = source.split("\n");
  const items: OutlineItem[] = [];
  let inCode = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;

    if (line.startsWith("# ")) {
      items.push({ level: 1, text: line.slice(2).trim(), lineNumber: i + 1 });
    } else if (line.startsWith("## ")) {
      items.push({ level: 2, text: line.slice(3).trim(), lineNumber: i + 1 });
    } else if (line.startsWith("### ")) {
      items.push({ level: 3, text: line.slice(4).trim(), lineNumber: i + 1 });
    }
  }

  return items;
}

function appendDisplayMath(container: HTMLElement, tex: string): void {
  const formula = document.createElement("div");
  formula.className = "math-display-box";
  formula.tabIndex = 0;
  formula.setAttribute("role", "region");
  formula.setAttribute("aria-label", "Fórmula");
  formula.innerHTML = renderMathToString(tex, true);
  container.appendChild(formula);
}

/** Only HTTP(S), relative paths and document fragments may be navigation/media targets. */
function safeMarkdownUrl(value: string | undefined): string | null {
  if (!value || [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return null;
  const target = value.trim();
  if (!target || /^\/\//.test(target)) return null;
  try {
    const parsed = new URL(target, document.baseURI);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

function appendInlineMath(container: HTMLElement, tex: string): void {
  const span = document.createElement("span");
  span.className = "bwjm-inline-math";
  // This markup comes only from the trusted KaTeX renderer (or escaped fallback).
  span.innerHTML = renderMathToString(tex, false);
  container.appendChild(span);
}

/** Convert Remark nodes to safe DOM; never interpret user-provided HTML. */
function appendMarkdownNode(parent: HTMLElement, node: MdastNode, source: string): void {
  const children = (target: HTMLElement) => {
    for (const child of node.children ?? []) appendMarkdownNode(target, child, source);
  };
  const element = (tag: string, className?: string): HTMLElement => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    parent.appendChild(el);
    children(el);
    return el;
  };

  switch (node.type) {
    case "root":
    case "listItem":
    case "tableRow":
    case "tableCell":
      children(parent);
      return;
    case "definition":
      return;
    case "text":
      parent.appendChild(document.createTextNode(node.value ?? ""));
      return;
    case "paragraph": {
      // remark-math can represent standalone $$tex$$ as inlineMath.
      const only = node.children?.length === 1 ? node.children[0] : undefined;
      const raw = node.position
        ? source.slice(node.position.start.offset, node.position.end.offset).trim()
        : "";
      if (only?.type === "inlineMath" && /^\$\$[\s\S]*\$\$$/.test(raw)) {
        appendDisplayMath(parent, only.value ?? "");
        return;
      }
      element("p");
      return;
    }
    case "heading":
      element("h" + Math.min(6, Math.max(1, node.depth ?? 1)));
      return;
    case "strong": element("strong"); return;
    case "emphasis": element("em"); return;
    case "delete": element("del"); return;
    case "blockquote": element("blockquote", "markdown-callout"); return;
    case "thematicBreak": parent.appendChild(document.createElement("hr")); return;
    case "break": parent.appendChild(document.createElement("br")); return;
    case "inlineCode": {
      const code = document.createElement("code");
      code.textContent = node.value ?? "";
      parent.appendChild(code);
      return;
    }
    case "code": {
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = node.value ?? "";
      pre.appendChild(code);
      parent.appendChild(pre);
      return;
    }
    case "html":
      parent.appendChild(document.createTextNode(node.value ?? ""));
      return;
    case "inlineMath":
      appendInlineMath(parent, node.value ?? "");
      return;
    case "math":
      appendDisplayMath(parent, node.value ?? "");
      return;
    case "link": {
      const href = safeMarkdownUrl(node.url);
      if (!href) { children(parent); return; }
      const link = document.createElement("a");
      link.href = href;
      if (node.title) link.title = node.title;
      children(link);
      parent.appendChild(link);
      return;
    }
    case "image": {
      const wrapper = document.createElement("span");
      wrapper.className = "bwjm-markdown-image";
      const description = node.alt || "Imagen";
      const src = node.url?.startsWith("data:")
        ? (isSafeEmbeddedRasterUrl(node.url) ? node.url : null)
        : safeMarkdownUrl(node.url);
      if (src) {
        const img = document.createElement("img");
        img.alt = node.alt ?? "";
        img.src = src;
        img.loading = "lazy";
        const error = document.createElement("span");
        error.className = "bwjm-image-error";
        error.setAttribute("role", "status");
        error.hidden = true;
        error.textContent = "No se pudo cargar la imagen: " + description;
        img.addEventListener("error", () => {
          img.hidden = true;
          error.hidden = false;
        });
        wrapper.append(img, error);
      } else {
        const error = document.createElement("span");
        error.className = "bwjm-image-error";
        error.setAttribute("role", "status");
        error.textContent = "No se pudo cargar la imagen: " + description;
        wrapper.appendChild(error);
      }
      parent.appendChild(wrapper);
      return;
    }
    case "list": {
      const list = document.createElement(node.ordered ? "ol" : "ul");
      if (node.ordered && typeof node.start === "number" && node.start !== 1) {
        (list as HTMLOListElement).start = node.start;
      }
      for (const item of node.children ?? []) {
        const li = document.createElement("li");
        if (typeof item.checked === "boolean") {
          const marker = document.createElement("input");
          marker.type = "checkbox";
          marker.disabled = true;
          marker.checked = item.checked;
          li.appendChild(marker);
        }
        for (const child of item.children ?? []) appendMarkdownNode(li, child, source);
        list.appendChild(li);
      }
      parent.appendChild(list);
      return;
    }
    case "table": {
      const scroll = document.createElement("div");
      scroll.className = "bwjm-markdown-table-scroll";
      scroll.tabIndex = 0;
      scroll.setAttribute("role", "region");
      scroll.setAttribute("aria-label", "Tabla del documento, desplazamiento horizontal");
      const table = document.createElement("table");
      const rows = node.children ?? [];
      for (const [rowIndex, row] of rows.entries()) {
        const section = document.createElement(rowIndex === 0 ? "thead" : "tbody");
        const tr = document.createElement("tr");
        for (const [cellIndex, cell] of (row.children ?? []).entries()) {
          const td = document.createElement(rowIndex === 0 ? "th" : "td");
          if (rowIndex === 0) td.setAttribute("scope", "col");
          const alignment = node.align?.[cellIndex];
          if (alignment) td.style.textAlign = alignment;
          for (const child of cell.children ?? []) appendMarkdownNode(td, child, source);
          tr.appendChild(td);
        }
        section.appendChild(tr);
        table.appendChild(section);
      }
      scroll.appendChild(table);
      parent.appendChild(scroll);
      return;
    }
    default:
      children(parent);
  }
}

function renderProseText(content: string, container: HTMLElement, definitions: string): void {
  const root = parseProseMarkdown(content, definitions);
  for (const node of root.children ?? []) {
    // Definitions are metadata, not visible content.
    if (node.type !== "definition") appendMarkdownNode(container, node, content);
  }
}

export function BWJMStudio() {
  const {
    documents, activeId, markdown, filename, selectedTemplate, setMarkdown,
    openDocument, createDocument, selectDocument, closeDocument, markSaved, renameDocument,
    insertAtDocumentSnapshot,
  } = useDocumentWorkspace(SAMPLE_LESSONS.riemann.filename, SAMPLE_LESSONS.riemann.content, "riemann");
  const compactWorkspace = useSyncExternalStore(subscribeToCompactWorkspace, isCompactWorkspace);
  const [desktopView, setDesktopView] = useState<ViewMode>("split");
  const [compactView, setCompactView] = useState<Exclude<ViewMode, "split">>("reader");
  const viewMode = compactWorkspace ? compactView : desktopView;

  const [sliceX] = useState<number>(0.5);
  const [theme, setTheme] = useState<StudioThemeId>(readStoredTheme);
  // Appearance is a Studio preference, not a property of the scientific document.
  useEffect(() => { persistStudioTheme(theme); }, [theme]);

  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [compactSidebarOpen, setCompactSidebarOpen] = useState(false);
  const [isSidebarLeftOpen, setIsSidebarLeftOpen] = compactWorkspace
    ? [compactSidebarOpen, setCompactSidebarOpen]
    : [desktopSidebarOpen, setDesktopSidebarOpen];
  const compactSidebarVisible = compactWorkspace && compactSidebarOpen;
  const setViewMode = (mode: ViewMode) => {
    if (!compactWorkspace) {
      setDesktopView(mode);
    } else if (mode !== "split") {
      setCompactView(mode);
      setCompactSidebarOpen(false);
    }
  };
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("outline");
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState(false);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState<boolean>(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [imageMessage, setImageMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const workspaceLayoutRef = useRef<HTMLDivElement>(null);
  const compactViewRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<MathMDCore | null>(null);
  const activeTimersRef = useRef<Map<string, number>>(new Map());
  const plotlyRenderersRef = useRef<Map<string, PlotlyRenderer>>(new Map());
  const svgRenderersRef = useRef<Map<string, SVGRenderer>>(new Map());
  const openGraphSettingsRef = useRef<Set<string>>(new Set());
  const openCrossProductStepsRef = useRef<Set<string>>(new Set());
  const parameterEditorDisposersRef = useRef<Array<() => void>>([]);
  const playbackRef = useRef<InlinePlaybackController | null>(null);
  const liveAnalysisRef = useRef<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const imageDestinationRef = useRef<DocumentInsertSnapshot | null>(null);

  useEffect(() => {
    if (compactSidebarVisible) {
      workspaceLayoutRef.current?.querySelector<HTMLButtonElement>(".bwjm-sidebar-close")?.focus();
    }
  }, [compactSidebarVisible]);

  const closeSidebar = () => {
    setIsSidebarLeftOpen(false);
    if (compactWorkspace) {
      compactViewRef.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus();
    }
  };

  const editorView = useMemo(() => compactImageEditor(markdown), [markdown]);
  const doc = useMemo(() => parseMathMD(markdown), [markdown]);
  const outline = useMemo(() => extractOutline(markdown), [markdown]);
  
  const timelines = useMemo(() => 
    doc.children.filter(node => node.type === "timeline") as TimelineNode[], 
  [doc]);

  const wordCount = useMemo(() => {
    const clean = markdown.replace(/[#*`>$~-]/g, " ").trim();
    return clean ? clean.split(/\s+/).length : 0;
  }, [markdown]);

  // The visual editor shows short image markers; keep source bytes in markdown.
  const charCount = editorView.text.length;
  const lineCount = editorView.text.split("\n").length;

  const clearTimers = () => {
    activeTimersRef.current.forEach((id) => window.clearInterval(id));
    activeTimersRef.current.clear();
  };

  const clearRenderers = () => {
    parameterEditorDisposersRef.current.forEach(dispose => dispose());
    parameterEditorDisposersRef.current = [];
    playbackRef.current?.dispose();
    playbackRef.current = null;
    plotlyRenderersRef.current.forEach((renderer) => renderer.destroy());
    plotlyRenderersRef.current.clear();
    svgRenderersRef.current.clear();
  };

  useEffect(() => {
    return () => {
      clearTimers();
      clearRenderers();
    };
  }, []);

  const insertAtCursor = (prefix: string, suffix = "") => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMarkdown((prev) => prev + prefix + suffix);
      return;
    }
    const start = editorView.toSourceOffset(textarea.selectionStart, "start");
    const end = editorView.toSourceOffset(textarea.selectionEnd, "end");
    const selected = markdown.substring(start, end);
    const replacement = prefix + selected + suffix;
    const next = markdown.substring(0, start) + replacement + markdown.substring(end);
    const nextEditor = compactImageEditor(next);
    setMarkdown(next);
    if (compactWorkspace) setViewMode("editor");
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        nextEditor.toVisibleOffset(start + prefix.length, "start"),
        nextEditor.toVisibleOffset(start + prefix.length + selected.length, "end"),
      );
    }, 10);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "F1") {
        e.preventDefault();
        setIsRibbonCollapsed(value => !value);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        setIsFormulaModalOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [filename, markdown]);

  const handleSaveFile = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    markSaved();
  };

  const handleOpenFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      openDocument(file.name, content);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  /** Validate both the file signature and browser decoding before embedding any bytes. */
  const readLocalImageData = async (file: File): Promise<string> => {
    if (file.size > MAX_LOCAL_IMAGE_BYTES) {
      throw new Error("La imagen supera 3 MiB. Comprímela antes de insertarla.");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = validateLocalRaster(bytes, file.name, file.type);
    const blob = new Blob([bytes], { type: mime });
    try {
      if (typeof window.createImageBitmap === "function") {
        const bitmap = await window.createImageBitmap(blob);
        bitmap.close();
      } else {
        await new Promise<void>((resolve, reject) => {
          const url = URL.createObjectURL(blob);
          const image = new Image();
          image.onload = () => { URL.revokeObjectURL(url); resolve(); };
          image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("La imagen está corrupta o no se puede decodificar."));
          };
          image.src = url;
        });
      }
    } catch {
      throw new Error("La imagen está corrupta o no se puede decodificar.");
    }
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string"
        ? resolve(reader.result) : reject(new Error("La lectura de la imagen no produjo datos."));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
      reader.onabort = () => reject(new Error("La lectura de la imagen fue cancelada."));
      reader.readAsDataURL(blob);
    });
  };

  const pickLocalImage = (): void => {
    const input = imageFileInputRef.current;
    if (!input) return;
    const textarea = textareaRef.current;
    const start = viewMode === "reader"
      ? markdown.length
      : editorView.toSourceOffset(Math.min(textarea?.selectionStart ?? editorView.text.length, editorView.text.length), "start");
    const end = viewMode === "reader"
      ? markdown.length
      : editorView.toSourceOffset(Math.min(textarea?.selectionEnd ?? editorView.text.length, editorView.text.length), "end");
    // The picker and FileReader are asynchronous. Never infer destination from the
    // active tab once the dialog is closed.
    imageDestinationRef.current = { documentId: activeId, content: markdown, start, end };
    setImageMessage(null);
    input.value = ""; // selecting the same file again must fire a change event
    input.click();
  };

  const handleImageFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    const target = imageDestinationRef.current;
    imageDestinationRef.current = null;
    event.target.value = "";
    if (!file || !target) return; // Cancel never changes the document.
    try {
      const dataUrl = await readLocalImageData(file);
      const markup = portableImageMarkdown(file.name, dataUrl);
      const status = insertAtDocumentSnapshot(target, markup);
      if (status === "inserted") {
        setImageMessage("Imagen integrada en el documento original. Guárdalo para conservarla sin el archivo de origen.");
      } else if (status === "too-large") {
        setImageMessage("El documento superaría el límite de 12 MiB. Reduce la imagen o utiliza un documento más pequeño.");
      } else if (status === "edited") {
        setImageMessage("El documento se editó durante la lectura. No se insertó la imagen y se conservaron todos los cambios; inténtalo de nuevo.");
      } else {
        setImageMessage("La pestaña de destino se cerró o ya no admite la posición original. No se modificó ningún documento.");
      }
    } catch (error) {
      setImageMessage(error instanceof Error ? error.message : "No se pudo insertar la imagen.");
    }
  };

  const handleNewDocument = () => createDocument();

  const handleExportHtml = () => {
    const renderedBody = sheetRef.current ? sheetRef.current.innerHTML : "";
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(filename)} • BWJM Document</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b1120; color: #0f172a; padding: 2rem; display: flex; justify-content: center; }
    .bwjm-sheet { box-sizing: border-box; background: #ffffff; max-width: 860px; width: 100%; min-width: 0; padding: clamp(1rem, 5vw, 3rem); border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    h1 { font-size: 2rem; font-weight: 800; color: #0f172a; margin-bottom: 1.5rem; }
    h2 { font-size: 1.4rem; font-weight: 700; color: #1e293b; margin: 2rem 0 1rem; }
    p { font-size: 1.05rem; line-height: 1.7; color: #334155; margin-bottom: 1rem; }
    .math-display-box { display: flex; overflow-x: auto; margin: 1.5rem 0; padding: 1rem; background: #f8fafc; border-radius: 6px; }
    .math-display-box > * { flex: none; margin-inline: auto; }
    .bwjm-svg-plot > svg { display: block; max-inline-size: 100%; block-size: auto; }
  </style>
</head>
<body>
  <div class="bwjm-sheet">
    ${renderedBody}
  </div>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.replace(/\.(bwjm|jm|md)$/, "") + ".html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleNavigateOutline = (item: OutlineItem) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const lines = markdown.split("\n");
      let charIndex = 0;
      for (let i = 0; i < item.lineNumber - 1 && i < lines.length; i++) {
        charIndex += lines[i].length + 1;
      }
      const selectHeading = () => {
        textarea.focus();
        textarea.setSelectionRange(
          editorView.toVisibleOffset(charIndex, "start"),
          editorView.toVisibleOffset(charIndex + (lines[item.lineNumber - 1]?.length ?? 0), "end"),
        );
      };
      if (compactWorkspace) {
        setViewMode("editor");
        window.requestAnimationFrame(selectHeading);
      } else {
        selectHeading();
      }
    }
  };

  const handleCloseDocument = (id: string) => {
    const target = documents.find(item => item.id === id);
    if (target?.content !== target?.savedContent &&
      !window.confirm("El documento tiene cambios sin guardar. ¿Cerrar esta pestaña?")) return;
    closeDocument(id);
  };

  const handleSearchLocate = ({ start, end }: TextMatch) => {
    if (compactWorkspace) setViewMode("editor");
    else if (viewMode === "reader") setViewMode("split");
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(editorView.toVisibleOffset(start, "start"), editorView.toVisibleOffset(end, "end"));
      const row = markdown.slice(0, start).split("\n").length - 1;
      const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight) || 23;
      textarea.scrollTop = Math.max(0, row * lineHeight - textarea.clientHeight / 3);
    });
  };

  /** Central handler for all actions registered in Ribbon.tsx. */
  const handleRibbonAction = (id: RibbonAction): void => {
    const fence = String.fromCharCode(96).repeat(3);
    switch (id) {
      case "open": fileInputRef.current?.click(); break;
      case "save": handleSaveFile(); break;
      case "export-html": handleExportHtml(); break;
      case "h1": insertAtCursor("# "); break;
      case "h2": insertAtCursor("## "); break;
      case "h3": insertAtCursor("### "); break;
      case "bold": insertAtCursor("**", "**"); break;
      case "italic": insertAtCursor("*", "*"); break;
      case "code": insertAtCursor(String.fromCharCode(96), String.fromCharCode(96)); break;
      case "quote": insertAtCursor("> "); break;
      case "list": insertAtCursor(markdown.slice(0, editorView.toSourceOffset(textareaRef.current?.selectionStart ?? editorView.text.length)).endsWith("\n") ? "- " : "\n\n- "); break;
      case "rule": insertAtCursor("\n\n---\n\n"); break;
      case "formula": setIsFormulaModalOpen(true); break;
      case "graph": setIsChartModalOpen(true); break;
      case "table":
        insertAtCursor("\n\n| Columna 1 | Columna 2 |\n|---|---|\n| Dato 1 | Dato 2 |\n\n");
        break;
      case "picture": pickLocalImage(); break;
      case "equation": insertAtCursor("\n$\n\\int_0^1 f(x)\\,dx\n$\n"); break;
      case "inline-math": insertAtCursor("$", "$"); break;
      case "matrix": insertAtCursor("\n$\n\\begin{bmatrix}a & b \\\\ c & d\\end{bmatrix}\n$\n"); break;
      case "integral": insertAtCursor("\\int_{a}^{b} f(x)\\,dx"); break;
      case "slider": insertAtCursor("\n" + fence +
        "slider\nname: a\nmin: 0.1\nmax: 5\nstep: 0.1\ndefault: 1\n" + fence + "\n"); break;
      case "data-table":
        insertAtCursor("\n" + fence +
          "datatable\ncaption: Medición experimental\ncolumns: [Tiempo, Posición, Velocidad]\nunits: [s, m, m/s]\nrows:\n" +
          "  - [0, 0, 0]\n  - [1, 1.5, 3]\n  - [2, 6, 6]\nprecision: 3\n" +
          fence + "\n");
        break;
      case "vectorfield":
        insertAtCursor("\n" + fence +
          'vectorfield2d\nfield: ["-y", "x"]\nxDomain: [-3, 3]\nyDomain: [-3, 3]\ndensity: 12\n' + fence + "\n");
        break;
      case "riemann":
        openDocument(SAMPLE_LESSONS.riemann.filename, SAMPLE_LESSONS.riemann.content, "riemann"); break;
      case "view-editor": setViewMode("editor"); break;
      case "view-split": setViewMode("split"); break;
      case "view-reader": setViewMode("reader"); break;
      case "outline": setSidebarTab("outline"); setIsSidebarLeftOpen(true); break;
      case "inspector": setSidebarTab("inspector"); setIsSidebarLeftOpen(true); break;
      case "theme-linear": setTheme("linear"); break;
      case "theme-catppuccin": setTheme("catppuccin"); break;
      case "theme-tokyonight": setTheme("tokyonight"); break;
      case "commands": setIsCommandPaletteOpen(true); break;
    }
  };

  const commandsList: CommandItem[] = [
    {
      id: "insert-scientific-table",
      title: "Insertar tabla científica exportable",
      category: "Datos",
      action: () => insertAtCursor("\n\n```datatable\ncaption: Medición experimental\ncolumns: [Tiempo, Posición, Velocidad]\nunits: [s, m, m/s]\nrows:\n  - [0, 0, 0]\n  - [1, 1.5, 3]\n  - [2, 6, 6]\nprecision: 3\n```\n"),
    },
    {
      id: "insert-formula",
      title: "Insertar Fórmula Matemática",
      category: "Matemáticas",
      shortcut: "Ctrl+Shift+M",
      action: () => setIsFormulaModalOpen(true),
    },
    {
      id: "insert-chart",
      title: "Insertar Gráfica o Deslizador (Asistente)",
      category: "Gráficas",
      action: () => setIsChartModalOpen(true),
    },
    {
      id: "save-doc",
      title: "Guardar Documento",
      category: "Archivo",
      shortcut: "Ctrl+S",
      action: handleSaveFile,
    },
    {
      id: "open-doc",
      title: "Abrir Archivo (.bwjm)",
      category: "Archivo",
      shortcut: "Ctrl+O",
      action: () => fileInputRef.current?.click(),
    },
    {
      id: "export-html",
      title: "Exportar como HTML Interactivo",
      category: "Archivo",
      action: handleExportHtml,
    },
    {
      id: "mode-split",
      title: "Vista Dividida (Editor + Lector)",
      category: "Vista",
      action: () => setViewMode("split"),
    },
    {
      id: "mode-editor",
      title: "Modo Solo Editor",
      category: "Vista",
      action: () => setViewMode("editor"),
    },
    {
      id: "mode-reader",
      title: "Modo Solo Lector",
      category: "Vista",
      action: () => setViewMode("reader"),
    },
    {
      id: "toggle-outline",
      title: "Alternar Panel Izquierdo (Esquema/Variables)",
      category: "Paneles",
      action: () => setIsSidebarLeftOpen((prev) => !prev),
    },
    {
      id: "toggle-props",
      title: "Alternar Panel Derecho (Propiedades)",
      category: "Paneles",
      action: () => { setIsSidebarLeftOpen(true); setSidebarTab("inspector"); },
    },
    {
      id: "theme-linear",
      title: "Cambiar Tema a Linear Obsidian",
      category: "Tema",
      action: () => setTheme("linear"),
    },
    {
      id: "theme-catppuccin",
      title: "Cambiar Tema a Catppuccin Mocha",
      category: "Tema",
      action: () => setTheme("catppuccin"),
    },
    {
      id: "theme-tokyonight",
      title: "Cambiar Tema a Tokyo Night",
      category: "Tema",
      action: () => setTheme("tokyonight"),
    },
    {
      id: "load-lesson-1",
      title: "Cargar Lección: Área entre Curvas & Riemann",
      category: "Lecciones",
      action: () => {
        openDocument(SAMPLE_LESSONS.riemann.filename, SAMPLE_LESSONS.riemann.content, "riemann");
      },
    },
    {
      id: "load-lesson-2",
      title: "Cargar Lección: Sólidos de Revolución (3π)",
      category: "Lecciones",
      action: () => {
        openDocument(SAMPLE_LESSONS.revolution.filename, SAMPLE_LESSONS.revolution.content, "revolution");
      },
    },
    {
      id: "load-lesson-3",
      title: "Cargar Lección: Superficie 3D y Oscilador Armónico",
      category: "Lecciones",
      action: () => {
        openDocument(SAMPLE_LESSONS.surface.filename, SAMPLE_LESSONS.surface.content, "surface");
      },
    },
    {
      id: "load-lesson-4",
      title: "Cargar Lección: Cinemática Espacial & Marco Frenet (TNB)",
      category: "Lecciones",
      action: () => {
        openDocument(SAMPLE_LESSONS.vector_calculus.filename, SAMPLE_LESSONS.vector_calculus.content, "vector_calculus");
      },
    },
    {
      id: "load-lesson-5",
      title: "Cargar Lección: Campos Vectoriales 2D & Teorema de Green",
      category: "Lecciones",
      action: () => {
        openDocument(SAMPLE_LESSONS.vector_field.filename, SAMPLE_LESSONS.vector_field.content, "vector_field");
      },
    },
  ];

  useEffect(() => {
    clearTimers();
    clearRenderers();

    const previousVariables = coreRef.current?.getVariables() ?? {};
    const previousCore = coreRef.current;
    coreRef.current = new MathMDCore(doc);
    // Keep local values after unrelated text edits when the chart ID stays stable.
    doc.children.forEach(node => {
      if (!supportsAdaptiveParameters(node) || !node.paramControls?.enabled) return;
      const previous = previousCore?.getGraphParameters(node.id) ?? {};
      node.paramControls.parameters.forEach(parameter => {
        const value = previous[parameter.name];
        if (value !== undefined && value >= parameter.min && value <= parameter.max) {
          coreRef.current?.setGraphParameter(node.id, parameter.name, value);
        }
      });
    });
    Object.entries(previousVariables).forEach(([name, value]) => {
      if (coreRef.current?.getVariable(name) !== undefined && Number.isFinite(value)) {
        coreRef.current.setVariable(name, value);
      }
    });
    const container = sheetRef.current;
    if (!container) return;

    container.replaceChildren();

    const sheet = document.createElement("article");
    sheet.className = "bwjm-sheet";

    const segments = parseDocumentSegments(markdown, doc.children, doc.diagnostics);
    let inlinePlaybackMounted = false;

    const svgSizeHandlers = new Map<Element, (width: number) => void>();
    const pendingSvgSizes = new Map<Element, number>();
    let svgResizeFrame: number | undefined;
    const svgResizeObserver = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(entries => {
      for (const entry of entries) pendingSvgSizes.set(entry.target, entry.contentRect.width);
      if (svgResizeFrame !== undefined) return;
      svgResizeFrame = window.requestAnimationFrame(() => {
        svgResizeFrame = undefined;
        pendingSvgSizes.forEach((width, element) => svgSizeHandlers.get(element)?.(width));
        pendingSvgSizes.clear();
      });
    });

    const mountSvg = (
      parent: HTMLElement, node: MathMDNode, width: number, height: number,
      initialData = coreRef.current?.getNodeData(node.id) ?? node,
    ) => {
      const mount = document.createElement("div");
      mount.id = "mount-" + node.id;
      mount.className = "bwjm-svg-plot";
      parent.appendChild(mount);

      const renderer = new SVGRenderer(mount, width, height);
      svgRenderersRef.current.set(node.id, renderer);
      renderer.render(initialData);

      let renderedWidth = width;
      svgSizeHandlers.set(mount, availableWidth => {
        const nextWidth = Math.min(width, Math.floor(availableWidth));
        if (nextWidth <= 0 || nextWidth === renderedWidth) return;
        renderedWidth = nextWidth;
        const nextHeight = Math.max(240, Math.round(nextWidth * height / width));
        renderer.resize(nextWidth, nextHeight);
        renderer.render(coreRef.current?.getNodeData(node.id) ?? initialData);
      });
      svgResizeObserver?.observe(mount);
    };

    /** Recompute only the affected chart, not the editor or all other graphs. */
    const refreshParameterizedGraph = (id: string): void => {
      const engine = coreRef.current;
      if (!engine) return;
      const data = engine.getNodeData(id);
      const svg = svgRenderersRef.current.get(id);
      if (svg) svg.render(data);
      const plotly = plotlyRenderersRef.current.get(id);
      if (plotly) {
        const scope = engine.getGraphScope(id);
        const currentT = scope["t"] ?? data.tDomain?.[1] ?? data.tDomain?.[0];
        const extra = data.type === "curve3d" ? {
          particle: data.animated === true,
          showVectors: data.animated === true && data.showVectors === true,
          showTNB: data.animated === true && data.showTNB === true,
          showLegend: data.showLegend === true,
        } : {};
        plotly.render({ ...data, scope, currentT, ...extra });
      }
      if (data.type === "vector2d" || data.type === "vector3d") {
        const report = sheet.querySelector<HTMLElement>("#node-" + id + " .bwjm-vector-report");
        if (report) updateVectorStudyReport(report, data);
      }
      if (data.type === "calculusviz") {
        const report = sheet.querySelector<HTMLElement>("#node-" + id + " .bwjm-calculus-report");
        if (report) {
          const result = document.createElement("strong");
          result.textContent = data.error ? "Error: " + data.error
            : data.valueLabel + ": " + (Number.isFinite(data.value)
              ? Number(data.value.toPrecision(8)) : "No determinado") +
              (data.unit === "valor" ? "" : " " + data.unit);
          report.replaceChildren(result);
          if (!data.error) {
            const method = document.createElement("small");
            method.textContent = data.method + " · resultado numérico aproximado";
            report.appendChild(method);
            if (data.comparison) {
              const second = document.createElement("div");
              second.textContent = data.comparison.label + ": " +
                Number(data.comparison.value.toPrecision(8)) +
                " · Diferencia: " + Number(data.comparison.difference.toPrecision(4));
              report.appendChild(second);
            }
            (data.warnings ?? []).forEach((message: string) => {
              const line = document.createElement("p");
              line.className = "bwjm-calculus-warning";
              line.textContent = "⚠ " + message;
              report.appendChild(line);
            });
          }
        }
      }
    };

    const markdownDefinitions = collectMarkdownDefinitions(markdown);
    for (const segment of segments) {
      if (segment.kind === "prose" && segment.content) {
        const proseDiv = document.createElement("div");
        proseDiv.className = "bwjm-prose-block";
        renderProseText(segment.content, proseDiv, markdownDefinitions);
        sheet.appendChild(proseDiv);
      } else if (segment.kind === "diagnostic" && segment.diagnostic) {
        const diagBox = document.createElement("div");
        diagBox.className = "bwjm-diagnostic-box";
        diagBox.innerHTML = `
          <div class="bwjm-diagnostic-title">SINTAXIS INVÁLIDA [${escapeHtml(segment.diagnostic.blockType || "bloque")}]</div>
          <div class="bwjm-diagnostic-msg">${escapeHtml(segment.diagnostic.message)}</div>
          <div class="bwjm-diagnostic-code">${escapeHtml(segment.content || "")}</div>
        `;
        sheet.appendChild(diagBox);
      } else if (segment.kind === "mathmd" && segment.node) {
        const node = segment.node;
        const card = document.createElement("div");
        card.className = "bwjm-node-card";
        card.id = `node-${node.id}`;

        const cardHeader = document.createElement("div");
        cardHeader.className = "bwjm-node-header";
        cardHeader.innerHTML = `
          <span class="bwjm-node-tag">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            ${escapeHtml(node.type.toUpperCase())} • ${escapeHtml(node.id)}
          </span>
        `;
        if (node.type === "plot2d" || node.type === "surface3d" || node.type === "curve3d" || node.type === "parametric2d") {
          const formula = document.createElement("div");
          formula.className = "bwjm-node-equation";
          const latex = node.type === "curve3d"
            ? "\\mathbf{r}(t)=\\left(" + [node.x, node.y, node.z].map(expressionToLatex).join(",\\;") + "\\right)"
            : node.type === "parametric2d"
              ? "\\mathbf{r}(t)=\\left(" + [node.x, node.y].map(expressionToLatex).join(",\\;") + "\\right)"
              : (node.type === "surface3d" ? "z=" : "y=") + expressionToLatex(node.equation);
          formula.innerHTML = renderMathToString(latex, false);
          formula.title = node.type === "curve3d" ? [node.x, node.y, node.z].join(" , ")
            : node.type === "parametric2d" ? [node.x, node.y].join(" , ") : node.equation;
          cardHeader.appendChild(formula);
        }
        card.appendChild(cardHeader);

        const cardBody = document.createElement("div");
        cardBody.className = "bwjm-node-body";
        const crossSummary = node.type === "crossproduct" ? createCrossProductSummary() : undefined;
        const crossStepsKey = activeId + ":" + node.range.start.offset;
        const crossReport = node.type === "crossproduct" && node.showSteps !== undefined
          ? createCrossProductReport(
              node.showSteps,
              openCrossProductStepsRef.current.has(crossStepsKey),
              open => {
                if (open) openCrossProductStepsRef.current.add(crossStepsKey);
                else openCrossProductStepsRef.current.delete(crossStepsKey);
              },
              () => {
                setMarkdown(previous => updateGraphOption(
                  previous, node.range, node.type, "reverseOrder", !node.reverseOrder));
              },
            ) : undefined;
        const determinant = node.type === "crossproduct" && node.showDeterminant
          ? createCrossProductDeterminant() : undefined;

        // Graph settings persist in the selected code fence, avoiding transient-only UI state.
        if (supportsAdaptiveParameters(node) || node.type === "crossproduct" ||
          node.type === "line3d" || node.type === "plane3d" ||
          ((node.type === "vector2d" || node.type === "vector3d") && Boolean(node.mode))) {
          const options: Array<[string, string]> = node.type === "curve3d" ? [
            ["animated", "Animar partícula"],
            ["showVectors", "Vectores velocidad y aceleración"],
            ["showTNB", "Triedro de Frenet (T, N, B)"],
            ["showLegend", "Mostrar leyenda"],
            ["showInfo", "Mostrar panel científico"],
          ] : node.type === "surface3d" ? [
            ["contours", "Curvas de nivel / cotas"],
            ["animated", "Animar (si la ecuación depende de t)"],
            ["showInfo", "Mostrar ficha de ecuación y dominio"],
          ] : node.type === "parametric2d" ? [
            ["animated", "Animar partícula"],
            ["showTrail", "Estela"],
            ["showVelocity", "Velocidad"],
            ["showAcceleration", "Aceleración"],
            ["showTangent", "Tangente"],
            ["showNormal", "Normal"],
            ["followParticle", "Seguir partícula"],
          ] : node.type === "crossproduct" ? [
            ["showPlane", "Plano generado"],
            ["showNormal", "Normal orientada"],
            ["showArea", "Área del paralelogramo"],
            ["showTriangle", "Triángulo sombreado (1/2 |u×v|)"],
            ["showVolume", "Volumen paralelepípedo (u·(v×w))"],
            ["showCollapse", "Animar colapso paralelepípedo"],
            ["showSignChallenge", "Desafío visual de signos"],
            ["showSteps", "Mostrar procedimiento matemático"],
            ["reverseOrder", "Invertir orden"],
            ["showDeterminant", "Mostrar determinante i, j, k"],
            ["showRightHand", "Regla de la mano derecha"],
            ["showAnticommutative", "Superponer normal opuesta (anticonmutatividad)"],
            ["showDistributive", "Distribución sobre suma u × (v + w)"],
            ["showIdentities", "Inspector de identidades guiadas"],
          ] : node.type === "line3d" ? [
            ["showPoint", "Mostrar punto P"],
            ["showDirection", "Mostrar vector director v"],
            ["showSegment", "Mostrar segmento"],
            ["showSteps", "Mostrar procedimiento matemático"],
          ] : node.type === "plane3d" ? [
            ["showPoint", "Mostrar punto P"],
            ["showNormal", "Mostrar normal n"],
            ["showIntercepts", "Mostrar interceptos ejes"],
            ["showSteps", "Mostrar procedimiento matemático"],
          ] : (node.type === "vector2d" || node.type === "vector3d") ? [
            ["showSteps", "Mostrar procedimiento matemático"],
          ] : [];
          const details = document.createElement("details");
          details.className = "bwjm-graph-settings";
          const settingsKey = node.type + ":" + node.range.start.offset;
          details.open = openGraphSettingsRef.current.has(settingsKey);
          const summary = document.createElement("summary");
          summary.textContent = "Personalizar gráfica";
          details.appendChild(summary);
          const controls = document.createElement("div");
          controls.className = "bwjm-graph-settings-controls";
          options.forEach(([key, label]) => {
            const wrapper = document.createElement("label");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            const configured = (node as unknown as Record<string, unknown>)[key];
            const defaultOn = node.type === "crossproduct" ? ["showPlane", "showNormal", "showArea"].includes(key) :
              key === "showSteps" || (key === "animated" && node.type === "parametric2d");
            checkbox.checked = typeof configured === "boolean" ? configured : defaultOn;
            checkbox.setAttribute("aria-label", label);
            checkbox.onchange = () => {
              if (node.type !== "curve3d" && node.type !== "surface3d" &&
                node.type !== "parametric2d" && node.type !== "vector2d" &&
                node.type !== "vector3d" && node.type !== "crossproduct" &&
                node.type !== "line3d" && node.type !== "plane3d") return;
              openGraphSettingsRef.current.add(settingsKey);
              setMarkdown(previous => updateGraphOption(
                previous, node.range, node.type, key, checkbox.checked));
            };
            wrapper.append(checkbox, document.createTextNode(label));
            controls.appendChild(wrapper);
          });
          details.addEventListener("toggle", () => {
            if (details.open) openGraphSettingsRef.current.add(settingsKey);
            else openGraphSettingsRef.current.delete(settingsKey);
          });
          // Slider para collapseFactor en crossproduct (animación de colapso T017)
          if (node.type === "crossproduct" && node.showCollapse) {
            const collapseRow = document.createElement("label");
            collapseRow.className = "bwjm-graph-collapse-factor";
            const textLabel = document.createElement("span");
            textLabel.textContent = "Factor de colapso";
            const collapseRange = document.createElement("input");
            collapseRange.type = "range";
            collapseRange.min = "0";
            collapseRange.max = "1";
            collapseRange.step = "0.01";
            collapseRange.value = String(node.collapseFactor ?? 0);
            collapseRange.setAttribute("aria-label", "Factor de colapso del paralelepípedo");
            const collapseValue = document.createElement("output");
            collapseValue.textContent = `${Math.round((node.collapseFactor ?? 0) * 100)}%`;
            collapseRange.oninput = () => { 
              collapseValue.textContent = `${Math.round(Number(collapseRange.value) * 100)}%`; 
            };
            collapseRange.onchange = () => {
              openGraphSettingsRef.current.add(settingsKey);
              setMarkdown(previous => updateGraphOption(
                previous, node.range, node.type, "collapseFactor", Number(collapseRange.value)));
            };
            collapseRow.append(textLabel, collapseRange, collapseValue);
            controls.appendChild(collapseRow);
            
            // Selector de objetivo de colapso (zero vs coplanar)
            const targetRow = document.createElement("label");
            targetRow.className = "bwjm-graph-collapse-target";
            const targetLabel = document.createElement("span");
            targetLabel.textContent = "Objetivo colapso";
            const targetSelect = document.createElement("select");
            targetSelect.setAttribute("aria-label", "Objetivo de colapso");
            const targetOptions = [
              { value: "coplanar", label: "Coplanar (w en plano u,v)" },
              { value: "zero", label: "Vector cero (w → 0)" },
            ];
            targetOptions.forEach(opt => {
              const option = document.createElement("option");
              option.value = opt.value;
              option.textContent = opt.label;
              targetSelect.appendChild(option);
            });
            targetSelect.value = node.collapseTarget ?? "coplanar";
            targetSelect.onchange = () => {
              openGraphSettingsRef.current.add(settingsKey);
              setMarkdown(previous => updateGraphOption(
                previous, node.range, node.type, "collapseTarget", targetSelect.value));
            };
            targetRow.append(targetLabel, targetSelect);
            controls.appendChild(targetRow);
          }

          // Selector de modo de desafío de signos (T019)
          if (node.type === "crossproduct" && node.showSignChallenge) {
            const modeRow = document.createElement("label");
            modeRow.className = "bwjm-graph-sign-challenge-mode";
            const modeLabel = document.createElement("span");
            modeLabel.textContent = "Modo desafío";
            const modeSelect = document.createElement("select");
            modeSelect.setAttribute("aria-label", "Modo de desafío de signos");
            const modeOptions = [
              { value: "random", label: "Aleatorio (nuevos vectores cada vez)" },
              { value: "fixed", label: "Fijo (usar u, v actuales)" },
              { value: "quiz", label: "Quiz (preguntas secuenciales)" },
            ];
            modeOptions.forEach(opt => {
              const option = document.createElement("option");
              option.value = opt.value;
              option.textContent = opt.label;
              modeSelect.appendChild(option);
            });
            modeSelect.value = node.signChallengeMode ?? "random";
            modeSelect.onchange = () => {
              openGraphSettingsRef.current.add(settingsKey);
              setMarkdown(previous => updateGraphOption(
                previous, node.range, node.type, "signChallengeMode", modeSelect.value));
            };
            modeRow.append(modeLabel, modeSelect);
            controls.appendChild(modeRow);

            // Seed input para modo aleatorio reproducible
            const seedRow = document.createElement("label");
            seedRow.className = "bwjm-graph-sign-challenge-seed";
            const seedLabel = document.createElement("span");
            seedLabel.textContent = "Semilla aleatoria";
            const seedInput = document.createElement("input");
            seedInput.type = "number";
            seedInput.min = "0";
            seedInput.max = "2147483647";
            seedInput.step = "1";
            seedInput.value = String(node.signChallengeSeed ?? Math.floor(Math.random() * 1000000));
            seedInput.setAttribute("aria-label", "Semilla para generación aleatoria");
            seedInput.onchange = () => {
              openGraphSettingsRef.current.add(settingsKey);
              setMarkdown(previous => updateGraphOption(
                previous, node.range, node.type, "signChallengeSeed", Number(seedInput.value)));
            };
            seedRow.append(seedLabel, seedInput);
            controls.appendChild(seedRow);
          }
          if (node.type === "crossproduct") {
            controls.appendChild(createCrossProductEditor(node, {
              preview: (u, v) => {
                // The live preview and committed document use the same engine
                // calculations. Never recalculate areas or volumes in the DOM.
                const previewData = prepareCrossProductNodeData({ ...node, u, v });
                plotlyRenderersRef.current.get(node.id)?.render(previewData);
                crossSummary?.update(previewData);
                if (previewData.crossStudy) crossReport?.update(previewData.crossStudy);
                if (previewData.crossDeterminant) determinant?.update(previewData.crossDeterminant);
              },
              save: (key, value) => {
                openGraphSettingsRef.current.add(settingsKey);
                setMarkdown(previous => updateCrossProductVector(previous, node.range, key, value));
              },
            }));
          }
          // Selector de modo para plane3d (T031-T048)
          if (node.type === "plane3d") {
            const modeRow = document.createElement("label");
            modeRow.className = "bwjm-graph-plane3d-mode";
            const modeLabel = document.createElement("span");
            modeLabel.textContent = "Modo de plano";
            const modeSelect = document.createElement("select");
            modeSelect.setAttribute("aria-label", "Modo de definición del plano");
            const modeOptions = [
              { value: "point-normal", label: "Punto + Normal (punto + normal)" },
              { value: "three-points", label: "3 Puntos (A, B, C no colineales)" },
              { value: "point-vectors", label: "Punto + 2 Vectores (P + u, v)" },
              { value: "parametric", label: "Paramétrico (P + s·u + t·v)" },
              { value: "general", label: "Ecuación General (Ax + By + Cz + D = 0)" },
            ];
            modeOptions.forEach(opt => {
              const option = document.createElement("option");
              option.value = opt.value;
              option.textContent = opt.label;
              modeSelect.appendChild(option);
            });
            modeSelect.value = node.mode ?? "point-normal";
            modeSelect.onchange = () => {
              openGraphSettingsRef.current.add(settingsKey);
              setMarkdown(previous => updateGraphOption(
                previous, node.range, node.type, "mode", modeSelect.value));
            };
            modeRow.append(modeLabel, modeSelect);
            controls.appendChild(modeRow);
          }

          // Controles específicos para cada modo de plane3d
          if (node.type === "plane3d") {
            const mode = node.mode ?? "point-normal";
            
            if (mode === "point-normal") {
              // point + normal inputs
              const addVectorInput = (key: "point" | "normal", labelText: string, defaultVal: number[]) => {
                const row = document.createElement("label");
                row.className = `bwjm-graph-plane3d-${key}`;
                const label = document.createElement("span");
                label.textContent = labelText;
                const input = document.createElement("input");
                input.type = "text";
                input.value = (node[key] ?? [0, 0, 0]).join(", ");
                input.placeholder = "x, y, z";
                input.setAttribute("aria-label", labelText);
                input.onchange = () => {
                  openGraphSettingsRef.current.add(settingsKey);
                  const vals = input.value.split(",").map(v => parseFloat(v.trim()));
                  if (vals.length === 3 && vals.every(Number.isFinite)) {
                    setMarkdown(previous => updateGraphOption(
                      previous, node.range, node.type, key, vals as [number, number, number]));
                  }
                };
                row.append(label, input);
                controls.appendChild(row);
              };
              addVectorInput("point", "Punto P", [0, 0, 0]);
              addVectorInput("normal", "Normal n", [1, 1, 1]);
            } else if (mode === "three-points") {
              const addPointInput = (key: "pointA" | "pointB" | "pointC", labelText: string, defaultVal: number[]) => {
                const row = document.createElement("label");
                row.className = `bwjm-graph-plane3d-${key}`;
                const label = document.createElement("span");
                label.textContent = labelText;
                const input = document.createElement("input");
                input.type = "text";
                input.value = (node[key] ?? [0, 0, 0]).join(", ");
                input.placeholder = "x, y, z";
                input.setAttribute("aria-label", labelText);
                input.onchange = () => {
                  openGraphSettingsRef.current.add(settingsKey);
                  const vals = input.value.split(",").map(v => parseFloat(v.trim()));
                  if (vals.length === 3 && vals.every(Number.isFinite)) {
                    setMarkdown(previous => updateGraphOption(
                      previous, node.range, node.type, key, vals as [number, number, number]));
                  }
                };
                row.append(label, input);
                controls.appendChild(row);
              };
              addPointInput("pointA", "Punto A", [0, 0, 0]);
              addPointInput("pointB", "Punto B", [1, 0, 0]);
              addPointInput("pointC", "Punto C", [0, 1, 0]);
            } else if (mode === "point-vectors" || mode === "parametric") {
              const addVectorInput = (key: "point" | "vectorU" | "vectorV", labelText: string, defaultVal: number[]) => {
                const row = document.createElement("label");
                row.className = `bwjm-graph-plane3d-${key}`;
                const label = document.createElement("span");
                label.textContent = labelText;
                const input = document.createElement("input");
                input.type = "text";
                input.value = (node[key] ?? [0, 0, 0]).join(", ");
                input.placeholder = "x, y, z";
                input.setAttribute("aria-label", labelText);
                input.onchange = () => {
                  openGraphSettingsRef.current.add(settingsKey);
                  const vals = input.value.split(",").map(v => parseFloat(v.trim()));
                  if (vals.length === 3 && vals.every(Number.isFinite)) {
                    setMarkdown(previous => updateGraphOption(
                      previous, node.range, node.type, key, vals as [number, number, number]));
                  }
                };
                row.append(label, input);
                controls.appendChild(row);
              };
              addVectorInput("point", "Punto P", [0, 0, 0]);
              addVectorInput("vectorU", "Vector u", [1, 0, 0]);
              addVectorInput("vectorV", "Vector v", [0, 1, 0]);
            } else if (mode === "general") {
              const addCoeffInput = (key: "A" | "B" | "C" | "D", labelText: string, defaultVal: number) => {
                const row = document.createElement("label");
                row.className = `bwjm-graph-plane3d-${key.toLowerCase()}`;
                const label = document.createElement("span");
                label.textContent = labelText;
                const input = document.createElement("input");
                input.type = "number";
                input.step = "0.1";
                input.value = String(node[key] ?? defaultVal);
                input.setAttribute("aria-label", labelText);
                input.onchange = () => {
                  openGraphSettingsRef.current.add(settingsKey);
                  setMarkdown(previous => updateGraphOption(
                    previous, node.range, node.type, key, Number(input.value)));
                };
                row.append(label, input);
                controls.appendChild(row);
              };
              addCoeffInput("A", "A", 1);
              addCoeffInput("B", "B", 0);
              addCoeffInput("C", "C", 0);
              addCoeffInput("D", "D", 0);
            }
          }
          // Controles numéricos para line3d (T021-T026)
          if (node.type === "line3d") {
            // tDomain min
            const tMinRow = document.createElement("label");
            tMinRow.className = "bwjm-graph-line3d-tmin";
            const tMinLabel = document.createElement("span");
            tMinLabel.textContent = "t mín";
            const tMinInput = document.createElement("input");
            tMinInput.type = "number";
            tMinInput.step = "0.1";
            tMinInput.value = String(node.tDomain?.[0] ?? -10);
            tMinInput.setAttribute("aria-label", "Valor mínimo del parámetro t");
            tMinInput.onchange = () => {
              openGraphSettingsRef.current.add(settingsKey);
              const newTDomain = [Number(tMinInput.value), node.tDomain?.[1] ?? 10] as [number, number];
              setMarkdown(previous => updateGraphOption(
                previous, node.range, node.type, "tDomain", newTDomain));
            };
            tMinRow.append(tMinLabel, tMinInput);
            controls.appendChild(tMinRow);

            // tDomain max
            const tMaxRow = document.createElement("label");
            tMaxRow.className = "bwjm-graph-line3d-tmax";
            const tMaxLabel = document.createElement("span");
            tMaxLabel.textContent = "t máx";
            const tMaxInput = document.createElement("input");
            tMaxInput.type = "number";
            tMaxInput.step = "0.1";
            tMaxInput.value = String(node.tDomain?.[1] ?? 10);
            tMaxInput.setAttribute("aria-label", "Valor máximo del parámetro t");
            tMaxInput.onchange = () => {
              openGraphSettingsRef.current.add(settingsKey);
              const newTDomain = [node.tDomain?.[0] ?? -10, Number(tMaxInput.value)] as [number, number];
              setMarkdown(previous => updateGraphOption(
                previous, node.range, node.type, "tDomain", newTDomain));
            };
            tMaxRow.append(tMaxLabel, tMaxInput);
            controls.appendChild(tMaxRow);

            // paramName
            const paramRow = document.createElement("label");
            paramRow.className = "bwjm-graph-line3d-param";
            const paramLabel = document.createElement("span");
            paramLabel.textContent = "Parámetro";
            const paramInput = document.createElement("input");
            paramInput.type = "text";
            paramInput.value = node.paramName ?? "t";
            paramInput.maxLength = 1;
            paramInput.setAttribute("aria-label", "Nombre del parámetro (t, s, u, etc.)");
            paramInput.onchange = () => {
              openGraphSettingsRef.current.add(settingsKey);
              setMarkdown(previous => updateGraphOption(
                previous, node.range, node.type, "paramName", paramInput.value));
            };
            paramRow.append(paramLabel, paramInput);
            controls.appendChild(paramRow);
          }

          // Controles numéricos para plane3d (T031-T034)
          if (node.type === "plane3d") {
            // xDomain min
            const xMinRow = document.createElement("label");
            xMinRow.className = "bwjm-graph-plane3d-xmin";
            const xMinLabel = document.createElement("span");
            xMinLabel.textContent = "x mín";
            const xMinInput = document.createElement("input");
            xMinInput.type = "number";
            xMinInput.step = "0.5";
            xMinInput.value = String(node.xDomain?.[0] ?? -5);
            xMinInput.setAttribute("aria-label", "Límite mínimo del dominio x");
            xMinInput.onchange = () => {
              openGraphSettingsRef.current.add(settingsKey);
              const newXDomain = [Number(xMinInput.value), node.xDomain?.[1] ?? 5] as [number, number];
              setMarkdown(previous => updateGraphOption(
                previous, node.range, node.type, "xDomain", newXDomain));
            };
            xMinRow.append(xMinLabel, xMinInput);
            controls.appendChild(xMinRow);

            // xDomain max
            const xMaxRow = document.createElement("label");
            xMaxRow.className = "bwjm-graph-plane3d-xmax";
            const xMaxLabel = document.createElement("span");
            xMaxLabel.textContent = "x máx";
            const xMaxInput = document.createElement("input");
            xMaxInput.type = "number";
            xMaxInput.step = "0.5";
            xMaxInput.value = String(node.xDomain?.[1] ?? 5);
            xMaxInput.setAttribute("aria-label", "Límite máximo del dominio x");
            xMaxInput.onchange = () => {
              openGraphSettingsRef.current.add(settingsKey);
              const newXDomain = [node.xDomain?.[0] ?? -5, Number(xMaxInput.value)] as [number, number];
              setMarkdown(previous => updateGraphOption(
                previous, node.range, node.type, "xDomain", newXDomain));
            };
            xMaxRow.append(xMaxLabel, xMaxInput);
            controls.appendChild(xMaxRow);

            // yDomain min
            const yMinRow = document.createElement("label");
            yMinRow.className = "bwjm-graph-plane3d-ymin";
            const yMinLabel = document.createElement("span");
            yMinLabel.textContent = "y mín";
            const yMinInput = document.createElement("input");
            yMinInput.type = "number";
            yMinInput.step = "0.5";
            yMinInput.value = String(node.yDomain?.[0] ?? -5);
            yMinInput.setAttribute("aria-label", "Límite mínimo del dominio y");
            yMinInput.onchange = () => {
              openGraphSettingsRef.current.add(settingsKey);
              const newYDomain = [Number(yMinInput.value), node.yDomain?.[1] ?? 5] as [number, number];
              setMarkdown(previous => updateGraphOption(
                previous, node.range, node.type, "yDomain", newYDomain));
            };
            yMinRow.append(yMinLabel, yMinInput);
            controls.appendChild(yMinRow);

            // yDomain max
            const yMaxRow = document.createElement("label");
            yMaxRow.className = "bwjm-graph-plane3d-ymax";
            const yMaxLabel = document.createElement("span");
            yMaxLabel.textContent = "y máx";
            const yMaxInput = document.createElement("input");
            yMaxInput.type = "number";
            yMaxInput.step = "0.5";
            yMaxInput.value = String(node.yDomain?.[1] ?? 5);
            yMaxInput.setAttribute("aria-label", "Límite máximo del dominio y");
            yMaxInput.onchange = () => {
              openGraphSettingsRef.current.add(settingsKey);
              const newYDomain = [node.yDomain?.[0] ?? -5, Number(yMaxInput.value)] as [number, number];
              setMarkdown(previous => updateGraphOption(
                previous, node.range, node.type, "yDomain", newYDomain));
            };
            yMaxRow.append(yMaxLabel, yMaxInput);
            controls.appendChild(yMaxRow);
          }

          // A single source of truth: all curve layers and numeric preferences
          // are edited here and persisted in the selected .bwjm block.
          if (node.type === "parametric2d") {
            const trailRow = document.createElement("label");
            trailRow.className = "bwjm-graph-trail-length";
            const textLabel = document.createElement("span");
            textLabel.textContent = "Longitud de estela";
            const trailRange = document.createElement("input");
            trailRange.type = "range";
            trailRange.min = "2";
            trailRange.max = String(Math.min(500, node.samples ?? 200));
            trailRange.step = "1";
            trailRange.value = String(Math.min(Number(trailRange.max),
              Math.max(2, node.trailLength ?? 100)));
            trailRange.setAttribute("aria-label", "Longitud de estela");
            const trailValue = document.createElement("output");
            trailValue.textContent = trailRange.value;
            trailRange.oninput = () => { trailValue.textContent = trailRange.value; };
            trailRange.onchange = () => {
              openGraphSettingsRef.current.add(settingsKey);
              setMarkdown(previous => updateGraphNumericOption(
                previous, node.range, "parametric2d", "trailLength",
                Number(trailRange.value)));
            };
            trailRow.append(textLabel, trailRange, trailValue);
            controls.appendChild(trailRow);
          }
          if (supportsAdaptiveParameters(node)) {
          const editor = createAdaptiveParameterEditor(node, {
            save: config => {
              openGraphSettingsRef.current.add(settingsKey);
              setMarkdown(previous => writeGraphParameterControls(
                previous, node.range, node.type, config));
            },
            current: name => coreRef.current?.getGraphParameters(node.id)[name],
            update: (name, value) => {
              if (coreRef.current?.setGraphParameter(node.id, name, value)) {
                refreshParameterizedGraph(node.id);
              }
            },
            updateMany: changes => {
              const engine = coreRef.current;
              if (!engine) return;
              let changed = false;
              changes.forEach(([name, value]) => {
                changed = engine.setGraphParameter(node.id, name, value) || changed;
              });
              if (changed) refreshParameterizedGraph(node.id);
            },
          });
          parameterEditorDisposersRef.current.push(editor.dispose);
          controls.appendChild(editor.element);
          }
          details.appendChild(controls);
          cardBody.appendChild(details);
        }

        try {
        if (node.type === "datatable" || node.type === "functiontable") {
          const tableNode = coreRef.current?.getNodeData(node.id) as DataTableNode | FunctionTableNode & { rows: Array<Array<string | number | boolean | null>> };
          const tableWrapper = document.createElement("div");
          tableWrapper.className = "bwjm-table-scroll";
          const table = document.createElement("table");
          table.className = "bwjm-scientific-table";
          if (tableNode.caption) {
            const caption = document.createElement("caption");
            caption.textContent = tableNode.caption;
            table.appendChild(caption);
          }
          const thead = document.createElement("thead");
          const headerRow = document.createElement("tr");
          tableNode.columns.forEach((name, col) => {
            const th = document.createElement("th");
            th.scope = "col";
            th.textContent = name;
            if (tableNode.units?.[col]) {
              const unit = document.createElement("small");
              unit.textContent = " [" + tableNode.units[col] + "]";
              th.appendChild(unit);
            }
            headerRow.appendChild(th);
          });
          thead.appendChild(headerRow);
          table.appendChild(thead);
          const tbody = document.createElement("tbody");
          renderTableBody(tbody, tableNode.rows, tableNode.precision);
          table.appendChild(tbody);
          tableWrapper.appendChild(table);
          const toolbar = document.createElement("div");
          toolbar.className = "bwjm-table-actions";
          const formats = ["csv", "tsv", "json"] as const;
          formats.forEach(format => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = "↓ " + format.toUpperCase();
            button.setAttribute("aria-label", "Exportar tabla a " + format.toUpperCase());
            button.addEventListener("click", () => {
              const live = coreRef.current?.getNodeData(node.id) as typeof tableNode ?? tableNode;
              const data = serializeScientificTable(live.columns, live.rows, format);
              const contentType = format === "json" ? "application/json" : "text/plain";
              const blob = new Blob([data], { type: contentType + ";charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = (tableNode.id || "tabla") + "." + format;
              anchor.click();
              URL.revokeObjectURL(url);
            });
            toolbar.appendChild(button);
          });
          const copy = document.createElement("button");
          copy.type = "button";
          copy.textContent = "Copiar TSV";
          copy.addEventListener("click", () => {
            const live = coreRef.current?.getNodeData(node.id) as typeof tableNode ?? tableNode;
            const data = serializeScientificTable(live.columns, live.rows, "tsv");
            void navigator.clipboard?.writeText(data);
          });
          toolbar.appendChild(copy);
          cardBody.appendChild(toolbar);
          cardBody.appendChild(tableWrapper);
        } else if (node.type === "statistics") {
          const data = coreRef.current?.getNodeData(node.id);
          const report = document.createElement("div");
          report.className = "bwjm-statistics-panel";
          renderStatisticsPanel(report, data);
          cardBody.appendChild(report);
        } else if (node.type === "datachart") {
          const mount = document.createElement("div");
          mount.style.width = "100%";
          mount.style.height = "400px";
          cardBody.appendChild(mount);
          const renderer = new PlotlyRenderer(mount);
          plotlyRenderersRef.current.set(node.id, renderer);
          renderer.render(coreRef.current.getNodeData(node.id) as any);
        } else if (node.type === "slider") {
          const sliderNode = node as SliderNode;
          const row = document.createElement("div");
          row.className = "bwjm-slider-row";

          const playBtn = document.createElement("button");
          playBtn.className = "bwjm-play-btn";
          playBtn.title = "Animar barrido cinemático";
          playBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;

          let isPlaying = false;
          playBtn.onclick = () => {
            if (isPlaying) {
              const timerId = activeTimersRef.current.get(sliderNode.name);
              if (timerId) {
                window.clearInterval(timerId);
                activeTimersRef.current.delete(sliderNode.name);
              }
              isPlaying = false;
              playBtn.classList.remove("playing");
              playBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
            } else {
              isPlaying = true;
              playBtn.classList.add("playing");
              playBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

              const timerId = window.setInterval(() => {
                const currentVal = coreRef.current?.getVariables()[sliderNode.name] ?? sliderNode.default;
                let nextVal = currentVal + sliderNode.step;
                if (nextVal > sliderNode.max) {
                  nextVal = sliderNode.min;
                }
                rangeInput.value = nextVal.toFixed(2);
                valBadge.textContent = nextVal.toFixed(2);
                handleVariableChange(sliderNode.name, nextVal);
              }, 40);

              activeTimersRef.current.set(sliderNode.name, timerId);
            }
          };

          const label = document.createElement("span");
          label.style.fontWeight = "600";
          label.style.color = "#0f172a";
          label.textContent = `${sliderNode.name}:`;

          const rangeInput = document.createElement("input");
          rangeInput.type = "range";
          rangeInput.min = String(sliderNode.min);
          rangeInput.max = String(sliderNode.max);
          rangeInput.step = String(sliderNode.step);
          rangeInput.value = String(sliderNode.default);
          rangeInput.className = "bwjm-range-input";

          const valBadge = document.createElement("span");
          valBadge.className = "bwjm-slider-val";
          valBadge.textContent = Number(sliderNode.default).toFixed(2);

          rangeInput.oninput = (e) => {
            const val = parseFloat((e.target as HTMLInputElement).value);
            valBadge.textContent = val.toFixed(2);
            handleVariableChange(sliderNode.name, val);
          };

          row.appendChild(playBtn);
          row.appendChild(label);
          row.appendChild(rangeInput);
          row.appendChild(valBadge);
          cardBody.appendChild(row);
        } else if (node.type === "checkbox") {
          const chkNode = node as CheckboxNode;
          const label = document.createElement("label");
          label.style.display = "flex";
          label.style.alignItems = "center";
          label.style.gap = "0.75rem";
          label.style.cursor = "pointer";

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = Boolean(chkNode.default);
          checkbox.style.width = "18px";
          checkbox.style.height = "18px";

          checkbox.onchange = (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            handleVariableChange(chkNode.name, checked ? 1 : 0);
          };

          const textSpan = document.createElement("span");
          textSpan.style.fontWeight = "600";
          textSpan.textContent = chkNode.label || chkNode.name;

          label.appendChild(checkbox);
          label.appendChild(textSpan);
          cardBody.appendChild(label);
        } else if (node.type === "flow2d" || node.type === "parametric2d") {
          mountSvg(cardBody, node, 720, 380);
        } else if (node.type === "calculusviz") {
          const data = coreRef.current.getNodeData(node.id);
          if (node.mode === "revolution") {
            const mount = document.createElement("div");
            mount.style.width = "100%";
            mount.style.height = "440px";
            cardBody.appendChild(mount);
            const renderer = new PlotlyRenderer(mount);
            plotlyRenderersRef.current.set(node.id, renderer);
            renderer.render(data);
          } else {
            mountSvg(cardBody, node, 760, 390, data);
          }
          const report = document.createElement("div");
          report.className = "bwjm-calculus-report";
          if (data?.error) {
            report.textContent = "Error: " + data.error;
            report.classList.add("has-error");
          } else {
            const metric = document.createElement("strong");
            const formatted = Number.isFinite(data.value) ? Number(data.value.toPrecision(8)) : "No determinado";
            metric.textContent = data.valueLabel + ": " + formatted + " " +
              (data.unit === "valor" ? "" : data.unit);
            report.appendChild(metric);
            const method = document.createElement("small");
            method.textContent = data.method + " · resultado numérico aproximado";
            report.appendChild(method);
            if (data.comparison) {
              const second = document.createElement("div");
              second.textContent = data.comparison.label + ": " +
                Number(data.comparison.value.toPrecision(8)) +
                " · Diferencia: " + Number(data.comparison.difference.toPrecision(4));
              report.appendChild(second);
            }
            (data.warnings ?? []).forEach((message:string) => {
              const caution = document.createElement("p");
              caution.className = "bwjm-calculus-warning";
              caution.textContent = "⚠ " + message;
              report.appendChild(caution);
            });
          }
          cardBody.appendChild(report);
        } else if (node.type === "plot2d") {
          mountSvg(cardBody, node, 720, 360);
        } else if (node.type === "vector2d" || node.type === "vector3d") {
          const data = coreRef.current.getNodeData(node.id);
          if (node.type === "vector3d") {
            const mount = document.createElement("div");
            mount.id = `mount-${node.id}`;
            mount.style.width = "100%";
            mount.style.height = "420px";
            cardBody.appendChild(mount);
            const renderer = new PlotlyRenderer(mount);
            plotlyRenderersRef.current.set(node.id, renderer);
            renderer.render(data);
          } else {
            mountSvg(cardBody, node, 720, 360, data);
          }
          if (node.mode || data.error) {
            const report = document.createElement("section");
            report.className = "bwjm-calculus-report bwjm-vector-report";
            report.setAttribute("aria-label", "Procedimiento vectorial");
            updateVectorStudyReport(report, data);
            cardBody.appendChild(report);
          }
        } else if (node.type === "surface3d" || node.type === "crossproduct") {
          const mount = document.createElement("div");
          mount.id = `mount-${node.id}`;
          mount.style.width = "100%";
          mount.style.height = "420px";
          cardBody.appendChild(mount);

          const renderer = new PlotlyRenderer(mount);
          plotlyRenderersRef.current.set(node.id, renderer);

          const nodeData = coreRef.current.getNodeData(node.id);
          if (nodeData) {
            renderer.render(nodeData);
            if (crossSummary) {
              crossSummary.update(nodeData);
              cardBody.appendChild(crossSummary.element);
            }
            if (crossReport && nodeData.crossStudy) {
              crossReport.update(nodeData.crossStudy);
              cardBody.appendChild(crossReport.element);
            }
            if (determinant && nodeData.crossDeterminant) {
              determinant.update(nodeData.crossDeterminant);
              cardBody.appendChild(determinant.element);
            }
          }
        } else if (node.type === "curve3d") {
          const mount = document.createElement("div");
          mount.id = `mount-${node.id}`;
          mount.style.width = "100%";
          mount.style.height = "420px";
          cardBody.appendChild(mount);

          const renderer = new PlotlyRenderer(mount);
          plotlyRenderersRef.current.set(node.id, renderer);

          const nodeData = coreRef.current.getNodeData(node.id) || node;
          const currentVars = coreRef.current.getGraphScope(node.id);
          const currentT = currentVars["t"] ?? (node as any).tDomain?.[1];
          renderer.render({
            ...nodeData, scope: currentVars, currentT,
            particle: node.animated === true,
            showTNB: node.animated === true && node.showTNB === true,
            showVectors: node.animated === true && node.showVectors === true,
            showLegend: node.showLegend === true,
          } as any);
        } else if (node.type === "vectorarrow") {
          const mount = document.createElement("div");
          mount.id = `mount-${node.id}`;
          mount.style.width = "100%";
          mount.style.height = "420px";
          cardBody.appendChild(mount);

          const renderer = new PlotlyRenderer(mount);
          plotlyRenderersRef.current.set(node.id, renderer);

          const nodeData = coreRef.current.getNodeData(node.id) || node;
          const currentVars = coreRef.current.getVariables();
          renderer.render({
            ...nodeData,
            scope: currentVars,
          } as any);
        } else if (node.type === "trajectory") {
          const mount = document.createElement("div");
          mount.id = `mount-${node.id}`;
          mount.style.width = "100%";
          mount.style.height = "420px";
          cardBody.appendChild(mount);

          const renderer = new PlotlyRenderer(mount);
          plotlyRenderersRef.current.set(node.id, renderer);

          const nodeData = coreRef.current.getNodeData(node.id) || node;
          const currentVars = coreRef.current.getVariables();
          const currentT = currentVars["t"] ?? (node as any).tDomain?.[0] ?? 0;
          renderer.render({
            ...nodeData,
            scope: currentVars,
            currentT,
          } as any);
        } else if (node.type === "particle") {
          const mount = document.createElement("div");
          mount.id = `mount-${node.id}`;
          mount.style.width = "100%";
          mount.style.height = "420px";
          cardBody.appendChild(mount);

          const renderer = new PlotlyRenderer(mount);
          plotlyRenderersRef.current.set(node.id, renderer);

          const nodeData = coreRef.current.getNodeData(node.id) || node;
          const currentVars = coreRef.current.getVariables();
          renderer.render({
            ...nodeData,
            scope: currentVars,
          } as any);
        } else if (node.type === "frame") {
          const mount = document.createElement("div");
          mount.id = `mount-${node.id}`;
          mount.style.width = "100%";
          mount.style.height = "420px";
          cardBody.appendChild(mount);

          const renderer = new PlotlyRenderer(mount);
          plotlyRenderersRef.current.set(node.id, renderer);

          const nodeData = coreRef.current.getNodeData(node.id) || node;
          const currentVars = coreRef.current.getVariables();
          renderer.render({
            ...nodeData,
            scope: currentVars,
          } as any);
        } else if (node.type === "field") {
          const mount = document.createElement("div");
          mount.id = `mount-${node.id}`;
          mount.style.width = "100%";
          mount.style.height = "420px";
          cardBody.appendChild(mount);

          const renderer = new PlotlyRenderer(mount);
          plotlyRenderersRef.current.set(node.id, renderer);

          const nodeData = coreRef.current.getNodeData(node.id) || node;
          const currentVars = coreRef.current.getVariables();
          renderer.render({
            ...nodeData,
            scope: currentVars,
          } as any);
        } else if (node.type === "region") {
          const mount = document.createElement("div");
          mount.id = `mount-${node.id}`;
          mount.style.width = "100%";
          mount.style.height = "420px";
          cardBody.appendChild(mount);

          const renderer = new PlotlyRenderer(mount);
          plotlyRenderersRef.current.set(node.id, renderer);

          const nodeData = coreRef.current.getNodeData(node.id) || node;
          const currentVars = coreRef.current.getVariables();
          renderer.render({
            ...nodeData,
            scope: currentVars,
          } as any);
        } else if (node.type === "camera") {
          const mount = document.createElement("div");
          mount.id = `mount-${node.id}`;
          mount.style.width = "100%";
          mount.style.height = "420px";
          cardBody.appendChild(mount);

          const renderer = new PlotlyRenderer(mount);
          plotlyRenderersRef.current.set(node.id, renderer);

          const nodeData = coreRef.current.getNodeData(node.id) || node;
          const currentVars = coreRef.current.getVariables();
          renderer.render({
            ...nodeData,
            scope: currentVars,
          } as any);
        } else if (node.type === "vectorfield2d") {
          mountSvg(cardBody, node, 720, 360);
        }

        // The large global clock is removed. Insert one small transport alongside
        // the first animated graph; existing layer checkboxes remain unchanged.
        if (!inlinePlaybackMounted && timelines.length > 0 && supportsInlinePlayback(node)) {
          const transport = createInlinePlayback(
            timelines,
            () => coreRef.current?.getVariables() ?? {},
            (name, value) => handleVariableChange(name, value),
          );
          const settingsControls = cardBody.querySelector(".bwjm-graph-settings-controls");
          if (settingsControls) settingsControls.appendChild(transport.element);
          else cardBody.appendChild(transport.element);
          playbackRef.current = transport;
          inlinePlaybackMounted = true;
        }

        const svgRenderer = svgRenderersRef.current.get(node.id);
        if (svgRenderer) {
          const exportButton = document.createElement("button");
          exportButton.type = "button";
          exportButton.className = "bwjm-export-svg";
          exportButton.textContent = "↓ Exportar SVG";
          exportButton.title = "Guardar el gráfico como imagen vectorial editable";
          exportButton.onclick = () => {
            const svg = svgRenderer.getElement().cloneNode(true) as SVGSVGElement;
            svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = node.id + ".svg";
            anchor.click();
            URL.revokeObjectURL(url);
          };
          cardBody.appendChild(exportButton);
        }
        } catch (error) {
          // An unbound coefficient must not crash the whole scientific document.
          // The user can activate its local slider in Personalizar gráfica.
          const warning = document.createElement("div");
          warning.className = "bwjm-graph-runtime-warning";
          const description = error instanceof Error ? error.message : String(error);
          warning.textContent = "No se pudo graficar: " + description +
            (supportsAdaptiveParameters(node)
              ? ". Activa los parámetros interactivos para asignar coeficientes." : "");
          cardBody.appendChild(warning);
        }
        card.appendChild(cardBody);
        sheet.appendChild(card);
      }
    }

    const livePanel = document.createElement("div");
    livePanel.className = "bwjm-live-analysis-panel";
    sheet.appendChild(livePanel);

    const updateLiveScientificAnalysis = () => {
      const hasVisualNodes = doc.children.some(node =>
        ["curve3d", "trajectory", "surface3d", "field", "plot2d"].includes(node.type) &&
        (node as unknown as { showInfo?: boolean }).showInfo === true
      );
      if (!hasVisualNodes) {
        livePanel.style.display = "none";
        return;
      }
      livePanel.style.display = "block";

      const vars = coreRef.current?.getVariables() || {};

      const wantsInfo = (n: typeof doc.children[number]) =>
        (n as unknown as { showInfo?: boolean }).showInfo === true;
      const trajectoryNode = doc.children.find(n => (n.type === "trajectory" || n.type === "curve3d") && wantsInfo(n));
      const fieldNode = doc.children.find(n => (n.type === "vectorfield2d" || n.type === "field") && wantsInfo(n));
      const surfaceNode = doc.children.find(n => n.type === "surface3d" && wantsInfo(n));
      const plot2dNodes = doc.children.filter(n => n.type === "plot2d" && wantsInfo(n));
      const regionNode = doc.children.find(n => n.type === "region");
      const frameNode = doc.children.find(n => n.type === "frame");

      if (trajectoryNode) {
        const tVal = vars["t"] ?? (trajectoryNode as any).tDomain?.[0] ?? 0;
        const x = (trajectoryNode as any).x ?? "cos(t)";
        const y = (trajectoryNode as any).y ?? "sin(t)";
        const z = (trajectoryNode as any).z ?? "0";
        const kin = computeKinematics({ x, y, z }, tVal, vars);
        
        const isStationary = kin.isStationary || kin.speed < 1e-7;
        const crossMag = Math.sqrt(
          (kin.tangent.y * kin.binormal.z - kin.tangent.z * kin.binormal.y)**2 +
          (kin.tangent.z * kin.binormal.x - kin.tangent.x * kin.binormal.z)**2 +
          (kin.tangent.x * kin.binormal.y - kin.tangent.y * kin.binormal.x)**2
        );
        const isDegenerate = crossMag < 1e-7;
        const curvatureType = isStationary ? "undefined" : (frameNode?.curvatureType ?? "numerical");
        const torsionType = isDegenerate ? "undefined" : (frameNode?.torsionType ?? "numerical");
        
        livePanel.innerHTML = `
          <div class="bwjm-panel-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <strong>Motor Científico BWJM • Cinemática Espacial & Triedro Frenet-Serret</strong>
          </div>
          <div class="bwjm-panel-grid">
            <div class="bwjm-panel-col">
              <div class="bwjm-col-title">Posición & Velocidad (t = ${tVal.toFixed(2)})</div>
              <div class="bwjm-metric-row">
                <span>Posición r(t):</span>
                <strong>(${kin.position.x.toFixed(3)}, ${kin.position.y.toFixed(3)}, ${kin.position.z.toFixed(3)})</strong>
              </div>
              <div class="bwjm-metric-row">
                <span>Rapidez |v(t)|:</span>
                <strong style="color: #0284c7;">${kin.speed.toFixed(4)} ${kin.speed !== kin.speed ? "" : "(numérica)"}</strong>
              </div>
            </div>
            <div class="bwjm-panel-col">
              <div class="bwjm-col-title">Descomposición de Aceleración</div>
              <div class="bwjm-metric-row">
                <span>Tangencial a_T:</span>
                <strong style="color: #10b981;">${kin.tangentialAcceleration.toFixed(4)}</strong>
              </div>
              <div class="bwjm-metric-row">
                <span>Normal a_N:</span>
                <strong style="color: #f59e0b;">${kin.normalAcceleration.toFixed(4)}</strong>
              </div>
            </div>
            <div class="bwjm-panel-col">
              <div class="bwjm-col-title">Geometría Diferencial Intrínseca</div>
              <div class="bwjm-metric-row">
                <span>Curvatura κ:</span>
                <strong style="color: #6366f1;">${kin.curvature.toFixed(4)} <span class="bwjm-math-type">[${curvatureType}]</span></strong>
              </div>
              <div class="bwjm-metric-row">
                <span>Torsión τ:</span>
                <strong style="color: #ec4899;">${kin.torsion.toFixed(4)} <span class="bwjm-math-type">[${torsionType}]</span></strong>
              </div>
              <div class="bwjm-metric-row">
                <span>Radio osculador R:</span>
                <strong>${isStationary || isDegenerate ? "∞ (indeterminado)" : kin.osculatingRadius.toFixed(4)}</strong>
              </div>
            </div>
          </div>
        `;
        return;
      }

      if (fieldNode) {
        const is3D = (fieldNode as any).dimensions === 3 || (fieldNode as any).type === "field" && (fieldNode as any).dimensions === 3;
        const components = (fieldNode as any).components || (fieldNode as any).field || ["-y", "x"];
        
        let fieldAnalysis = "";
        if (!is3D) {
          const sampleRes = sampleVectorField2D({ P: components[0], Q: components[1] }, [-3, 3], [-3, 3], 5, vars);
          const curlVal = sampleRes.curlAt(0, 0);
          const divVal = sampleRes.divergenceAt(0, 0);
          const isConservative = Math.abs(curlVal) < 1e-3;
          
          fieldAnalysis = `
            <div class="bwjm-panel-col">
              <div class="bwjm-col-title">Campo Vectorial 2D F = (${components[0]}, ${components[1]})</div>
              <div class="bwjm-metric-row">
                <span>Divergencia ∇ · F:</span>
                <strong style="color: #10b981;">${divVal.toFixed(4)} ${Math.abs(divVal) < 1e-6 ? "(Incompresible)" : ""}</strong>
              </div>
              <div class="bwjm-metric-row">
                <span>Rotacional (∇ × F)_z:</span>
                <strong style="color: #ea580c;">${curlVal.toFixed(4)} k</strong>
              </div>
              <div class="bwjm-metric-row">
                <span>Conservativo (estimado):</span>
                <strong style="color: ${isConservative ? "#10b981" : "#f59e0b"};">${isConservative ? "Sí" : "No"}</strong>
              </div>
            </div>
          `;
        } else {
          fieldAnalysis = `
            <div class="bwjm-panel-col">
              <div class="bwjm-col-title">Campo Vectorial 3D F = (${components[0]}, ${components[1]}, ${components[2] || "0"})</div>
              <div class="bwjm-metric-row">
                <span>Visualización:</span>
                <strong style="color: #0284c7;">Flechas 3D muestreadas</strong>
              </div>
            </div>
          `;
        }
        
        let greensAnalysis = "";
        if (regionNode && !is3D) {
          greensAnalysis = `
            <div class="bwjm-panel-col">
              <div class="bwjm-col-title">Región para Teorema de Green</div>
              <div class="bwjm-metric-row">
                <span>Frontera:</span>
                <strong>${(regionNode as any).boundary}</strong>
              </div>
              <div class="bwjm-metric-row">
                <span>Orientación:</span>
                <strong>${(regionNode as any).orientation ?? "ccw"}</strong>
              </div>
            </div>
          `;
        }

        livePanel.innerHTML = `
          <div class="bwjm-panel-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <strong>Motor Científico BWJM • Análisis de Campos Vectoriales${!is3D ? " & Teorema de Green" : ""}</strong>
          </div>
          <div class="bwjm-panel-grid">
            ${fieldAnalysis}
            ${greensAnalysis}
          </div>
        `;
        return;
      }

      if (surfaceNode) {
        const equation = (surfaceNode as any).equation;
        livePanel.innerHTML = `
          <div class="bwjm-panel-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <strong>Motor Científico BWJM • Superficie 3D</strong>
          </div>
          <div class="bwjm-panel-grid">
            <div class="bwjm-panel-col">
              <div class="bwjm-col-title">Ecuación</div>
              <div class="bwjm-metric-row">
                <span>z =</span>
                <strong>${escapeHtml(equation)}</strong>
              </div>
            </div>
            <div class="bwjm-panel-col">
              <div class="bwjm-col-title">Dominio</div>
              <div class="bwjm-metric-row">
                <span>x ∈</span>
                <strong>[${(surfaceNode as any).xDomain[0]}, ${(surfaceNode as any).xDomain[1]}]</strong>
              </div>
              <div class="bwjm-metric-row">
                <span>y ∈</span>
                <strong>[${(surfaceNode as any).yDomain[0]}, ${(surfaceNode as any).yDomain[1]}]</strong>
              </div>
            </div>
          </div>
        `;
        return;
      }

      if (plot2dNodes.length > 0) {
        const aVal = vars["a"] ?? 1.0;
        const nVal = Math.round(vars["n"] ?? 10);
        const alphaVal = vars["alpha"] ?? 2 * Math.PI;

        const fStr = aVal === 1.0 ? "x" : `${aVal} * x`;
        const gStr = "x^2";

        const intersections = findIntersections(fStr, gStr, [0, 2]);
        const exactArea = computeExactArea(fStr, gStr, [0, 1], vars);
        const riemann = computeRiemannPartition(fStr, gStr, [0, 1], nVal, "midpoint", vars);
        const revVol = computeRevolutionVolume(fStr, gStr, [0, 1], "x", alphaVal, vars);
        const slice = computeCrossSection(fStr, gStr, sliceX, "x", vars);

        livePanel.innerHTML = `
          <div class="bwjm-panel-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <strong>Motor Científico BWJM • Análisis de Área & Riemann</strong>
          </div>
          <div class="bwjm-panel-grid">
            <div class="bwjm-panel-col">
              <div class="bwjm-col-title">Puntos de Intersección</div>
              <div class="bwjm-metric-row">
                <span>Raíces resueltas:</span>
                <strong>${intersections.map((p) => `(${p.x}, ${p.y})`).join(" y ") || "Buscando..."}</strong>
              </div>
              <div class="bwjm-metric-row">
                <span>Área Exacta (∫):</span>
                <strong style="color: #0284c7;">${exactArea.exactFraction ? exactArea.exactFraction + " ≈ " : ""}${exactArea.value}</strong>
              </div>
            </div>
            <div class="bwjm-panel-col">
              <div class="bwjm-col-title">Suma de Riemann (n = ${nVal})</div>
              <div class="bwjm-metric-row">
                <span>Aproximación:</span>
                <strong style="color: #ea580c;">${riemann.riemannSum}</strong>
              </div>
              <div class="bwjm-metric-row">
                <span>Error Absoluto (|Δ|):</span>
                <strong style="color: ${riemann.error < 0.005 ? "#10b981" : "#f59e0b"};">${riemann.error}</strong>
              </div>
            </div>
            <div class="bwjm-panel-col">
              <div class="bwjm-col-title">Sólido de Revolución (α = ${Number(alphaVal.toFixed(2))} rad)</div>
              <div class="bwjm-metric-row">
                <span>Volumen Unión Espacial:</span>
                <strong style="color: #6366f1;">${revVol.rationalGuessOfPi ? revVol.rationalGuessOfPi + "π ≈ " : ""}${revVol.volume}</strong>
              </div>
              <div class="bwjm-metric-row">
                <span>Arandela en x = ${sliceX}:</span>
                <strong>R=${slice.outerRadius}, r=${slice.innerRadius} (Área: ${slice.washerArea})</strong>
              </div>
            </div>
          </div>
        `;
        return;
      }

      livePanel.innerHTML = `
        <div class="bwjm-panel-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          <strong>Motor Científico BWJM</strong>
        </div>
        <div class="bwjm-panel-grid">
          <div class="bwjm-panel-col">
            <div class="bwjm-col-title">Variables Activas</div>
            ${Object.entries(vars).map(([k, v]) => `
              <div class="bwjm-metric-row">
                <span>${k}:</span>
                <strong>${typeof v === 'number' ? v.toFixed(4) : v}</strong>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    };

    liveAnalysisRef.current = updateLiveScientificAnalysis;
    updateLiveScientificAnalysis();

    container.appendChild(sheet);
    return () => {
      svgResizeObserver?.disconnect();
      if (svgResizeFrame !== undefined) window.cancelAnimationFrame(svgResizeFrame);
    };
  }, [doc, markdown, filename, sliceX, activeId]);

  const handleVariableChange = (name: string, value: number) => {
    if (!coreRef.current) return;
    const dirtyNodeIds = coreRef.current.setVariable(name, value);
    const currentVars = coreRef.current.getVariables();

    dirtyNodeIds.forEach((nodeId) => {
      const nodeData = coreRef.current?.getNodeData(nodeId);
      if (!nodeData) return;

      const card = sheetRef.current?.querySelector(`#node-${nodeId}`);
      if (nodeData.type === "functiontable") {
        const tbody = card?.querySelector("table.bwjm-scientific-table tbody");
        if (tbody instanceof HTMLTableSectionElement) {
          renderTableBody(tbody, nodeData.rows, nodeData.precision);
        }
      }
      if (nodeData.type === "statistics") {
        const report = card?.querySelector(".bwjm-statistics-panel");
        if (report instanceof HTMLElement) renderStatisticsPanel(report, nodeData);
      }
      if (nodeData.type === "vector2d" || nodeData.type === "vector3d") {
        const report = card?.querySelector(".bwjm-vector-report");
        if (report instanceof HTMLElement) updateVectorStudyReport(report, nodeData);
      }

      const svgRenderer = svgRenderersRef.current.get(nodeId);
      if (svgRenderer) {
        svgRenderer.render({
          ...nodeData,
        });
      }

      const plotlyRenderer = plotlyRenderersRef.current.get(nodeId);
      if (plotlyRenderer) {
        const currentT = currentVars["t"] ?? (nodeData as any).tDomain?.[1];
        const curveOpts = nodeData.type === "curve3d" ? {
          particle: nodeData.animated === true,
          showVectors: nodeData.animated === true && nodeData.showVectors === true,
          showTNB: nodeData.animated === true && nodeData.showTNB === true,
          showLegend: nodeData.showLegend === true,
        } : {};
        plotlyRenderer.render({
          ...nodeData, scope: coreRef.current?.getGraphScope(nodeId) ?? currentVars,
          currentT, ...curveOpts,
        } as any);
      }
    });

    plotlyRenderersRef.current.forEach((renderer, nodeId) => {
      if (dirtyNodeIds.includes(nodeId)) return;
      const nodeData = coreRef.current?.getNodeData(nodeId);
      if (nodeData) {
        const nodeType = (nodeData as any).type;
        if (["curve3d", "trajectory", "particle", "frame", "field", "region", "camera", "vectorarrow"].includes(nodeType)) {
          const currentT = currentVars["t"] ?? (nodeData as any).tDomain?.[1] ?? (nodeData as any).tDomain?.[0] ?? 0;
          renderer.render({
            ...nodeData,
            scope: coreRef.current?.getGraphScope(nodeId) ?? currentVars,
            currentT,
            particle: nodeType === "curve3d" && (nodeData as any).animated === true,
            showTNB: nodeType === "curve3d" && (nodeData as any).animated === true && (nodeData as any).showTNB === true,
            showVectors: nodeType === "curve3d" && (nodeData as any).animated === true && (nodeData as any).showVectors === true,
            showLegend: nodeType === "curve3d" && (nodeData as any).showLegend === true,
          } as any);
        }
      }
    });

    if (liveAnalysisRef.current) {
      liveAnalysisRef.current();
    }
    
    window.dispatchEvent(new CustomEvent('bwjm-variable-change'));
  };

  const currentVariables = coreRef.current ? coreRef.current.getVariables() : {};

  return (
    <div className={`bwjm-app-container mode-${viewMode} theme-${theme}${compactWorkspace ? " is-compact" : ""}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".bwjm,.jm,.md,.txt"
        style={{ display: "none" }}
        onChange={handleOpenFile}
      />
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        aria-label="Seleccionar imagen local"
        style={{ display: "none" }}
        onChange={handleImageFile}
      />

      <header className="bwjm-studio-header">
        <div className="bwjm-studio-brand">
          <span className="bwjm-studio-mark"><IconAtom size={17}/></span>
          <span className="bwjm-studio-name">BWJM <strong>Studio</strong></span>
          <span className="bwjm-studio-subtitle">Editor científico</span>
        </div>
        <DocumentSearch ref={searchRef} text={markdown} onLocate={handleSearchLocate}/>
        <div className="bwjm-studio-header-meta">
          <span className="bwjm-studio-active-name" title={filename}>{filename}</span>
          <span className={"bwjm-studio-diagnostics " + (doc.diagnostics.some(d => d.severity === "error") ? "has-errors" : "")}
            title={doc.diagnostics.length ? "Revisa los diagnósticos en Inspector" : "Sin errores de sintaxis"}>
            <IconCheck size={13}/>
            {doc.diagnostics.filter(d => d.severity === "error").length} errores
          </span>
        </div>
      </header>
      <DocumentTabs documents={documents} activeId={activeId}
        onSelect={selectDocument} onClose={handleCloseDocument} onNew={handleNewDocument}
        onRename={renameDocument}/>
      <Ribbon activeView={viewMode} compactWorkspace={compactWorkspace} onAction={handleRibbonAction}
        theme={theme} onThemeChange={setTheme}
        collapsed={isRibbonCollapsed} onCollapseChange={setIsRibbonCollapsed}/>
      {imageMessage && <div className="bwjm-image-notice" role="status">{imageMessage}</div>}

      {compactWorkspace && (
        <div ref={compactViewRef} className="bwjm-compact-view" role="group" aria-label="Vista del documento">
          <button type="button" aria-pressed={viewMode === "editor"} aria-controls="bwjm-editor-panel"
            onClick={() => setViewMode("editor")}>Editor</button>
          <button type="button" aria-pressed={viewMode === "reader"} aria-controls="bwjm-reader-panel"
            onClick={() => setViewMode("reader")}>Lector</button>
        </div>
      )}

      <div ref={workspaceLayoutRef} className="bwjm-workspace-layout"
        onKeyDown={event => { if (compactSidebarVisible && event.key === "Escape") closeSidebar(); }}>
        <SidebarLeft
          tab={sidebarTab}
          onTabChange={setSidebarTab}
          wordCount={wordCount}
          charCount={charCount}
          lineCount={lineCount}
          nodes={doc.children}
          diagnostics={doc.diagnostics}
          isOpen={isSidebarLeftOpen}
          onClose={closeSidebar}
          outline={outline}
          variables={currentVariables}
          lessons={SAMPLE_LESSONS}
          currentLessonKey={selectedTemplate}
          onSelectLesson={(key: string) => {
            openDocument(SAMPLE_LESSONS[key].filename, SAMPLE_LESSONS[key].content, key);
            if (compactWorkspace) closeSidebar();
          }}
          onNavigateOutline={handleNavigateOutline}
        />

        <main id="bwjm-workspace-active" className="bwjm-main-split" role="tabpanel"
          aria-labelledby={"tab-" + activeId} aria-hidden={compactSidebarVisible || undefined}
          style={{ visibility: compactSidebarVisible ? "hidden" : undefined }}>
          <section
            id="bwjm-editor-panel"
            className="bwjm-editor-panel"
            style={{ display: viewMode === "reader" ? "none" : undefined }}
          >
            <div className="bwjm-panel-toolbar">
              <span className="bwjm-panel-title">Editor de Código .bwjm</span>
              <span className="bwjm-char-count">{charCount} caracteres</span>
            </div>
            <textarea
              ref={textareaRef}
              className="bwjm-code-textarea"
              value={editorView.text}
              onChange={(e) => setMarkdown(editorView.restoreSource(e.target.value))}
              aria-label="Editor del documento, imágenes embebidas con referencias cortas"
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
            />
          </section>

          <section
            id="bwjm-reader-panel"
            className="bwjm-preview-panel"
            style={{ display: viewMode === "editor" ? "none" : undefined }}
          >
            <div ref={sheetRef} className="bwjm-scroll-container" />
          </section>
        </main>


      </div>


      <FormulaModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
        onInsert={(formulaText: string) => insertAtCursor(formulaText)}
      />

      <ChartModal
        isOpen={isChartModalOpen}
        onClose={() => setIsChartModalOpen(false)}
        onInsert={(codeBlock: string) => insertAtCursor(codeBlock)}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={compactWorkspace ? commandsList.filter(command => command.id !== "mode-split") : commandsList}
      />
    </div>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<BWJMStudio />);
}
