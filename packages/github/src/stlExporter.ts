import { MathMDNode } from '@mathmd/ast';
import { parseMathMD } from '@mathmd/parser';
import { MathMDCore } from '@mathmd/core';
import { compileExpression } from '@mathmd/math';

/**
 * Export MathMD document to STL string (for surface3d nodes only).
 * Returns STL content for 3D surfaces suitable for GitHub display.
 */
export function mathmdToSTL(markdown: string): string {
  const doc = parseMathMD(markdown);
  const _core = new MathMDCore(doc);
  void _core;
  
  // Find all surface3d nodes
  const surfaceNodes = doc.children.filter(node => node.type === 'surface3d') as Extract<MathMDNode, { 
    type: "surface3d"; 
    equation: string; 
    xDomain: [number, number]; 
    yDomain: [number, number]; 
    samples?: number; 
    contours?: boolean; 
    color?: string;
  }>[];
  
  if (surfaceNodes.length === 0) {
    return `# No surface3d blocks found in document\n`;
  }
  
  // For simplicity, we'll generate STL for the first surface3d node
  // In a more complete implementation, we could handle multiple surfaces
  const surfaceNode = surfaceNodes[0];
  
  const { equation, xDomain, yDomain, samples = 50 } = surfaceNode;
  
  try {
    // Sample the surface using the math engine
    const surfaceData = sampleSurfaceForSTL(
      equation,
      xDomain,
      yDomain,
      samples,
      samples
    );
    
    const { x, y, z } = surfaceData;
    
    // Generate STL in ASCII format
    let stlContent = `solid mathmd-surface\n`;
    
    // Generate triangles from the grid
    // Each grid cell (except last row and column) forms two triangles
    const width = x[0].length;
    const height = x.length;
    
    for (let row = 0; row < height - 1; row++) {
      for (let col = 0; col < width - 1; col++) {
        // Get the four vertices of the grid cell
        const p1 = [x[row][col], y[row][col], z[row][col]];
        const p2 = [x[row][col + 1], y[row][col + 1], z[row][col + 1]];
        const p3 = [x[row + 1][col], y[row + 1][col], z[row + 1][col]];
        const p4 = [x[row + 1][col + 1], y[row + 1][col + 1], z[row + 1][col + 1]];
        
        // First triangle: p1-p2-p3
        stlContent += `  facet normal 0 0 0\n`;
        stlContent += `    outer loop\n`;
        stlContent += `      vertex ${p1[0]} ${p1[1]} ${p1[2]}\n`;
        stlContent += `      vertex ${p2[0]} ${p2[1]} ${p2[2]}\n`;
        stlContent += `      vertex ${p3[0]} ${p3[1]} ${p3[2]}\n`;
        stlContent += `    endloop\n`;
        stlContent += `  endfacet\n`;
        
        // Second triangle: p2-p4-p3
        stlContent += `  facet normal 0 0 0\n`;
        stlContent += `    outer loop\n`;
        stlContent += `      vertex ${p2[0]} ${p2[1]} ${p2[2]}\n`;
        stlContent += `      vertex ${p4[0]} ${p4[1]} ${p4[2]}\n`;
        stlContent += `      vertex ${p3[0]} ${p3[1]} ${p3[2]}\n`;
        stlContent += `    endloop\n`;
        stlContent += `  endfacet\n`;
      }
    }
    
    stlContent += `endsolid mathmd-surface\n`;
    
    return stlContent;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return `# Error generating STL: ${msg}\n`;
  }
}

/**
 * Sample a 2D function over a domain for STL generation
 * (Similar to sampleSurface in math engine but returns the data we need)
 */
function sampleSurfaceForSTL(
  exprStr: string, 
  xDomain: [number, number], 
  yDomain: [number, number], 
  xSamples: number = 50,
  ySamples: number = 50
): { 
  x: number[][]; 
  y: number[][]; 
  z: number[][] 
} {
  const compiled = compileExpression(exprStr);
  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;
  
  const xValues: number[][] = [];
  const yValues: number[][] = [];
  const zValues: number[][] = [];
  
  for (let i = 0; i < ySamples; i++) {
    const y = yMin + (i / (ySamples - 1)) * (yMax - yMin);
    const xRow: number[] = [];
    const yRow: number[] = [];
    const zRow: number[] = [];
    
    for (let j = 0; j < xSamples; j++) {
      const x = xMin + (j / (xSamples - 1)) * (xMax - xMin);
      const z = evaluateExpression(compiled, { x, y });
      xRow.push(x);
      yRow.push(y);
      zRow.push(z);
    }
    
    xValues.push(xRow);
    yValues.push(yRow);
    zValues.push(zRow);
  }
  
  return { x: xValues, y: yValues, z: zValues };
}

// Helper function to evaluate expression (we need to import this or recreate it)
function evaluateExpression(compiledExpr: any, scope: Record<string, number> = {}): number {
  try {
    return compiledExpr.evaluate(scope);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to evaluate expression: ${msg}`);
  }
}

export default { mathmdToSTL };