import fs from 'node:fs';
import path from 'node:path';

const outDir = 'e:/mathmd/docs/images';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Diagrama de Riemann & Área entre Curvas
const riemannSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 440" width="100%" height="100%" style="background:#0f172a; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0369a1" />
    </linearGradient>
    <linearGradient id="rectGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0.15" />
    </linearGradient>
  </defs>

  <!-- Card background -->
  <rect x="15" y="15" width="870" height="410" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5" />

  <!-- Header -->
  <rect x="15" y="15" width="870" height="50" rx="12" fill="#0f172a" />
  <rect x="15" y="55" width="870" height="10" fill="#0f172a" />
  <line x1="15" y1="65" x2="885" y2="65" stroke="#334155" stroke-width="1" />
  <text x="35" y="46" font-size="15" font-weight="700" fill="#38bdf8" letter-spacing="0.5">BWJM STUDIO | FASE 2: AREA ENTRE CURVAS Y SUMAS DE RIEMANN</text>
  <rect x="730" y="30" width="135" height="24" rx="12" fill="#0369a1" fill-opacity="0.3" stroke="#0284c7" stroke-width="1" />
  <text x="797" y="46" font-size="11" font-weight="600" fill="#7dd3fc" text-anchor="middle">CONVERGENCIA ACTIVA</text>

  <!-- Metric Badges Row -->
  <g transform="translate(35, 80)">
    <!-- Metric 1 -->
    <rect x="0" y="0" width="190" height="56" rx="8" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
    <text x="12" y="20" font-size="10" font-weight="700" fill="#38bdf8" letter-spacing="0.5">PUNTOS DE INTERSECCION</text>
    <text x="12" y="44" font-size="15" font-weight="800" fill="#f8fafc">(0.00, 0.00) y (1.00, 1.00)</text>

    <!-- Metric 2 -->
    <rect x="210" y="0" width="190" height="56" rx="8" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
    <text x="222" y="20" font-size="10" font-weight="700" fill="#38bdf8" letter-spacing="0.5">AREA EXACTA ANALITICA</text>
    <text x="222" y="44" font-size="15" font-weight="800" fill="#38bdf8">A = 1/6 ≈ 0.16667</text>

    <!-- Metric 3 -->
    <rect x="420" y="0" width="190" height="56" rx="8" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
    <text x="432" y="20" font-size="10" font-weight="700" fill="#38bdf8" letter-spacing="0.5">SUMA DE RIEMANN (n = 10)</text>
    <text x="432" y="44" font-size="15" font-weight="800" fill="#f8fafc">S_n = 0.16625</text>

    <!-- Metric 4 -->
    <rect x="630" y="0" width="200" height="56" rx="8" fill="#0f172a" stroke="#ea580c" stroke-width="1" />
    <text x="642" y="20" font-size="10" font-weight="700" fill="#fb923c" letter-spacing="0.5">ERROR RESIDUAL</text>
    <text x="642" y="44" font-size="15" font-weight="800" fill="#f97316">|Error| = 0.000417</text>
  </g>

  <!-- Visual Canvas Area -->
  <g transform="translate(35, 150)">
    <rect x="0" y="0" width="830" height="255" rx="8" fill="#090e1a" stroke="#1e293b" stroke-width="1" />

    <!-- Grid lines -->
    <line x1="80" y1="210" x2="780" y2="210" stroke="#334155" stroke-width="1.5" />
    <line x1="80" y1="210" x2="80" y2="30" stroke="#334155" stroke-width="1.5" />

    <line x1="200" y1="30" x2="200" y2="210" stroke="#1e293b" stroke-width="1" stroke-dasharray="3,3" />
    <line x1="320" y1="30" x2="320" y2="210" stroke="#1e293b" stroke-width="1" stroke-dasharray="3,3" />
    <line x1="440" y1="30" x2="440" y2="210" stroke="#1e293b" stroke-width="1" stroke-dasharray="3,3" />
    <line x1="560" y1="30" x2="560" y2="210" stroke="#1e293b" stroke-width="1" stroke-dasharray="3,3" />
    <line x1="680" y1="30" x2="680" y2="210" stroke="#1e293b" stroke-width="1" stroke-dasharray="3,3" />

    <text x="80" y="226" font-size="11" fill="#64748b" text-anchor="middle">0.0</text>
    <text x="200" y="226" font-size="11" fill="#64748b" text-anchor="middle">0.2</text>
    <text x="320" y="226" font-size="11" fill="#64748b" text-anchor="middle">0.4</text>
    <text x="440" y="226" font-size="11" fill="#64748b" text-anchor="middle">0.6</text>
    <text x="560" y="226" font-size="11" fill="#64748b" text-anchor="middle">0.8</text>
    <text x="680" y="226" font-size="11" fill="#38bdf8" font-weight="700" text-anchor="middle">1.0 (Limite)</text>
    <text x="790" y="214" font-size="12" fill="#94a3b8" font-weight="700">x</text>
    <text x="70" y="25" font-size="12" fill="#94a3b8" font-weight="700">y</text>

    <!-- Riemann Rectangles (10 partitions from x=0 to x=1, length 600px, 60px each) -->
    <!-- i=0: [0, 0.1], mid=0.05, f=0.05, g=0.0025, h=0.0475 -->
    <rect x="80" y="202.9" width="60" height="7.1" fill="url(#rectGrad)" stroke="#0284c7" stroke-width="1" />
    <!-- i=1: [0.1, 0.2], mid=0.15, f=0.15, g=0.0225, h=0.1275 -->
    <rect x="140" y="190.9" width="60" height="19.1" fill="url(#rectGrad)" stroke="#0284c7" stroke-width="1" />
    <!-- i=2: [0.2, 0.3], mid=0.25, f=0.25, g=0.0625, h=0.1875 -->
    <rect x="200" y="181.9" width="60" height="28.1" fill="url(#rectGrad)" stroke="#0284c7" stroke-width="1" />
    <!-- i=3: [0.3, 0.4], mid=0.35, f=0.35, g=0.1225, h=0.2275 -->
    <rect x="260" y="175.9" width="60" height="34.1" fill="url(#rectGrad)" stroke="#0284c7" stroke-width="1" />
    <!-- i=4: [0.4, 0.5], mid=0.45, f=0.45, g=0.2025, h=0.2475 -->
    <rect x="320" y="172.9" width="60" height="37.1" fill="url(#rectGrad)" stroke="#0284c7" stroke-width="1" />
    <!-- i=5: [0.5, 0.6], mid=0.55, f=0.55, g=0.3025, h=0.2475 -->
    <rect x="380" y="172.9" width="60" height="37.1" fill="url(#rectGrad)" stroke="#0284c7" stroke-width="1" />
    <!-- i=6: [0.6, 0.7], mid=0.65, f=0.65, g=0.4225, h=0.2275 -->
    <rect x="440" y="175.9" width="60" height="34.1" fill="url(#rectGrad)" stroke="#0284c7" stroke-width="1" />
    <!-- i=7: [0.7, 0.8], mid=0.75, f=0.75, g=0.5625, h=0.1875 -->
    <rect x="500" y="181.9" width="60" height="28.1" fill="url(#rectGrad)" stroke="#0284c7" stroke-width="1" />
    <!-- i=8: [0.8, 0.9], mid=0.85, f=0.85, g=0.7225, h=0.1275 -->
    <rect x="560" y="190.9" width="60" height="19.1" fill="url(#rectGrad)" stroke="#0284c7" stroke-width="1" />
    <!-- i=9: [0.9, 1.0], mid=0.95, f=0.95, g=0.9025, h=0.0475 -->
    <rect x="620" y="202.9" width="60" height="7.1" fill="url(#rectGrad)" stroke="#0284c7" stroke-width="1" />

    <!-- Curve f(x) = x (line from (80, 210) to (680, 60)) -->
    <line x1="80" y1="210" x2="740" y2="45" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" />

    <!-- Curve g(x) = x^2 (parabola from (80, 210) to (680, 60)) -->
    <path d="M 80 210 Q 380 210 680 60 L 740 30" fill="none" stroke="#f97316" stroke-width="3" stroke-linecap="round" />

    <!-- Intersection Points -->
    <circle cx="80" cy="210" r="5" fill="#f8fafc" stroke="#0284c7" stroke-width="2" />
    <text x="92" y="205" font-size="11" font-weight="700" fill="#f8fafc">P1(0, 0)</text>

    <circle cx="680" cy="60" r="5.5" fill="#38bdf8" stroke="#ffffff" stroke-width="2" />
    <text x="692" y="60" font-size="11" font-weight="700" fill="#38bdf8">P2(1, 1)</text>

    <!-- Legend Overlay -->
    <rect x="530" y="10" width="280" height="65" rx="6" fill="#0f172a" fill-opacity="0.85" stroke="#334155" stroke-width="1" />
    <line x1="545" y1="25" x2="570" y2="25" stroke="#38bdf8" stroke-width="3" />
    <text x="580" y="29" font-size="11" font-weight="600" fill="#f8fafc">f(x) = a * x (Curva Superior)</text>

    <line x1="545" y1="45" x2="570" y2="45" stroke="#f97316" stroke-width="3" />
    <text x="580" y="49" font-size="11" font-weight="600" fill="#f8fafc">g(x) = x^2 (Curva Inferior)</text>

    <rect x="545" y="55" width="25" height="10" fill="#0284c7" fill-opacity="0.4" stroke="#0284c7" stroke-width="1" />
    <text x="580" y="64" font-size="10" font-weight="500" fill="#94a3b8">Particiones Riemann (Δx = 0.1)</text>
  </g>
