# MathMD — Arquitectura

## Monorepo

```text
mathmd/
├── SPEC.md
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── apps/
│   ├── playground/
│   ├── docs/
│   └── demo-vector-calculus/
├── packages/
│   ├── ast/
│   ├── parser/
│   ├── math/
│   ├── core/
│   ├── renderer-svg/
│   ├── renderer-plotly/
│   ├── renderer-three/
│   ├── react/
│   ├── github/
│   └── cli/
└── .github/workflows/
```

## Reglas

- parser independiente de React;
- AST independiente del renderer;
- lenguaje independiente de Plotly y Three.js;
- archivos generados deterministas;
- funciones puras siempre que sea posible.

## AST ejemplo

```typescript
interface Surface3DNode {
  type: "surface3d";
  id: string;
  equation: string;
  xDomain: [number, number];
  yDomain: [number, number];
  samples: number;
  contours: boolean;
}
```

## Parser

```typescript
parseMathMD(markdown: string): MathMDDocument
```

## Math engine

```typescript
compileExpression()
evaluateExpression()
sample1D()
sampleSurface()
```

## Renderer 2D

Preferir SVG propio.

## Renderer 3D

Primera versión: Plotly.js.

Futuro: Three.js para interacción avanzada.

## Playground

```text
Markdown editor | Preview
```

## GitHub fallbacks

```text
2D → SVG
3D → STL cuando sea posible
```
