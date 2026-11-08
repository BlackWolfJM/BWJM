import { describe, it, expect } from 'vitest';
import { MathMDGraph } from '../src/graph.js';
import { MathMDExtractor } from '../src/extractor.js';

describe('MathMD Graph', () => {
  it('should extract basic graph from markdown', () => {
    const markdown = `
# Test Document

\`\`\`slider
name: a
min: 0
max: 10
default: 5
\`\`\`

\`\`\`plot2d
equation: a*x^2
x: [-5, 5]
\`\`\`
`;

    const graph = new MathMDGraph();
    const extraction = graph.extractFromMarkdown(markdown, 'test.md');
    
    expect(extraction.nodes.length).toBeGreaterThan(0);
    expect(extraction.edges.length).toBeGreaterThan(0);
  });

  it('should detect slider-visualization relationship', () => {
    const markdown = `
\`\`\`slider
name: a
min: 0
max: 10
default: 5
\`\`\`

\`\`\`plot2d
equation: a*x^2
x: [-5, 5]
\`\`\`
`;

    const graph = new MathMDGraph();
    const extraction = graph.extractFromMarkdown(markdown, 'test.md');
    
    const affectsEdge = extraction.edges.find(e => e.relation === 'affects');
    expect(affectsEdge).toBeDefined();
  });

  it('should extract mathematical functions', () => {
    const markdown = `
\`\`\`plot2d
equation: sin(x) + cos(y)
x: [-5, 5]
y: [-5, 5]
\`\`\`
`;

    const extractor = new MathMDExtractor();
    const extraction = extractor.extractMathConcepts(markdown, 'test.md');
    
    const functionNodes = extraction.nodes.filter(n => n.type === 'function');
    expect(functionNodes.length).toBeGreaterThan(0);
    
    const sinNode = functionNodes.find(n => n.label === 'sin');
    expect(sinNode).toBeDefined();
  });

  it('should generate report', () => {
    const markdown = `
\`\`\`slider
name: a
min: 0
max: 10
default: 5
\`\`\`

\`\`\`plot2d
equation: a*x^2
x: [-5, 5]
\`\`\`
`;

    const extractor = new MathMDExtractor();
    const report = extractor.generateReport(markdown, 'test.md');
    
    expect(report).toContain('MathMD Knowledge Graph Report');
    expect(report).toContain('Nodes:');
    expect(report).toContain('Edges:');
  });

  it('should export graphify format', () => {
    const markdown = `
\`\`\`plot2d
equation: x^2
x: [-5, 5]
\`\`\`
`;

    const extractor = new MathMDExtractor();
    const exportData = extractor.exportGraphifyFormat(markdown, 'test.md');
    
    expect(exportData).toHaveProperty('metadata');
    expect(exportData).toHaveProperty('nodes');
    expect(exportData).toHaveProperty('edges');
    expect(exportData).toHaveProperty('communities');
    expect(exportData.metadata.file).toBe('test.md');
  });
});