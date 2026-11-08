import { describe, it, expect } from 'vitest';
import { compileExpression, evaluateExpression, sample1D, sampleSurface } from '../src/index.js';

describe('MathMD Math Engine', () => {
  it('rejects oversized and privileged expressions from untrusted documents', () => {
    expect(() => compileExpression('x'.repeat(4097))).toThrow(/maximum length/i);
    expect(() => compileExpression('import("unsafe")')).toThrow(/not permitted/i);
    expect(() => compileExpression('alert("hack")')).toThrow(/not permitted/i);
    expect(() => compileExpression('window')).toThrow(/not permitted/i);
    expect(() => compileExpression('a.constructor')).toThrow(/not permitted/i);
  });

  it('rejects unbounded or invalid sample counts', () => {
    expect(() => sample1D('x', [-1, 1], 1)).toThrow(/between 2 and 10000/i);
    expect(() => sample1D('x', [-1, 1], 10001)).toThrow(/between 2 and 10000/i);
    expect(() => sampleSurface('x+y', [-1, 1], [-1, 1], 201, 2)).toThrow(/between 2 and 200/i);
  });

  it('should compile simple expressions', () => {
    const expr = compileExpression('x^2');
    expect(expr).toBeDefined();
  });

  it('should evaluate expressions', () => {
    const expr = compileExpression('x^2 + 2*x + 1');
    expect(evaluateExpression(expr, { x: 2 })).toBe(9); // 2^2 + 2*2 + 1 = 9
  });

  it('should sample 1D functions', () => {
    const result = sample1D('x^2', [-2, 2], 5);
    expect(result.x).toHaveLength(5);
    expect(result.y).toHaveLength(5);

    // Check specific values
    expect(result.x[0]).toBe(-2);
    expect(result.y[0]).toBe(4); // (-2)^2

    expect(result.x[2]).toBe(0);
    expect(result.y[2]).toBe(0); // 0^2

    expect(result.x[4]).toBe(2);
    expect(result.y[4]).toBe(4); // 2^2
  });

  it('should sample 2D surfaces', () => {
    const result = sampleSurface('x^2 + y^2', [-2, 2], [-2, 2], 3, 3);
    expect(result.x).toHaveLength(3);
    expect(result.y).toHaveLength(3);
    expect(result.z).toHaveLength(3);

    // Check center point (0,0)
    expect(result.x[1][1]).toBe(0);
    expect(result.y[1][1]).toBe(0);
    expect(result.z[1][1]).toBe(0); // 0^2 + 0^2

    // Check corner point (2,2)
    expect(result.x[2][2]).toBe(2);
    expect(result.y[2][2]).toBe(2);
    expect(result.z[2][2]).toBe(8); // 2^2 + 2^2 = 8
  });

  // New tests for scope parameter
  it('should sample 1D functions with scope', () => {
    const result = sample1D('a * x', [0, 2], 3, { a: 3 });
    expect(result.x).toHaveLength(3);
    expect(result.y).toHaveLength(3);
    // x values: 0, 1, 2
    expect(result.x[0]).toBe(0);
    expect(result.y[0]).toBe(0); // 3 * 0
    expect(result.x[1]).toBe(1);
    expect(result.y[1]).toBe(3); // 3 * 1
    expect(result.x[2]).toBe(2);
    expect(result.y[2]).toBe(6); // 3 * 2
  });

  it('should not let scope x override coordinate in sample1D', () => {
    const result = sample1D('x', [0, 2], 3, { x: 999 });
    expect(result.x).toHaveLength(3);
    expect(result.y).toHaveLength(3);
    // y should be the coordinate x, not 999
    expect(result.y[0]).toBe(0);
    expect(result.y[1]).toBe(1);
    expect(result.y[2]).toBe(2);
  });

  it('should sample 2D surfaces with scope', () => {
    const result = sampleSurface('a * x + y', [0, 2], [0, 2], 2, 2, { a: 3 });
    expect(result.x).toHaveLength(2);
    expect(result.y).toHaveLength(2);
    expect(result.z).toHaveLength(2);
    // Grid with xDomain=[0,2], yDomain=[0,2], xSamples=2, ySamples=2
    // Stored in row-major order: [yIndex][xIndex]
    // Row 0 (y=0):
    //   Col 0 (x=0): z = 3*0 + 0 = 0
    //   Col 1 (x=2): z = 3*2 + 0 = 6
    // Row 1 (y=2):
    //   Col 0 (x=0): z = 3*0 + 2 = 2
    //   Col 1 (x=2): z = 3*2 + 2 = 8
    expect(result.x[0][0]).toBe(0);
    expect(result.y[0][0]).toBe(0);
    expect(result.z[0][0]).toBe(0);

    expect(result.x[0][1]).toBe(2);
    expect(result.y[0][1]).toBe(0);
    expect(result.z[0][1]).toBe(6);

    expect(result.x[1][0]).toBe(0);
    expect(result.y[1][0]).toBe(2);
    expect(result.z[1][0]).toBe(2);

    expect(result.x[1][1]).toBe(2);
    expect(result.y[1][1]).toBe(2);
    expect(result.z[1][1]).toBe(8);
  });

  it('should not let scope x or y override coordinates in sampleSurface', () => {
    const result = sampleSurface('2*x + y', [0, 2], [0, 2], 2, 2, { x: 999, y: 888 });
    expect(result.x).toHaveLength(2);
    expect(result.y).toHaveLength(2);
    expect(result.z).toHaveLength(2);
    // Local coordinates must prevail over scope { x: 999, y: 888 }
    // Row 0: y=0; Col 0: x=0 -> z = 0; Col 1: x=2 -> z = 4
    // Row 1: y=2; Col 0: x=0 -> z = 2; Col 1: x=2 -> z = 6
    expect(result.x[0][0]).toBe(0);
    expect(result.y[0][0]).toBe(0);
    expect(result.z[0][0]).toBe(0);

    expect(result.x[0][1]).toBe(2);
    expect(result.y[0][1]).toBe(0);
    expect(result.z[0][1]).toBe(4);

    expect(result.x[1][0]).toBe(0);
    expect(result.y[1][0]).toBe(2);
    expect(result.z[1][0]).toBe(2);

    expect(result.x[1][1]).toBe(2);
    expect(result.y[1][1]).toBe(2);
    expect(result.z[1][1]).toBe(6);
  });
});
