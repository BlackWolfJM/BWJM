import React, { useState, useEffect, useRef, useMemo, ChangeEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { parseMathMD } from '@mathmd/parser';
import { MathMDCore } from '@mathmd/core';
import { SVGRenderer } from '@mathmd/renderer-svg';
import { PlotlyRenderer } from '@mathmd/renderer-plotly';
import {
  findIntersections,
  computeExactArea,
  computeRiemannPartition,
  computeRevolutionVolume,
  computeCrossSection,
} from '@mathmd/math';
import type { CheckboxNode, MathMDDiagnostic, MathMDNode, SliderNode } from '@mathmd/ast';
import './theme.css';

declare global {
  interface Window {
    katex?: {
      renderToString(tex: string, options?: { displayMode?: boolean; throwOnError?: boolean }): string;
    };
  }
}

// Professional SVG Vector Icons (Lucide-grade)
const IconAtom = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.3" />
    <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(30 12 12)" />
    <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(-30 12 12)" />
  </svg>
);

const IconFolderOpen = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" />
  </svg>
);

const IconDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconCode = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const IconBookOpen = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const IconChevronDown = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);


function renderMathToString(tex: string, displayMode: boolean): string {
  if (typeof window !== 'undefined' && window.katex) {
    try {
      return window.katex.renderToString(tex, { displayMode, throwOnError: false });
    } catch {
      // fallback to formatted string
    }
  }

  // Pure Unicode formatting fallback when KaTeX is offline/loading
  const cleaned = tex
    .replace(/\\implies/g, ' ⟹ ')
    .replace(/\\ge/g, ' ≥ ')
    .replace(/\\le/g, ' ≤ ')
    .replace(/\\approx/g, ' ≈ ')
    .replace(/\\int_{([^}]+)}\^{([^}]+)}/g, '∫_{$1}^{$2} ')
    .replace(/\\frac{([^}]+)}{([^}]+)}/g, '($1 / $2)')
    .replace(/\\left\[/g, '[')
    .replace(/\\right\]_0\^1/g, ']_{0}^{1}')
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\\cdot/g, ' · ')
    .replace(/\\pi/g, 'π')
    .replace(/\\alpha/g, 'α')
    .replace(/\\omega/g, 'ω')
    .replace(/\\,/g, ' ')
    .replace(/\\;/g, ' ')
    .replace(/\\/g, '');

  if (displayMode) {
    return `<div style="font-family: 'Cambria Math', KaTeX_Math, serif; font-size: 1.25rem; font-style: italic; color: #0284c7;">${cleaned}</div>`;
  }
  return `<span style="font-family: 'Cambria Math', KaTeX_Math, serif; font-style: italic; color: #0369a1; padding: 0 2px;">${cleaned}</span>`;
}