</svg>
`;

fs.writeFileSync(path.join(outDir, '02-area-entre-curvas-riemann.svg'), riemannSvg.trim());

// 2. Diagrama de Sólidos de Revolución & Ley de 2pi
const revolutionSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 440" width="100%" height="100%" style="background:#0f172a; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!-- Card background -->
  <rect x="15" y="15" width="870" height="410" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5" />

  <!-- Header -->
  <rect x="15" y="15" width="870" height="50" rx="12" fill="#0f172a" />
  <rect x="15" y="55" width="870" height="10" fill="#0f172a" />
  <line x1="15" y1="65" x2="885" y2="65" stroke="#334155" stroke-width="1" />
  <text x="35" y="46" font-size="15" font-weight="700" fill="#a5b4fc" letter-spacing="0.5">BWJM STUDIO | FASE 3: SOLIDOS DE REVOLUCION Y LEY DE 2PI</text>
  <rect x="700" y="30" width="165" height="24" rx="12" fill="#4338ca" fill-opacity="0.3" stroke="#6366f1" stroke-width="1" />
  <text x="782" y="46" font-size="11" font-weight="600" fill="#c7d2fe" text-anchor="middle">BARRIDO 0 A 3PI RAD</text>

  <!-- Metric Badges Row -->
  <g transform="translate(35, 80)">
    <rect x="0" y="0" width="190" height="56" rx="8" fill="#0f172a" stroke="#818cf8" stroke-width="1" />
    <text x="12" y="20" font-size="10" font-weight="700" fill="#a5b4fc" letter-spacing="0.5">ANGULO DE GIRO (α)</text>
    <text x="12" y="44" font-size="15" font-weight="800" fill="#f8fafc">α = 9.42 rad (3.00π)</text>

    <rect x="210" y="0" width="190" height="56" rx="8" fill="#0f172a" stroke="#818cf8" stroke-width="1" />
    <text x="222" y="20" font-size="10" font-weight="700" fill="#a5b4fc" letter-spacing="0.5">VOLUMEN DEL SOLIDO</text>
    <text x="222" y="44" font-size="15" font-weight="800" fill="#818cf8">V = 2π/15 ≈ 0.41888</text>

    <rect x="420" y="0" width="190" height="56" rx="8" fill="#0f172a" stroke="#818cf8" stroke-width="1" />
    <text x="432" y="20" font-size="10" font-weight="700" fill="#a5b4fc" letter-spacing="0.5">CORTE EN PLANO x = 0.50</text>
    <text x="432" y="44" font-size="15" font-weight="800" fill="#f8fafc">R = 0.50 | r = 0.25</text>

    <rect x="630" y="0" width="200" height="56" rx="8" fill="#0f172a" stroke="#f59e0b" stroke-width="1" />
    <text x="642" y="20" font-size="10" font-weight="700" fill="#fbbf24" letter-spacing="0.5">LEY DE 2PI (SECCION 4)</text>
    <text x="642" y="44" font-size="14" font-weight="800" fill="#f59e0b">Volumen Constante</text>
  </g>

  <!-- Interactive Dual Visualization Canvas -->
  <g transform="translate(35, 150)">
    <rect x="0" y="0" width="830" height="255" rx="8" fill="#090e1a" stroke="#1e293b" stroke-width="1" />

    <!-- Center vertical separator -->
    <line x1="415" y1="20" x2="415" y2="235" stroke="#1e293b" stroke-width="1.5" stroke-dasharray="5,5" />

    <!-- LEFT PANEL: Washer Cross Section -->
    <g transform="translate(200, 125)">
      <!-- Title -->
      <text x="0" y="-95" font-size="13" font-weight="700" fill="#c7d2fe" text-anchor="middle">SECCION TRANSVERSAL (METODO DE ARANDELAS)</text>

      <!-- Outer circle R -->
      <circle cx="0" cy="0" r="80" fill="#4338ca" fill-opacity="0.25" stroke="#6366f1" stroke-width="2" />
      <!-- Inner hole r -->
      <circle cx="0" cy="0" r="40" fill="#090e1a" stroke="#818cf8" stroke-width="1.5" stroke-dasharray="4,4" />
      <circle cx="0" cy="0" r="3.5" fill="#f8fafc" />

      <!-- Outer radius arrow -->
      <line x1="0" y1="0" x2="80" y2="0" stroke="#a5b4fc" stroke-width="1.5" />
      <circle cx="80" cy="0" r="3" fill="#a5b4fc" />
      <text x="40" y="-6" font-size="10" font-weight="700" fill="#a5b4fc" text-anchor="middle">R(x) = x = 0.50</text>

      <!-- Inner radius arrow -->
      <line x1="0" y1="0" x2="0" y2="-40" stroke="#f43f5e" stroke-width="1.5" />
      <circle cx="0" cy="-40" r="2.5" fill="#f43f5e" />
      <text x="-8" y="-20" font-size="9" font-weight="700" fill="#fda4af" text-anchor="end">r(x) = x² = 0.25</text>

      <!-- Washer area calculation -->
      <text x="0" y="98" font-size="12" font-weight="600" fill="#94a3b8" text-anchor="middle">
        Area de Arandela: A(x) = π(R² - r²) = 3π/16 ≈ 0.58905
      </text>
    </g>

    <!-- RIGHT PANEL: 0 to 3pi Sweep Gauge -->
    <g transform="translate(625, 125)">
      <text x="0" y="-95" font-size="13" font-weight="700" fill="#c7d2fe" text-anchor="middle">MEDIDOR CINEMATICO DE BARRIDO ANGULAR</text>

      <!-- Base circle track -->
      <circle cx="0" cy="0" r="65" fill="none" stroke="#1e293b" stroke-width="14" />

      <!-- Primary 2pi complete rotation track (Indigo) -->
      <circle cx="0" cy="0" r="65" fill="none" stroke="#6366f1" stroke-width="14" stroke-linecap="round" />

      <!-- Secondary rotation 2pi to 3pi (Amber gold arc) -->
      <circle cx="0" cy="0" r="82" fill="none" stroke="#f59e0b" stroke-width="8" stroke-dasharray="257 515" stroke-linecap="round" transform="rotate(-90)" />

      <!-- Center angle reading -->
      <text x="0" y="-3" font-size="20" font-weight="800" fill="#f8fafc" text-anchor="middle">3.00π</text>
      <text x="0" y="18" font-size="12" font-weight="600" fill="#94a3b8" text-anchor="middle">9.42 rad</text>

      <!-- Marker at 2pi -->
      <circle cx="0" cy="-65" r="4.5" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5" />
      <text x="0" y="-76" font-size="10" font-weight="800" fill="#fbbf24" text-anchor="middle">2π (Limite de Volumen)</text>

      <!-- Status notice -->
      <rect x="-160" y="85" width="320" height="26" rx="13" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b" stroke-width="1" />
      <text x="0" y="102" font-size="11" font-weight="700" fill="#fde68a" text-anchor="middle">SECCION 4: BARRIDO EXTENDIDO (+1.00π)</text>
    </g>
  </g>
</svg>
`;

