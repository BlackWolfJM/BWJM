import { describe, it, expect } from 'vitest';
import {
  generateID,
  simpleHash,
  sourcePointSchema,
  sourceRangeSchema,
  mathmdDiagnosticSchema,
  mathmdNodeSchema,
  mathmdDocumentSchema,
  plot2dSchema,
  surface3dSchema,
  vector2dSchema,
  vector3dSchema,
  curve3dSchema,
  vectorfield2dSchema,
  gradientSchema,
  tangentplaneSchema,
  sliderSchema,
  checkboxSchema,
  point2dSchema,
  point3dSchema,
  diagramSchema,
  geometrySchema,
  contourSchema,
  SourceRange,
} from '../src/index.js';

const mockRange: SourceRange = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 5, column: 4, offset: 50 },
};

describe('MathMD AST - ID Generator', () => {
  it('should generate deterministic IDs for same inputs', () => {
    const id1 = generateID('plot2d', 0, 'equation: x^2\nx: [-5, 5]');
    const id2 = generateID('plot2d', 0, 'equation: x^2\nx: [-5, 5]');
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^plot2d-0-[a-f0-9]{8}$/);
  });

  it('should generate distinct IDs when ordinal or content differs', () => {
    const id1 = generateID('plot2d', 0, 'content A');
    const id2 = generateID('plot2d', 1, 'content A');
    const id3 = generateID('plot2d', 0, 'content B');
    const id4 = generateID('surface3d', 0, 'content A');

    expect(id1).not.toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id1).not.toBe(id4);
  });

  it('should be Unicode-safe and not throw on emojis or non-ASCII characters', () => {
    const unicodeContent = 'title: 📐 Función π y α β γ 日本語';
    const id = generateID('plot2d', 2, unicodeContent);
    expect(id).toMatch(/^plot2d-2-[a-f0-9]{8}$/);
    const hash1 = simpleHash(unicodeContent);
    const hash2 = simpleHash(unicodeContent);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(8);
  });

  it('should work with default parameters', () => {
    const id = generateID();
    expect(id).toMatch(/^node-0-[a-f0-9]{8}$/);
  });
});

describe('MathMD AST - Source Positions & Diagnostics Schemas', () => {
  it('should validate SourcePoint and SourceRange', () => {
    const validPoint = { line: 2, column: 5, offset: 25 };
    expect(sourcePointSchema.safeParse(validPoint).success).toBe(true);

    const invalidPoint = { line: 0, column: -1, offset: -2 };
    expect(sourcePointSchema.safeParse(invalidPoint).success).toBe(false);

    expect(sourceRangeSchema.safeParse(mockRange).success).toBe(true);
  });

  it('should validate MathMDDiagnostic', () => {
    const validDiagnostic = {
      severity: 'error' as const,
      code: 'MATHMD_SYNTAX_INVALID',
      message: 'Invalid syntax',
      range: mockRange,
      blockType: 'plot2d',
      path: ['equation'],
    };
    expect(mathmdDiagnosticSchema.safeParse(validDiagnostic).success).toBe(true);

    const invalidSeverity = {
      severity: 'info',
      code: 'TEST',
      message: 'msg',
    };
    expect(mathmdDiagnosticSchema.safeParse(invalidSeverity).success).toBe(false);
  });
});