function formatInlineMarkdown(text: string): string {
  // Replace inline math $...$ first
  let result = text.replace(/\$([^$]+)\$/g, (_, math) => {
    return renderMathToString(math.trim(), false);
  });

  // Replace bold **text**
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Replace italic *text*
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // Replace inline code `code`
  result = result.replace(/`([^`]+)`/g, '<code style="background: #f1f5f9; padding: 0.15rem 0.4rem; border-radius: 4px; font-family: monospace; font-size: 0.88em; color: #0f172a;">$1</code>');

  return result;
}

const SAMPLE_LESSONS: Record<string, { title: string; filename: string; content: string }> = {
  riemann: {
    title: '1. Área entre Curvas & Suma de Riemann (f=x, g=x²)',
    filename: 'area_riemann.bwjm',
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
    title: '2. Sólidos de Revolución & Giro a 3π',
    filename: 'solido_revolucion.bwjm',
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
    title: '3. Superficie 3D y Oscilador Armónico',
    filename: 'onda_armonica.bwjm',
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

type ViewMode = 'split' | 'reader';

interface DocumentSegment {
  kind: 'prose' | 'mathmd' | 'diagnostic';
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
    | { start: number; end: number; kind: 'mathmd'; node: MathMDNode }
    | { start: number; end: number; kind: 'diagnostic'; diagnostic: MathMDDiagnostic };

  const spans: Span[] = [];
  for (const node of docNodes) {
    spans.push({
      start: node.range.start.offset,
      end: node.range.end.offset,
      kind: 'mathmd',
      node,
    });
  }
  for (const diagnostic of diagnostics) {
    if (diagnostic.range && diagnostic.blockType) {
      spans.push({
        start: diagnostic.range.start.offset,
        end: diagnostic.range.end.offset,
        kind: 'diagnostic',
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
        segments.push({ kind: 'prose', content: proseSlice });
      }
    }
    if (span.kind === 'mathmd') {
      segments.push({ kind: 'mathmd', node: span.node });
    } else if (span.kind === 'diagnostic') {
      segments.push({
        kind: 'diagnostic',
        diagnostic: span.diagnostic,
        content: source.slice(span.start, span.end),
      });
    }
    cursor = Math.max(cursor, span.end);
  }

  if (cursor < source.length) {
    const text = source.slice(cursor).trim();
    if (text.length > 0) {
      segments.push({ kind: 'prose', content: text });
    }
  }

  return segments;
}

function renderProseText(content: string, container: HTMLElement): void {
  const lines = content.split('\n');
  let inMathBlock = false;
  let mathBuffer: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = codeBuffer.join('\n');
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

    if (line.trim().startsWith('$$')) {
      if (inMathBlock) {
        const mathDiv = document.createElement('div');
        mathDiv.className = 'math-display-box';
        mathDiv.innerHTML = renderMathToString(mathBuffer.join(' '), true);
        container.appendChild(mathDiv);
        mathBuffer = [];
        inMathBlock = false;
      } else {
        inMathBlock = true;
        const remaining = line.trim().slice(2).trim();
        if (remaining.endsWith('$$') && remaining.length > 2) {
          const mathDiv = document.createElement('div');
          mathDiv.className = 'math-display-box';
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

    if (line.startsWith('# ')) {
      const h1 = document.createElement('h1');
      h1.innerHTML = formatInlineMarkdown(line.slice(2));
      container.appendChild(h1);
    } else if (line.startsWith('## ')) {
      const h2 = document.createElement('h2');
      h2.innerHTML = formatInlineMarkdown(line.slice(3));
      container.appendChild(h2);
    } else if (line.startsWith('### ')) {
      const h3 = document.createElement('h3');
      h3.innerHTML = formatInlineMarkdown(line.slice(4));
      container.appendChild(h3);
    } else if (line.startsWith('> ')) {
      const callout = document.createElement('div');
      callout.className = 'markdown-callout';
      callout.innerHTML = `<p>${formatInlineMarkdown(line.slice(2))}</p>`;
      container.appendChild(callout);
    } else if (line.trim().length > 0) {
      const p = document.createElement('p');
      p.innerHTML = formatInlineMarkdown(line);
      container.appendChild(p);
    }
  }
}

export function BWJMStudio() {
  const [markdown, setMarkdown] = useState<string>(SAMPLE_LESSONS.riemann.content);
  const [filename, setFilename] = useState<string>(SAMPLE_LESSONS.riemann.filename);
  const [mode, setMode] = useState<ViewMode>('split');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('riemann');
  const [sliceX, setSliceX] = useState<number>(0.5);

  const sheetRef = useRef<HTMLDivElement | null>(null);
  const coreRef = useRef<MathMDCore | null>(null);
  const activeTimersRef = useRef<Map<string, number>>(new Map());
  const plotlyRenderersRef = useRef<Map<string, PlotlyRenderer>>(new Map());
  const svgRenderersRef = useRef<Map<string, SVGRenderer>>(new Map());
  const liveAnalysisRef = useRef<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const doc = useMemo(() => parseMathMD(markdown), [markdown]);

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

  useEffect(() => {
    clearTimers();
    clearRenderers();

    coreRef.current = new MathMDCore(doc);
    const container = sheetRef.current;
    if (!container) return;

    container.replaceChildren();

    // Paper Sheet
    const sheet = document.createElement('article');
    sheet.className = 'bwjm-sheet';

    // Header
    const header = document.createElement('header');
    header.className = 'bwjm-sheet-header';
    const badge = document.createElement('span');
    badge.className = 'bwjm-sheet-badge';
    badge.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      BWJM • Documento Vivo
    `;
    const uriText = document.createElement('span');
    uriText.style.fontFamily = 'monospace';
    uriText.style.fontSize = '0.82rem';
    uriText.style.color = '#64748b';
    uriText.textContent = filename;
    header.appendChild(badge);
    header.appendChild(uriText);
    sheet.appendChild(header);

    const segments = parseDocumentSegments(markdown, doc.children, doc.diagnostics);

    for (const seg of segments) {
      if (seg.kind === 'prose' && seg.content) {
        const proseDiv = document.createElement('div');
        proseDiv.className = 'markdown-prose';
        renderProseText(seg.content, proseDiv);
        sheet.appendChild(proseDiv);
      } else if (seg.kind === 'diagnostic' && seg.diagnostic) {
        const diagCard = document.createElement('div');
        diagCard.className = 'bwjm-diagnostic-card';
        diagCard.innerHTML = `
          <div class="bwjm-diagnostic-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            ${seg.diagnostic.severity.toUpperCase()} • ${seg.diagnostic.code}
          </div>
          <div class="bwjm-diagnostic-msg">${seg.diagnostic.message}</div>
          ${seg.content ? `<div class="bwjm-diagnostic-code">${seg.content.trim()}</div>` : ''}
        `;
        sheet.appendChild(diagCard);
      } else if (seg.kind === 'mathmd' && seg.node) {
        const node = seg.node;
        const card = document.createElement('div');
        card.className = 'bwjm-node-card';

        const cardHeader = document.createElement('div');
        cardHeader.className = 'bwjm-node-header';
        const tag = document.createElement('span');
        tag.className = 'bwjm-node-tag';

        let labelText = `${node.type.toUpperCase()}`;
        let iconSvg = '';
        if (node.type === 'slider') {
          labelText = `Control de Parámetro: ${(node as SliderNode).name}`;
          iconSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`;
        } else if (node.type === 'plot2d') {
          labelText = `Gráfica 2D: ${node.id}`;
          iconSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`;
        } else if (node.type === 'surface3d') {
          labelText = `Superficie 3D: ${node.id}`;
          iconSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`;
        } else {
          iconSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
        }

        tag.innerHTML = `
          ${iconSvg}
          ${labelText}
        `;
        cardHeader.appendChild(tag);
        card.appendChild(cardHeader);

        const cardBody = document.createElement('div');
        cardBody.className = 'bwjm-node-body';
        card.appendChild(cardBody);

        sheet.appendChild(card);

        renderMathNode(node, cardBody);
      }
    }

    if (selectedTemplate === 'riemann') {
      renderRiemannAnalysisCard(sheet);
    } else if (selectedTemplate === 'revolution') {
      renderRevolutionAnalysisCard(sheet);
    }

    container.appendChild(sheet);
  }, [doc, filename, selectedTemplate, sliceX]);

  const buildRiemannSvg = (aVal: number, nVal: number, partition: ReturnType<typeof computeRiemannPartition>): string => {
    const width = 720;
    const height = 240;
    const padL = 50;
    const padR = 25;
    const padT = 20;
    const padB = 35;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const xMax = 1.25;
    const yMax = Math.max(1.35, aVal * 1.25);

    const sx = (x: number) => padL + (x / xMax) * plotW;
    const sy = (y: number) => height - padB - (y / yMax) * plotH;

    let gridSvg = '';
    for (let x = 0.2; x <= 1.2; x += 0.2) {
      gridSvg += `<line x1="${sx(x)}" y1="${sy(0)}" x2="${sx(x)}" y2="${sy(yMax)}" stroke="#f1f5f9" stroke-width="1"/>`;
      gridSvg += `<text x="${sx(x)}" y="${height - padB + 16}" font-size="10" fill="#94a3b8" text-anchor="middle" font-family="sans-serif">${x.toFixed(1)}</text>`;
    }
    for (let y = 0.2; y <= yMax; y += 0.2) {
      gridSvg += `<line x1="${padL}" y1="${sy(y)}" x2="${width - padR}" y2="${sy(y)}" stroke="#f1f5f9" stroke-width="1"/>`;
      gridSvg += `<text x="${padL - 8}" y="${sy(y) + 3}" font-size="10" fill="#94a3b8" text-anchor="end" font-family="sans-serif">${y.toFixed(1)}</text>`;
    }

    let rectsSvg = '';
    for (const r of partition.rectangles) {
      const rx = sx(r.x0);
      const rw = sx(r.x1) - rx;
      const ry = sy(r.yTop);
      const rh = sy(r.yBottom) - ry;
      if (rh > 0 && rw > 0) {
        rectsSvg += `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="rgba(2, 132, 199, 0.22)" stroke="#0284c7" stroke-width="0.8"/>`;
      }
    }

    const fPath = `M ${sx(0)} ${sy(0)} L ${sx(xMax)} ${sy(aVal * xMax)}`;

    let gPath = `M ${sx(0)} ${sy(0)}`;
    const steps = 40;
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * xMax;
      const y = x * x;
      gPath += ` L ${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`;
    }

    const axesSvg = `
      <line x1="${padL}" y1="${sy(0)}" x2="${width - padR}" y2="${sy(0)}" stroke="#94a3b8" stroke-width="1.5"/>
      <line x1="${padL}" y1="${sy(0)}" x2="${padL}" y2="${padT}" stroke="#94a3b8" stroke-width="1.5"/>
      <text x="${width - padR + 5}" y="${sy(0) + 4}" font-size="11" font-weight="700" fill="#64748b" font-family="sans-serif">x</text>
      <text x="${padL - 5}" y="${padT - 6}" font-size="11" font-weight="700" fill="#64748b" font-family="sans-serif">y</text>
    `;

    const interX = Math.min(aVal, xMax);
    const interDot = `
      <circle cx="${sx(0)}" cy="${sy(0)}" r="4" fill="#0f172a" stroke="#ffffff" stroke-width="2"/>
      <circle cx="${sx(interX)}" cy="${sy(interX * interX)}" r="4.5" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
      <text x="${sx(interX) + 6}" y="${sy(interX * interX) - 6}" font-size="11" font-weight="700" fill="#0284c7" font-family="sans-serif">(${interX.toFixed(2)}, ${(interX * interX).toFixed(2)})</text>
    `;

    return `
      <div style="margin-top: 1.25rem;">
        <div style="font-size: 0.8rem; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
          <span>Visualizador Dinámico de Particiones de Riemann (n = ${nVal})</span>
          <span style="font-size: 0.75rem; color: #64748b; font-weight: 500;">Azul: f(x)=${aVal.toFixed(1)}x • Naranja: g(x)=x²</span>
        </div>
        <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block; background: #fafafa; border-radius: 8px; border: 1px solid #bae6fd; box-shadow: inset 0 1px 3px rgba(0,0,0,0.03);">
          ${gridSvg}
          ${axesSvg}
          ${rectsSvg}
          <path d="${fPath}" fill="none" stroke="#0284c7" stroke-width="2.5"/>
          <path d="${gPath}" fill="none" stroke="#ea580c" stroke-width="2.5"/>
          ${interDot}
        </svg>
      </div>
    `;
  };

  const buildRevolutionSvg = (
    alphaVal: number,
    sliceVal: number,
    slice: ReturnType<typeof computeCrossSection>
  ): string => {
    const width = 720;
    const height = 230;

    const cx1 = 180;
    const cy1 = 115;
    const maxR = 85;
    const R_px = Math.max(8, Math.min(maxR, slice.outerRadius * maxR));
    const r_px = Math.max(3, Math.min(R_px - 3, slice.innerRadius * maxR));

    const cx2 = 530;
    const cy2 = 115;
    const gaugeR = 60;
    const twoPi = 2 * Math.PI;

    const polarToCartesian = (cx: number, cy: number, r: number, angleInRadians: number) => {
      return {
        x: cx + r * Math.cos(angleInRadians - Math.PI / 2),
        y: cy + r * Math.sin(angleInRadians - Math.PI / 2),
      };
    };

    const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
      const start = polarToCartesian(cx, cy, r, endAngle);
      const end = polarToCartesian(cx, cy, r, startAngle);
      const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';
      return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
    };

    const primaryAngle = Math.min(alphaVal, twoPi);
    const primaryArc = primaryAngle > 0.05
      ? describeArc(cx2, cy2, gaugeR, 0, Math.min(primaryAngle, 2 * Math.PI - 0.001))
      : '';

    const excessAngle = alphaVal > twoPi ? Math.min(alphaVal - twoPi, Math.PI) : 0;
    const excessArc = excessAngle > 0.05
      ? describeArc(cx2, cy2, gaugeR + 15, 0, Math.min(excessAngle, Math.PI - 0.001))
      : '';

    return `
      <div style="margin-top: 1.25rem;">
        <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block; background: #fafafa; border-radius: 8px; border: 1px solid #c7d2fe; box-shadow: inset 0 1px 3px rgba(0,0,0,0.03);">
          <!-- Divider -->
          <line x1="360" y1="20" x2="360" y2="210" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="4,4"/>

          <!-- LEFT: Washer Cross-Section -->
          <text x="${cx1}" y="28" font-size="12" font-weight="700" fill="#312e81" text-anchor="middle" font-family="sans-serif">Disco de Corte (Arandela en x = ${sliceVal.toFixed(2)})</text>
          
          <!-- Outer Circle R -->
          <circle cx="${cx1}" cy="${cy1}" r="${R_px}" fill="rgba(99, 102, 241, 0.28)" stroke="#4338ca" stroke-width="2.2"/>
          <!-- Inner Circle r -->
          <circle cx="${cx1}" cy="${cy1}" r="${r_px}" fill="#ffffff" stroke="#6366f1" stroke-width="1.8" stroke-dasharray="3,3"/>
          <!-- Center -->
          <circle cx="${cx1}" cy="${cy1}" r="3" fill="#4338ca"/>

          <!-- Dimension R -->
          <line x1="${cx1}" y1="${cy1}" x2="${cx1 + R_px}" y2="${cy1}" stroke="#4338ca" stroke-width="1.5"/>
          <text x="${cx1 + R_px / 2}" y="${cy1 - 4}" font-size="10" font-weight="700" fill="#4338ca" text-anchor="middle" font-family="sans-serif">R=${slice.outerRadius.toFixed(2)}</text>
          
          <!-- Dimension r -->
          <line x1="${cx1}" y1="${cy1}" x2="${cx1}" y2="${cy1 - r_px}" stroke="#6366f1" stroke-width="1.2"/>
          <text x="${cx1 - 12}" y="${cy1 - r_px / 2 + 3}" font-size="9" font-weight="700" fill="#6366f1" text-anchor="end" font-family="sans-serif">r=${slice.innerRadius.toFixed(2)}</text>

          <!-- Label below washer -->
          <text x="${cx1}" y="${cy1 + maxR + 14}" font-size="11" font-weight="600" fill="#475569" text-anchor="middle" font-family="sans-serif">Área: A = π(R² - r²) ≈ ${slice.washerArea.toFixed(4)}</text>

          <!-- RIGHT: 3π Sweep Gauge -->
          <text x="${cx2}" y="28" font-size="12" font-weight="700" fill="#312e81" text-anchor="middle" font-family="sans-serif">Medidor Cinemático de Giro (0 a 3π)</text>

          <!-- Track Circle -->
          <circle cx="${cx2}" cy="${cy2}" r="${gaugeR}" fill="none" stroke="#e2e8f0" stroke-width="12"/>

          <!-- Primary 2pi Arc -->
          ${primaryArc ? `<path d="${primaryArc}" fill="none" stroke="#4f46e5" stroke-width="12" stroke-linecap="round"/>` : ''}

          <!-- Outer 3pi Arc if alpha > 2pi -->
          ${excessArc ? `<path d="${excessArc}" fill="none" stroke="#f59e0b" stroke-width="8" stroke-linecap="round"/>` : ''}

          <!-- Center Angle Text -->
          <text x="${cx2}" y="${cy2 - 2}" font-size="17" font-weight="800" fill="#1e1b4b" text-anchor="middle" font-family="sans-serif">${(alphaVal / Math.PI).toFixed(2)}π</text>
          <text x="${cx2}" y="${cy2 + 16}" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle" font-family="sans-serif">${alphaVal.toFixed(2)} rad</text>

          <!-- 2pi indicator mark -->
          <circle cx="${cx2}" cy="${cy2 - gaugeR}" r="4" fill="#4f46e5" stroke="#ffffff" stroke-width="1.5"/>
          <text x="${cx2}" y="${cy2 - gaugeR - 8}" font-size="10" font-weight="700" fill="#4f46e5" text-anchor="middle" font-family="sans-serif">2π</text>

          <!-- Subtitle badge below gauge -->
          <text x="${cx2}" y="${cy2 + gaugeR + 22}" font-size="11" font-weight="700" fill="${alphaVal > twoPi ? '#b45309' : '#4338ca'}" text-anchor="middle" font-family="sans-serif">
            ${alphaVal > twoPi ? '✦ Giro extendido a 3π (Volumen fijo)' : '✦ Barrido dentro de primera revolución'}
          </text>
        </svg>
      </div>
    `;
  };

  const renderRiemannAnalysisCard = (sheet: HTMLElement) => {
    const card = document.createElement('div');
    card.className = 'bwjm-node-card';
    card.style.border = '2px solid #38bdf8';

    const cardHeader = document.createElement('div');
    cardHeader.className = 'bwjm-node-header';
    cardHeader.style.background = '#e0f2fe';
    const tag = document.createElement('strong');
    tag.style.color = '#0284c7';
    tag.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      Motor Científico BWJM • Análisis de Área & Riemann
    `;
    cardHeader.appendChild(tag);
    card.appendChild(cardHeader);

    const cardBody = document.createElement('div');
    cardBody.className = 'bwjm-node-body';

    const updateMetrics = () => {
      const nVal = coreRef.current?.getVariable('n') ?? 10;
      const aVal = coreRef.current?.getVariable('a') ?? 1.0;

      const intersections = findIntersections('a * x', 'x^2', [0, 2], { a: aVal });
      const exact = computeExactArea('a * x', 'x^2', [0, 1], { a: aVal });
      const partition = computeRiemannPartition('a * x', 'x^2', [0, 1], nVal, 'midpoint', { a: aVal });
      const interText = intersections.map((p) => `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`).join(' y ');
      const svgDiagram = buildRiemannSvg(aVal, nVal, partition);

      cardBody.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
          <div style="background: #ffffff; padding: 0.85rem; border-radius: 8px; border: 1px solid #bae6fd;">
            <div style="font-size: 0.75rem; color: #0284c7; font-weight: 700; text-transform: uppercase;">Puntos de Cruce</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-top: 0.2rem;">${interText || 'Calculando...'}</div>
          </div>
          <div style="background: #ffffff; padding: 0.85rem; border-radius: 8px; border: 1px solid #bae6fd;">
            <div style="font-size: 0.75rem; color: #0284c7; font-weight: 700; text-transform: uppercase;">Área Exacta (Analítica)</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-top: 0.2rem;">
              ${exact.exactFraction ? `A = ${exact.exactFraction} ≈ ` : ''}${exact.value.toFixed(5)}
            </div>
          </div>
          <div style="background: #ffffff; padding: 0.85rem; border-radius: 8px; border: 1px solid #bae6fd;">
            <div style="font-size: 0.75rem; color: #0284c7; font-weight: 700; text-transform: uppercase;">Suma de Riemann (n = ${nVal})</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-top: 0.2rem;">S_n = ${partition.riemannSum.toFixed(5)}</div>
          </div>
          <div style="background: #ffffff; padding: 0.85rem; border-radius: 8px; border: 1px solid #fed7aa;">
            <div style="font-size: 0.75rem; color: #c2410c; font-weight: 700; text-transform: uppercase;">Error de Aproximación</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: #ea580c; margin-top: 0.2rem;">|Error| = ${partition.error.toFixed(6)}</div>
          </div>
        </div>
        ${svgDiagram}
        <p style="font-size: 0.88rem; color: #475569; margin: 1rem 0 0 0;">
          💡 <strong>Demostración de convergencia:</strong> Pulsa el botón <strong>Play</strong> en el slider de <code>n</code> para ver cómo los ${nVal} rectángulos aproximan el área exacta con error tendiendo a cero.
        </p>
      `;
    };

    updateMetrics();
    liveAnalysisRef.current = updateMetrics;

    card.appendChild(cardBody);
    sheet.appendChild(card);
  };

  const renderRevolutionAnalysisCard = (sheet: HTMLElement) => {
    const card = document.createElement('div');
    card.className = 'bwjm-node-card';
    card.style.border = '2px solid #818cf8';

    const cardHeader = document.createElement('div');
    cardHeader.className = 'bwjm-node-header';
    cardHeader.style.background = '#e0e7ff';
    const tag = document.createElement('strong');
    tag.style.color = '#4338ca';
    tag.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px;"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      Motor Científico BWJM • Sólido de Revolución & Ley de 2π
    `;
    cardHeader.appendChild(tag);
    card.appendChild(cardHeader);

    const cardBody = document.createElement('div');
    cardBody.className = 'bwjm-node-body';

    const metricsBox = document.createElement('div');
    cardBody.appendChild(metricsBox);

    const updateMetrics = () => {
      const alphaVal = coreRef.current?.getVariable('alpha') ?? 6.28;
      const rev = computeRevolutionVolume('x', 'x^2', [0, 1], 'x', alphaVal);
      const slice = computeCrossSection('x', 'x^2', sliceX);
      const svgDiagram = buildRevolutionSvg(alphaVal, sliceX, slice);

      metricsBox.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
          <div style="background: #ffffff; padding: 0.85rem; border-radius: 8px; border: 1px solid #c7d2fe;">
            <div style="font-size: 0.75rem; color: #4338ca; font-weight: 700; text-transform: uppercase;">Ángulo de Giro (α)</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-top: 0.2rem;">${alphaVal.toFixed(2)} rad (${(alphaVal / Math.PI).toFixed(2)}π)</div>
          </div>
          <div style="background: #ffffff; padding: 0.85rem; border-radius: 8px; border: 1px solid #c7d2fe;">
            <div style="font-size: 0.75rem; color: #4338ca; font-weight: 700; text-transform: uppercase;">Volumen del Sólido</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-top: 0.2rem;">
              V = ${rev.exactFractionOfPi ? `${rev.exactFractionOfPi}π ≈ ` : ''}${rev.volume.toFixed(5)}
            </div>
          </div>
          <div style="background: #ffffff; padding: 0.85rem; border-radius: 8px; border: 1px solid #c7d2fe;">
            <div style="font-size: 0.75rem; color: #4338ca; font-weight: 700; text-transform: uppercase;">Corte Transversal x = ${sliceX.toFixed(2)}</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-top: 0.2rem;">R = ${slice.outerRadius.toFixed(2)} | r = ${slice.innerRadius.toFixed(2)}</div>
          </div>
          <div style="background: #ffffff; padding: 0.85rem; border-radius: 8px; border: 1px solid #c7d2fe;">
            <div style="font-size: 0.75rem; color: #4338ca; font-weight: 700; text-transform: uppercase;">Área de la Arandela</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-top: 0.2rem;">A(x) = ${slice.washerArea.toFixed(4)}</div>
          </div>
        </div>
        ${svgDiagram}
        <div style="margin-top: 0.8rem; background: #eef2ff; padding: 0.85rem; border-radius: 6px; font-size: 0.88rem; color: #312e81;">
          ⚖️ <strong>Regla geométrica (Sección 4 de la Especificación):</strong> 
          ${alphaVal > 2 * Math.PI
            ? `Has superado 2π (giro actual: ${(alphaVal / Math.PI).toFixed(2)}π). La trayectoria angular continúa visualizándose en la animación, pero el volumen del conjunto espacial permanece constante en <strong>2π/15 ≈ 0.41888</strong>.`
            : `Volumen en desarrollo progresivo (cobertura angular actual: ${(alphaVal / Math.PI).toFixed(2)}π).`
          }
        </div>
      `;
    };

    updateMetrics();
    liveAnalysisRef.current = updateMetrics;

    const sliceControl = document.createElement('div');
    sliceControl.style.marginTop = '1rem';
    sliceControl.style.display = 'flex';
    sliceControl.style.alignItems = 'center';
    sliceControl.style.gap = '0.75rem';
    sliceControl.innerHTML = `
      <label style="font-size: 0.82rem; font-weight: 700; color: #4338ca;">Deslizar Plano de Corte (x):</label>
      <input type="range" class="bwjm-range-input" min="0.05" max="0.95" step="0.05" value="${sliceX}" />
      <span class="bwjm-slider-val" style="background: #e0e7ff; color: #4338ca;">x = ${sliceX.toFixed(2)}</span>
    `;
    const sliceInput = sliceControl.querySelector('input');
    sliceInput?.addEventListener('input', (e) => {
      setSliceX(parseFloat((e.target as HTMLInputElement).value));
    });
    cardBody.appendChild(sliceControl);

    card.appendChild(cardBody);
    sheet.appendChild(card);
  };

  const renderMathNode = (node: MathMDNode, container: HTMLDivElement) => {
    if (!coreRef.current) return;
    const processedData = coreRef.current.getNodeData(node.id);

    if (node.type === 'slider') {
      renderSlider(node as SliderNode, container);
    } else if (node.type === 'checkbox') {
      renderCheckbox(node as CheckboxNode, container);
    } else if (node.type === 'surface3d') {
      const display = document.createElement('div');
      display.style.width = '100%';
      display.style.height = '420px';
      container.appendChild(display);
      const renderer = new PlotlyRenderer(display);
      renderer.render(processedData);
      plotlyRenderersRef.current.set(node.id, renderer);
    } else if (node.type === 'plot2d' || node.type === 'vector2d') {
      const display = document.createElement('div');
      display.style.width = '100%';
      display.style.height = '350px';
      container.appendChild(display);
      const renderer = new SVGRenderer(display, container.clientWidth || 700, 350);
      renderer.render(processedData);
      svgRenderersRef.current.set(node.id, renderer);
    }
  };

  const renderSlider = (node: SliderNode, container: HTMLDivElement) => {
    const { name, min = 0, max = 10, step = 0.1, default: defaultValue = 0 } = node;
    const core = coreRef.current!;
    const currentVal = core.getVariable(name) ?? defaultValue;

    const row = document.createElement('div');
    row.className = 'bwjm-slider-row';

    const playBtn = document.createElement('button');
    playBtn.className = 'bwjm-play-btn';
    playBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    playBtn.title = 'Animar parámetro';

    const label = document.createElement('strong');
    label.style.minWidth = '50px';
    label.style.color = '#334155';
    label.textContent = `${name}: `;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'bwjm-range-input';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(currentVal);

    const valDisplay = document.createElement('span');
    valDisplay.className = 'bwjm-slider-val';
    valDisplay.textContent = Number(currentVal).toFixed(step < 1 ? 2 : 0);

    const updateValue = (nextVal: number) => {
      slider.value = String(nextVal);
      valDisplay.textContent = Number(nextVal).toFixed(step < 1 ? 2 : 0);
      core.setVariable(name, nextVal);
      refreshDependentNodes();
    };

    slider.addEventListener('input', (e) => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      updateValue(v);
    });

    let isPlaying = false;
    playBtn.addEventListener('click', () => {
      if (isPlaying) {
        const timerId = activeTimersRef.current.get(name);
        if (timerId) window.clearInterval(timerId);
        activeTimersRef.current.delete(name);
        isPlaying = false;
        playBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
        playBtn.classList.remove('playing');
      } else {
        isPlaying = true;
        playBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
        playBtn.classList.add('playing');
        let direction = 1;

        const timerId = window.setInterval(() => {
          let next = parseFloat(slider.value) + direction * step;
          if (next >= max) {
            next = max;
            direction = -1;
          } else if (next <= min) {
            next = min;
            direction = 1;
          }
          updateValue(Number(next.toFixed(4)));
        }, 60);

        activeTimersRef.current.set(name, timerId);
      }
    });

    row.appendChild(playBtn);
    row.appendChild(label);
    row.appendChild(slider);
    row.appendChild(valDisplay);
    container.appendChild(row);
  };

  const renderCheckbox = (node: CheckboxNode, container: HTMLDivElement) => {
    const { name, label: labelText, default: defaultValue = false } = node;
    const core = coreRef.current!;
    const currentVal = !!(core.getVariable(name) ?? defaultValue);

    const row = document.createElement('label');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '0.5rem';
    row.style.cursor = 'pointer';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = currentVal;

    checkbox.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      core.setVariable(name, checked ? 1 : 0);
      refreshDependentNodes();
    });

    const label = document.createElement('span');
    label.textContent = labelText || name;

    row.appendChild(checkbox);
    row.appendChild(label);
    container.appendChild(row);
  };

  const refreshDependentNodes = () => {
    if (!coreRef.current) return;
    plotlyRenderersRef.current.forEach((renderer, nodeId) => {
      const data = coreRef.current!.getNodeData(nodeId);
      renderer.render(data);
    });
    svgRenderersRef.current.forEach((renderer, nodeId) => {
      const data = coreRef.current!.getNodeData(nodeId);
      renderer.render(data);
    });
    if (liveAnalysisRef.current) {
      liveAnalysisRef.current();
    }
  };

  const handleOpenFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (typeof content === 'string') {
        setFilename(file.name);
        setMarkdown(content);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveFile = () => {
    const blob = new Blob([markdown], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.bwjm') ? filename : `${filename}.bwjm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSelectTemplate = (key: string) => {
    setSelectedTemplate(key);
    const sample = SAMPLE_LESSONS[key];
    if (sample) {
      setFilename(sample.filename);
      setMarkdown(sample.content);
    }
  };

  return (
    <>
      <header className="bwjm-navbar">
        <div className="bwjm-brand">
          <span className="bwjm-logo-badge">
            <IconAtom />
            BWJM
          </span>
          <span className="bwjm-title">BWJM Studio</span>
          <span className="bwjm-filename-tag">{filename}</span>
        </div>

        <div className="bwjm-nav-actions">
          <div className="bwjm-select-wrapper">
            <select
              className="bwjm-select"
              value={selectedTemplate}
              onChange={(e) => handleSelectTemplate(e.target.value)}
            >
              {Object.entries(SAMPLE_LESSONS).map(([k, s]) => (
                <option key={k} value={k}>
                  {s.title}
                </option>
              ))}
            </select>
            <span className="bwjm-select-arrow">
              <IconChevronDown />
            </span>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".bwjm,.jm,.md"
            onChange={handleOpenFile}
          />
          <button className="bwjm-btn" onClick={() => fileInputRef.current?.click()} title="Abrir archivo .bwjm local">
            <IconFolderOpen />
            <span>Abrir .bwjm</span>
          </button>

          <button className="bwjm-btn bwjm-btn-primary" onClick={handleSaveFile} title="Guardar documento .bwjm">
            <IconDownload />
            <span>Guardar .bwjm</span>
          </button>

          <div className="bwjm-mode-switch">
            <button
              className={`bwjm-mode-btn ${mode === 'split' ? 'active' : ''}`}
              onClick={() => setMode('split')}
            >
              <IconCode />
              <span>Editor</span>
            </button>
            <button
              className={`bwjm-mode-btn ${mode === 'reader' ? 'active' : ''}`}
              onClick={() => setMode('reader')}
            >
              <IconBookOpen />
              <span>Modo Lector</span>
            </button>
          </div>
        </div>
      </header>

      <main className={`bwjm-workspace ${mode === 'reader' ? 'mode-reader' : ''}`}>
        <section className="bwjm-editor-panel">
          <div className="bwjm-panel-header">
            <span>Editor de Código .bwjm</span>
            <span>{markdown.length} caracteres</span>
          </div>
          <div className="bwjm-editor-container">
            <textarea
              className="bwjm-textarea"
              value={markdown}
              spellCheck={false}
              onChange={(e) => setMarkdown(e.target.value)}
            />
          </div>
        </section>

        <section className="bwjm-preview-panel">
          <div ref={sheetRef} className="bwjm-preview-container" />
        </section>
      </main>
    </>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<BWJMStudio />);
}