fs.writeFileSync(path.join(outDir, '03-solido-revolucion-3pi.svg'), revolutionSvg.trim());

// 3. Diagrama de Arquitectura del Formato BWJM
const archSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 400" width="100%" height="100%" style="background:#0b1120; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <rect x="15" y="15" width="870" height="370" rx="12" fill="#131d33" stroke="#1e293b" stroke-width="1.5" />

  <!-- Title -->
  <text x="450" y="48" font-size="16" font-weight="800" fill="#38bdf8" text-anchor="middle" letter-spacing="0.5">ARQUITECTURA DEL MOTOR CIENTIFICO NATIVO BWJM</text>
  <text x="450" y="68" font-size="12" fill="#94a3b8" text-anchor="middle">Flujo de ejecucion determinista sin dependencia de archivos .html intermediarios</text>

  <!-- Flow Boxes -->
  <!-- Box 1: Documento .bwjm -->
  <g transform="translate(45, 100)">
    <rect x="0" y="0" width="150" height="180" rx="8" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />
    <rect x="0" y="0" width="150" height="36" rx="8" fill="#0284c7" fill-opacity="0.2" />
    <text x="75" y="24" font-size="12" font-weight="700" fill="#38bdf8" text-anchor="middle">ARCHIVO NATIVO</text>
    <text x="75" y="65" font-size="16" font-weight="800" fill="#ffffff" text-anchor="middle">.bwjm / .jm</text>
    <text x="75" y="90" font-size="10" fill="#94a3b8" text-anchor="middle">Markdown Cientifico</text>
    <text x="75" y="110" font-size="10" fill="#94a3b8" text-anchor="middle">Bloques Declarativos</text>
    <text x="75" y="130" font-size="10" fill="#94a3b8" text-anchor="middle">KaTeX Formulas</text>
    <text x="75" y="150" font-size="10" fill="#94a3b8" text-anchor="middle">Parametros Reactivos</text>
  </g>

  <!-- Arrow 1 -->
  <line x1="205" y1="190" x2="235" y2="190" stroke="#38bdf8" stroke-width="2" />
  <polygon points="235,186 243,190 235,194" fill="#38bdf8" />

  <!-- Box 2: Parser & AST -->
  <g transform="translate(250, 100)">
    <rect x="0" y="0" width="160" height="180" rx="8" fill="#0f172a" stroke="#818cf8" stroke-width="1.5" />
    <rect x="0" y="0" width="160" height="36" rx="8" fill="#4338ca" fill-opacity="0.2" />
    <text x="80" y="24" font-size="12" font-weight="700" fill="#a5b4fc" text-anchor="middle">PARSER Y AST</text>
    <text x="80" y="65" font-size="14" font-weight="700" fill="#ffffff" text-anchor="middle">@mathmd/parser</text>
    <text x="80" y="85" font-size="10" fill="#818cf8" text-anchor="middle">@mathmd/ast</text>
    <text x="80" y="115" font-size="10" fill="#94a3b8" text-anchor="middle">Span-based Slicing</text>
    <text x="80" y="135" font-size="10" fill="#94a3b8" text-anchor="middle">Zod Safe Validation</text>
    <text x="80" y="155" font-size="10" fill="#94a3b8" text-anchor="middle">YAML Auto-Quoting</text>
  </g>

  <!-- Arrow 2 -->
  <line x1="420" y1="190" x2="450" y2="190" stroke="#818cf8" stroke-width="2" />
  <polygon points="450,186 458,190 450,194" fill="#818cf8" />

  <!-- Box 3: Reactivity & Calculation -->
  <g transform="translate(465, 100)">
    <rect x="0" y="0" width="170" height="180" rx="8" fill="#0f172a" stroke="#34d399" stroke-width="1.5" />
    <rect x="0" y="0" width="170" height="36" rx="8" fill="#059669" fill-opacity="0.2" />
    <text x="85" y="24" font-size="12" font-weight="700" fill="#6ee7b7" text-anchor="middle">MOTOR REACTIVO</text>
    <text x="85" y="65" font-size="14" font-weight="700" fill="#ffffff" text-anchor="middle">@mathmd/core</text>
    <text x="85" y="85" font-size="10" fill="#34d399" text-anchor="middle">@mathmd/math</text>
    <text x="85" y="115" font-size="10" fill="#94a3b8" text-anchor="middle">Grafo de Dependencias</text>
    <text x="85" y="135" font-size="10" fill="#94a3b8" text-anchor="middle">Integrales Riemann</text>
    <text x="85" y="155" font-size="10" fill="#94a3b8" text-anchor="middle">Volumen Revolucion 3π</text>
  </g>

  <!-- Arrow 3 -->
  <line x1="645" y1="190" x2="675" y2="190" stroke="#34d399" stroke-width="2" />
  <polygon points="675,186 683,190 675,194" fill="#34d399" />

  <!-- Box 4: Viewers & Renderers -->
  <g transform="translate(690, 100)">
    <rect x="0" y="0" width="165" height="180" rx="8" fill="#0f172a" stroke="#f59e0b" stroke-width="1.5" />
    <rect x="0" y="0" width="165" height="36" rx="8" fill="#d97706" fill-opacity="0.2" />
    <text x="82" y="24" font-size="12" font-weight="700" fill="#fcd34d" text-anchor="middle">VISUALIZADORES</text>
    <text x="82" y="65" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">BWJM Studio</text>
    <text x="82" y="85" font-size="10" fill="#f59e0b" text-anchor="middle">VS Code &amp; Chrome Ext</text>
    <text x="82" y="115" font-size="10" fill="#94a3b8" text-anchor="middle">SVG 2D Vector Engine</text>
    <text x="82" y="135" font-size="10" fill="#94a3b8" text-anchor="middle">Plotly 3D Engine</text>
    <text x="82" y="155" font-size="10" fill="#94a3b8" text-anchor="middle">Zero-HTML Output</text>
  </g>

  <!-- Bottom highlight bar -->
  <rect x="45" y="315" width="810" height="45" rx="8" fill="#0f172a" stroke="#334155" stroke-width="1" />
  <text x="450" y="342" font-size="12" font-weight="600" fill="#f8fafc" text-anchor="middle">
    Independiente de HTML: El documento vivo se ejecuta en memoria y renderiza interactivamente sin exportar archivos HTML estaticos
  </text>
</svg>
`;

fs.writeFileSync(path.join(outDir, '04-arquitectura-formato-bwjm.svg'), archSvg.trim());
console.log('SVGs generated successfully in docs/images!');

