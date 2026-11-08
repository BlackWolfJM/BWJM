# @mathmd/graph

Knowledge graph extraction and analysis for MathMD documents.

## Overview

This package integrates graphify-like functionality with MathMD to extract knowledge graphs from mathematical documents. It analyzes MathMD blocks, extracts relationships between mathematical concepts, and generates interactive visualizations.

## Features

- **Knowledge Graph Extraction**: Automatically extracts entities and relationships from MathMD documents
- **Mathematical Concept Analysis**: Identifies functions, operations, and mathematical relationships
- **Community Detection**: Groups related concepts into communities
- **Interactive Visualizations**: Export to HTML with vis.js network visualization
- **Graphify Compatible**: Exports in graphify-compatible format
- **CLI Tool**: Command-line interface for batch processing

## Usage

### Basic Usage

```typescript
import { MathMDGraph } from '@mathmd/graph';

const graph = new MathMDGraph();
const extraction = graph.extractFromMarkdown(markdown, 'document.md');

console.log(`Nodes: ${extraction.nodes.length}`);
console.log(`Edges: ${extraction.edges.length}`);
```

### Advanced Extraction

```typescript
import { MathMDExtractor } from '@mathmd/graph';

const extractor = new MathMDExtractor();
const result = extractor.extractMathConcepts(markdown, 'document.md');

// Generate report
const report = extractor.generateReport(markdown, 'document.md');

// Export in graphify format
const exportData = extractor.exportGraphifyFormat(markdown, 'document.md');
```

### CLI

```bash
# Analyze a MathMD document
npx mathmd-graph document.md

# With specific options
npx mathmd-graph document.md --output ./output --format all --report
```

## CLI Options

- `--output <dir>`: Output directory (default: graphify-out)
- `--format <json|html|md|all>`: Output format
- `--report`: Show summary report

## Output Formats

### graph.json
Graphify-compatible JSON with nodes, edges, and communities

### GRAPH_REPORT.md
Human-readable report with:
- God nodes (highest degree)
- Surprising connections
- Suggested questions
- Community breakdown

### graph.html
Interactive visualization with vis.js

## Node Types

- **plot2d**, **surface3d**, **vector2d**, etc.: MathMD blocks
- **function**: Mathematical functions (sin, cos, etc.)
- **operation**: Mathematical operations (power, arithmetic)
- **domain**: Mathematical domains
- **usage**: Usage relationships

## Edge Types

- **affects**: Slider affects visualization
- **uses**: Block uses variable/function
- **provides**: Slider provides variable
- **computes**: Gradient computes from function
- **defines**: Block defines mathematical relationship

## Confidence Levels

- **EXTRACTED**: Explicitly stated in source
- **INFERRED**: Reasonable deduction
- **AMBIGUOUS**: Uncertain relationship

## Integration with Graphify

This package is designed to work alongside graphify:
- Export format is compatible with graphify
- Can import graphify outputs
- Extends graphify with MathMD-specific extractors

## Example

```typescript
import { MathMDExtractor } from '@mathmd/graph';

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
const extraction = extractor.extractMathConcepts(markdown);

// Find relationships
const sliderAffects = extraction.edges.filter(e => 
  e.relation === 'affects' && e.source.includes('slider') && e.target.includes('plot2d')
);

console.log('Slider affects plot:', sliderAffects.length > 0);
```

## Architecture

```
MathMD Document → Parser → AST → Extractor → Knowledge Graph
                                    ↓
                              Report/Visualization
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build --filter @mathmd/graph

# Test
pnpm test --filter @mathmd/graph
```

## License

MIT