describe('MathMD AST - 15 Node Schemas Validation', () => {
  const base = { id: 'test-1', range: mockRange };

  const validNodes = [
    { name: 'plot2d', schema: plot2dSchema, data: { ...base, type: 'plot2d', equation: 'x^2', xDomain: [-5, 5], grid: true } },
    { name: 'surface3d', schema: surface3dSchema, data: { ...base, type: 'surface3d', equation: 'x^2 + y^2', xDomain: [-5, 5], yDomain: [-5, 5], samples: 50 } },
    { name: 'vector2d', schema: vector2dSchema, data: { ...base, type: 'vector2d', origin: [0, 0], vector: [1, 2] } },
    { name: 'vector3d', schema: vector3dSchema, data: { ...base, type: 'vector3d', origin: [0, 0, 0], vector: [1, 2, 3] } },
    { name: 'curve3d', schema: curve3dSchema, data: { ...base, type: 'curve3d', x: 'cos(t)', y: 'sin(t)', z: 't', tDomain: [0, 6.28] } },
    { name: 'vectorfield2d', schema: vectorfield2dSchema, data: { ...base, type: 'vectorfield2d', field: ['-y', 'x'], xDomain: [-5, 5], yDomain: [-5, 5], density: 15 } },
    { name: 'gradient', schema: gradientSchema, data: { ...base, type: 'gradient', function: 'x^2 + y^2', point: [1, 1], showSurface: true } },
    { name: 'tangentplane', schema: tangentplaneSchema, data: { ...base, type: 'tangentplane', function: 'x^2 + y^2', point: [1, 1] } },
    { name: 'slider', schema: sliderSchema, data: { ...base, type: 'slider', name: 'a', min: -5, max: 5, step: 0.1, default: 1 } },
    { name: 'checkbox', schema: checkboxSchema, data: { ...base, type: 'checkbox', name: 'visible', label: 'Show', default: true } },
    { name: 'point2d', schema: point2dSchema, data: { ...base, type: 'point2d', x: 2, y: 3 } },
    { name: 'point3d', schema: point3dSchema, data: { ...base, type: 'point3d', x: 1, y: 2, z: 3 } },
    { name: 'diagram', schema: diagramSchema, data: { ...base, type: 'diagram', elements: '<svg></svg>' } },
    { name: 'geometry', schema: geometrySchema, data: { ...base, type: 'geometry', primitives: [{ type: 'circle' as const, points: [[0, 0]] }] } },
    { name: 'contour', schema: contourSchema, data: { ...base, type: 'contour', function: 'x^2 + y^2', xDomain: [-5, 5], yDomain: [-5, 5], levels: 10 } },
  ];

  it.each(validNodes)('should validate and preserve id and range for $name', ({ schema, data }) => {
    const parsed = schema.parse(data);
    expect(parsed.id).toBe(data.id);
    expect(parsed.range).toEqual(mockRange);
    expect(parsed.type).toBe(data.type);
  });

  it.each(validNodes)('should accept $name via mathmdNodeSchema discriminated union', ({ data }) => {
    const parsed = mathmdNodeSchema.parse(data);
    expect(parsed.type).toBe(data.type);
    expect(parsed.id).toBe(data.id);
    expect(parsed.range).toEqual(mockRange);
  });

  it('should reject invalid slider bounds through the public node schema', () => {
    const invalidSlider = {
      ...base,
      type: 'slider' as const,
      name: 'a',
      min: 5,
      max: 1,
      step: 0.1,
      default: 3,
    };

    const result = mathmdNodeSchema.safeParse(invalidSlider);

    expect(result.success).toBe(false);
  });

  const invalidCases = [
    { name: 'plot2d: empty equation', schema: plot2dSchema, data: { ...base, type: 'plot2d', equation: '', xDomain: [-5, 5] } },
    { name: 'plot2d: invalid domain (min >= max)', schema: plot2dSchema, data: { ...base, type: 'plot2d', equation: 'x', xDomain: [5, 2] } },
    { name: 'surface3d: non-finite domain', schema: surface3dSchema, data: { ...base, type: 'surface3d', equation: 'x+y', xDomain: [0, Infinity], yDomain: [0, 5] } },
    { name: 'vector2d: 3-tuple origin', schema: vector2dSchema, data: { ...base, type: 'vector2d', origin: [0, 0, 0], vector: [1, 1] } },
    { name: 'vector3d: 2-tuple vector', schema: vector3dSchema, data: { ...base, type: 'vector3d', origin: [0, 0, 0], vector: [1, 1] } },
    { name: 'curve3d: missing x component', schema: curve3dSchema, data: { ...base, type: 'curve3d', y: 't', z: 't', tDomain: [0, 5] } },
    { name: 'vectorfield2d: field with 1 component', schema: vectorfield2dSchema, data: { ...base, type: 'vectorfield2d', field: ['x'], xDomain: [-5, 5], yDomain: [-5, 5] } },
    { name: 'gradient: missing point', schema: gradientSchema, data: { ...base, type: 'gradient', function: 'x^2' } },
    { name: 'tangentplane: non-number point coord', schema: tangentplaneSchema, data: { ...base, type: 'tangentplane', function: 'x', point: ['a', 1] } },
    { name: 'slider: step <= 0', schema: sliderSchema, data: { ...base, type: 'slider', name: 'a', min: 0, max: 10, step: 0, default: 5 } },
    { name: 'slider: invalid identifier name', schema: sliderSchema, data: { ...base, type: 'slider', name: '123bad!', min: 0, max: 10, step: 1, default: 5 } },
    { name: 'checkbox: non-boolean default', schema: checkboxSchema, data: { ...base, type: 'checkbox', name: 'cb', default: 'yes' } },
    { name: 'point2d: string coordinate', schema: point2dSchema, data: { ...base, type: 'point2d', x: 'five', y: 0 } },
    { name: 'point3d: missing z', schema: point3dSchema, data: { ...base, type: 'point3d', x: 1, y: 2 } },
    { name: 'diagram: non-string elements', schema: diagramSchema, data: { ...base, type: 'diagram', elements: 123 } },
    { name: 'geometry: invalid primitive type', schema: geometrySchema, data: { ...base, type: 'geometry', primitives: [{ type: 'cube', points: [] }] } },
    { name: 'contour: missing function', schema: contourSchema, data: { ...base, type: 'contour', xDomain: [-5, 5], yDomain: [-5, 5] } },
  ];

  it.each(invalidCases)('should reject invalid node: $name', ({ schema, data }) => {
    expect(schema.safeParse(data).success).toBe(false);
  });
});

describe('MathMD AST - Document Schema', () => {
  it('should accept valid MathMDDocument', () => {
    const validDoc = {
      type: 'document' as const,
      source: '# Hello\n```plot2d\nequation: x\n```',
      children: [
        {
          id: 'plot-1',
          range: mockRange,
          type: 'plot2d' as const,
          equation: 'x',
          xDomain: [-5, 5] as [number, number],
        },
      ],
      diagnostics: [],
    };

    const res = mathmdDocumentSchema.safeParse(validDoc);
    expect(res.success).toBe(true);
  });

  it('should require diagnostics array', () => {
    const docMissingDiagnostics = {
      type: 'document' as const,
      source: '# Hello',
      children: [],
    };
    expect(mathmdDocumentSchema.safeParse(docMissingDiagnostics).success).toBe(false);
  });

  it('should reject unknown node type in children', () => {
    const docWithUnknownNode = {
      type: 'document' as const,
      source: 'test',
      children: [
        {
          id: 'unknown-1',
          range: mockRange,
          type: 'unknown_type',
        },
      ],
      diagnostics: [],
    };
    expect(mathmdDocumentSchema.safeParse(docWithUnknownNode).success).toBe(false);
  });

  it('should reject extra properties on document due to .strict()', () => {
    const docWithExtra = {
      type: 'document' as const,
      source: 'test',
      children: [],
      diagnostics: [],
      extraField: 'not-allowed',
    };
    expect(mathmdDocumentSchema.safeParse(docWithExtra).success).toBe(false);
  });
});
