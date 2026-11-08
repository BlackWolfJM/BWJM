import React, { useState, useEffect, useRef, useMemo, ChangeEvent } from "react";
import { createRoot } from "react-dom/client";
import { parseMathMD } from "@mathmd/parser";
import { MathMDCore } from "@mathmd/core";
import { SVGRenderer } from "@mathmd/renderer-svg";
import { PlotlyRenderer } from "@mathmd/renderer-plotly";
import {
  findIntersections,
  computeExactArea,
  computeRiemannPartition,
  computeRevolutionVolume,
  computeCrossSection,
} from "@mathmd/math";
import type { CheckboxNode, MathMDDiagnostic, MathMDNode, SliderNode } from "@mathmd/ast";
import { MenuBar } from "./MenuBar.js";
import { ToolBar } from "./ToolBar.js";
import { StatusBar } from "./StatusBar.js";
import { SidebarLeft, OutlineItem } from "./SidebarLeft.js";
import { SidebarRight } from "./SidebarRight.js";
import { FormulaModal } from "./FormulaModal.js";
import { ChartModal } from "./ChartModal.js";
import { CommandPalette, CommandItem } from "./CommandPalette.js";
import "./theme.css";

declare global {
  interface Window {
    katex?: {
      renderToString(tex: string, options?: { displayMode?: boolean; throwOnError?: boolean }): string;
    };
  }
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

export function formatInlineMarkdown(text: string): string {
  const mathMatches: string[] = [];
  let sanitized = text.replace(/\$([^$]+)\$/g, (_, math) => {
    const idx = mathMatches.length;
    mathMatches.push(renderMathToString(math.trim(), false));
    return `__MATH_TOKEN_${idx}__`;
  });

  sanitized = escapeHtml(sanitized);

  sanitized = sanitized.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  sanitized = sanitized.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  sanitized = sanitized.replace(
    /`([^`]+)`/g,
    '<code style="background: #f1f5f9; padding: 0.15rem 0.4rem; border-radius: 4px; font-family: monospace; font-size: 0.88em; color: #0f172a;">$1</code>'
  );

  sanitized = sanitized.replace(/__MATH_TOKEN_(\d+)__/g, (_, idx) => {
    return mathMatches[parseInt(idx, 10)] || "";
  });

  return sanitized;
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
};

type ViewMode = "editor" | "split" | "reader";

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

function renderProseText(content: string, container: HTMLElement): void {
  const lines = content.split("\n");
  let inMathBlock = false;
  let mathBuffer: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.textContent = codeBuffer.join("\n");
        pre.appendChild(code);
        container.appendChild(pre);
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (line.trim().startsWith("$$")) {
      if (inMathBlock) {
        const mathDiv = document.createElement("div");
        mathDiv.className = "math-display-box";
        mathDiv.innerHTML = renderMathToString(mathBuffer.join(" "), true);
        container.appendChild(mathDiv);
        mathBuffer = [];
        inMathBlock = false;
      } else {
        inMathBlock = true;
        const remaining = line.trim().slice(2).trim();
        if (remaining.endsWith("$$") && remaining.length > 2) {
          const mathDiv = document.createElement("div");
          mathDiv.className = "math-display-box";
          mathDiv.innerHTML = renderMathToString(remaining.slice(0, -2).trim(), true);
          container.appendChild(mathDiv);
          inMathBlock = false;
        } else if (remaining.length > 0) {
          mathBuffer.push(remaining);
        }
      }
      continue;
    }

    if (inMathBlock) {
      mathBuffer.push(line.trim());
      continue;
    }

    if (line.startsWith("# ")) {
      const h1 = document.createElement("h1");
      h1.innerHTML = formatInlineMarkdown(line.slice(2));
      container.appendChild(h1);
    } else if (line.startsWith("## ")) {
      const h2 = document.createElement("h2");
      h2.innerHTML = formatInlineMarkdown(line.slice(3));
      container.appendChild(h2);
    } else if (line.startsWith("### ")) {
      const h3 = document.createElement("h3");
      h3.innerHTML = formatInlineMarkdown(line.slice(4));
      container.appendChild(h3);
    } else if (line.startsWith("> ")) {
      const callout = document.createElement("div");
      callout.className = "markdown-callout";
      callout.innerHTML = `<p>${formatInlineMarkdown(line.slice(2))}</p>`;
      container.appendChild(callout);
    } else if (line.trim().length > 0) {
      const p = document.createElement("p");
      p.innerHTML = formatInlineMarkdown(line);
      container.appendChild(p);
    }
  }
}

export function BWJMStudio() {
  const [markdown, setMarkdown] = useState<string>(SAMPLE_LESSONS.riemann.content);
  const [filename, setFilename] = useState<string>(SAMPLE_LESSONS.riemann.filename);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("riemann");
  const [sliceX] = useState<number>(0.5);
  const [theme, setTheme] = useState<"linear" | "catppuccin" | "tokyonight">("linear");

  const [isSidebarLeftOpen, setIsSidebarLeftOpen] = useState<boolean>(true);
  const [isSidebarRightOpen, setIsSidebarRightOpen] = useState<boolean>(true);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState<boolean>(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const coreRef = useRef<MathMDCore | null>(null);
  const activeTimersRef = useRef<Map<string, number>>(new Map());
  const plotlyRenderersRef = useRef<Map<string, PlotlyRenderer>>(new Map());
  const svgRenderersRef = useRef<Map<string, SVGRenderer>>(new Map());
  const liveAnalysisRef = useRef<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const doc = useMemo(() => parseMathMD(markdown), [markdown]);
  const outline = useMemo(() => extractOutline(markdown), [markdown]);

  const wordCount = useMemo(() => {
    const clean = markdown.replace(/[#*`>$~-]/g, " ").trim();
    return clean ? clean.split(/\s+/).length : 0;
  }, [markdown]);

  const charCount = markdown.length;
  const lineCount = markdown.split("\n").length;

  const clearTimers = () => {
    activeTimersRef.current.forEach((id) => window.clearInterval(id));
    activeTimersRef.current.clear();
  };

  const clearRenderers = () => {
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
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = markdown.substring(start, end);
    const replacement = prefix + selected + suffix;
    const next = markdown.substring(0, start) + replacement + markdown.substring(end);
    setMarkdown(next);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 10);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
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
  };

  const handleOpenFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setMarkdown(content);
      setFilename(file.name);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleNewDocument = () => {
    setMarkdown("# Nuevo Documento BWJM\n\nComienza a escribir texto, fórmulas y gráficas matemáticas.\n");
    setFilename("sin_titulo.bwjm");
  };

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
    .bwjm-sheet { background: #ffffff; max-width: 860px; width: 100%; padding: 3rem; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    h1 { font-size: 2rem; font-weight: 800; color: #0f172a; margin-bottom: 1.5rem; }
    h2 { font-size: 1.4rem; font-weight: 700; color: #1e293b; margin: 2rem 0 1rem; }
    p { font-size: 1.05rem; line-height: 1.7; color: #334155; margin-bottom: 1rem; }
    .math-display-box { text-align: center; margin: 1.5rem 0; padding: 1rem; background: #f8fafc; border-radius: 6px; }
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
      textarea.focus();
      textarea.setSelectionRange(charIndex, charIndex + (lines[item.lineNumber - 1]?.length || 0));
    }
  };

  const commandsList: CommandItem[] = [
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
      action: () => setIsSidebarRightOpen((prev) => !prev),
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
        setSelectedTemplate("riemann");
        setMarkdown(SAMPLE_LESSONS.riemann.content);
        setFilename(SAMPLE_LESSONS.riemann.filename);
      },
    },
    {
      id: "load-lesson-2",
      title: "Cargar Lección: Sólidos de Revolución (3π)",
      category: "Lecciones",
      action: () => {
        setSelectedTemplate("revolution");
        setMarkdown(SAMPLE_LESSONS.revolution.content);
        setFilename(SAMPLE_LESSONS.revolution.filename);
      },
    },
    {
      id: "load-lesson-3",
      title: "Cargar Lección: Superficie 3D y Oscilador Armónico",
      category: "Lecciones",
      action: () => {
        setSelectedTemplate("surface");
        setMarkdown(SAMPLE_LESSONS.surface.content);
        setFilename(SAMPLE_LESSONS.surface.filename);
      },
    },
  ];

  useEffect(() => {
    clearTimers();
    clearRenderers();

    coreRef.current = new MathMDCore(doc);
    const container = sheetRef.current;
    if (!container) return;

    container.replaceChildren();

    const sheet = document.createElement("article");
    sheet.className = "bwjm-sheet";

    const header = document.createElement("header");
    header.className = "bwjm-sheet-header";
    header.innerHTML = `
      <div class="bwjm-sheet-badge">BWJM • DOCUMENTO CIENTÍFICO VIVO</div>
      <div class="bwjm-sheet-filename">${escapeHtml(filename)}</div>
    `;
    sheet.appendChild(header);

    const segments = parseDocumentSegments(markdown, doc.children, doc.diagnostics);

    for (const segment of segments) {
      if (segment.kind === "prose" && segment.content) {
        const proseDiv = document.createElement("div");
        proseDiv.className = "bwjm-prose-block";
        renderProseText(segment.content, proseDiv);
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
        card.appendChild(cardHeader);

        const cardBody = document.createElement("div");
        cardBody.className = "bwjm-node-body";

        if (node.type === "slider") {
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
        } else if (node.type === "plot2d") {
          const mount = document.createElement("div");
          mount.id = `mount-${node.id}`;
          mount.style.width = "100%";
          mount.style.minHeight = "360px";
          cardBody.appendChild(mount);

          const renderer = new SVGRenderer(mount, 720, 360);
          svgRenderersRef.current.set(node.id, renderer);

          const nodeData = coreRef.current.getNodeData(node.id);
          if (nodeData) {
            renderer.render(nodeData);
          }
        } else if (node.type === "surface3d") {
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
          }
        }

        card.appendChild(cardBody);
        sheet.appendChild(card);
      }
    }

    const livePanel = document.createElement("div");
    livePanel.className = "bwjm-live-analysis-panel";
    sheet.appendChild(livePanel);

    const updateLiveScientificAnalysis = () => {
      const vars = coreRef.current?.getVariables() || {};
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
              <strong style="color: #6366f1;">${revVol.exactFractionOfPi ? revVol.exactFractionOfPi + "π ≈ " : ""}${revVol.volume}</strong>
            </div>
            <div class="bwjm-metric-row">
              <span>Arandela en x = ${sliceX}:</span>
              <strong>R=${slice.outerRadius}, r=${slice.innerRadius} (Área: ${slice.washerArea})</strong>
            </div>
          </div>
        </div>
      `;
    };

    liveAnalysisRef.current = updateLiveScientificAnalysis;
    updateLiveScientificAnalysis();

    container.appendChild(sheet);
  }, [doc, markdown, filename, sliceX]);

  const handleVariableChange = (name: string, value: number) => {
    if (!coreRef.current) return;
    const dirtyNodeIds = coreRef.current.setVariable(name, value);

    dirtyNodeIds.forEach((nodeId) => {
      const nodeData = coreRef.current?.getNodeData(nodeId);
      if (!nodeData) return;

      const svgRenderer = svgRenderersRef.current.get(nodeId);
      if (svgRenderer) {
        svgRenderer.render(nodeData);
      }

      const plotlyRenderer = plotlyRenderersRef.current.get(nodeId);
      if (plotlyRenderer) {
        plotlyRenderer.render(nodeData);
      }
    });

    if (liveAnalysisRef.current) {
      liveAnalysisRef.current();
    }
  };

  const currentVariables = coreRef.current ? coreRef.current.getVariables() : {};

  return (
    <div className={`bwjm-app-container mode-${viewMode} theme-${theme}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".bwjm,.jm,.md,.txt"
        style={{ display: "none" }}
        onChange={handleOpenFile}
      />

      <MenuBar
        filename={filename}
        theme={theme}
        onSetTheme={setTheme}
        onNew={handleNewDocument}
        onOpen={() => fileInputRef.current?.click()}
        onSave={handleSaveFile}
        onExportHtml={handleExportHtml}
        onOpenFormulaModal={() => setIsFormulaModalOpen(true)}
        onOpenChartModal={() => setIsChartModalOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onInsertMarkdown={insertAtCursor}
        onSetViewMode={setViewMode}
        onToggleSidebarLeft={() => setIsSidebarLeftOpen((prev) => !prev)}
        onToggleSidebarRight={() => setIsSidebarRightOpen((prev) => !prev)}
        onShowHelp={() => alert("BWJM Studio v1.0.0\nFormato científico interactivo y verificable.\nAtajos principales:\n- Ctrl+K: Paleta de Comandos\n- Ctrl+Shift+M: Insertar Fórmula\n- Ctrl+S: Guardar Documento\n- Ctrl+O: Abrir Archivo")}
      />

      <ToolBar
        onOpen={() => fileInputRef.current?.click()}
        onSave={handleSaveFile}
        onExportHtml={handleExportHtml}
        onOpenFormulaModal={() => setIsFormulaModalOpen(true)}
        onOpenChartModal={() => setIsChartModalOpen(true)}
        onInsertMarkdown={insertAtCursor}
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        isSidebarLeftOpen={isSidebarLeftOpen}
        onToggleSidebarLeft={() => setIsSidebarLeftOpen((prev) => !prev)}
        isSidebarRightOpen={isSidebarRightOpen}
        onToggleSidebarRight={() => setIsSidebarRightOpen((prev) => !prev)}
      />

      <div className="bwjm-workspace-layout">
        <SidebarLeft
          isOpen={isSidebarLeftOpen}
          onClose={() => setIsSidebarLeftOpen(false)}
          outline={outline}
          variables={currentVariables}
          lessons={SAMPLE_LESSONS}
          currentLessonKey={selectedTemplate}
          onSelectLesson={(key: string) => {
            setSelectedTemplate(key);
            setMarkdown(SAMPLE_LESSONS[key].content);
            setFilename(SAMPLE_LESSONS[key].filename);
          }}
          onNavigateOutline={handleNavigateOutline}
        />

        <main className="bwjm-main-split">
          <section
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
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
            />
          </section>

          <section
            className="bwjm-preview-panel"
            style={{ display: viewMode === "editor" ? "none" : undefined }}
          >
            <div ref={sheetRef} className="bwjm-scroll-container" />
          </section>
        </main>

        <SidebarRight
          isOpen={isSidebarRightOpen}
          onClose={() => setIsSidebarRightOpen(false)}
          wordCount={wordCount}
          charCount={charCount}
          lineCount={lineCount}
          nodes={doc.children}
          diagnostics={doc.diagnostics}
        />
      </div>

      <StatusBar
        filename={filename}
        wordCount={wordCount}
        charCount={charCount}
        diagnostics={doc.diagnostics}
        viewMode={viewMode}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

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
        commands={commandsList}
      />
    </div>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<BWJMStudio />);
}
