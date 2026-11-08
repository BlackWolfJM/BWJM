// CLI tool for MathMD knowledge graph analysis

import { MathMDExtractor } from './extractor.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface GraphCLIOptions {
  input: string;
  output?: string;
  format?: 'json' | 'html' | 'md' | 'all';
  watch?: boolean;
  report?: boolean;
}

export class MathMDGraphCLI {
  private extractor: MathMDExtractor;

  constructor() {
    this.extractor = new MathMDExtractor();
  }

  /**
   * Process a MathMD document and generate knowledge graph
   */
  async process(options: GraphCLIOptions): Promise<void> {
    console.log(`📊 Processing ${options.input}...`);
    
    // Read input file
    const markdown = readFileSync(options.input, 'utf-8');
    const filename = options.input.split('/').pop() || 'document.md';
    
    // Extract graph
    const extraction = this.extractor.extractMathConcepts(markdown, filename);
    
    // Generate output
    const outputDir = options.output || 'graphify-out';
    
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    // Export based on format
    if (!options.format || options.format === 'json' || options.format === 'all') {
      const jsonExport = this.extractor.exportGraphifyFormat(markdown, filename);
      writeFileSync(join(outputDir, 'graph.json'), JSON.stringify(jsonExport, null, 2));
      console.log('✅ Exported graph.json');
    }
    
    if (!options.format || options.format === 'md' || options.format === 'all') {
      const report = this.extractor.generateReport(markdown, filename);
      writeFileSync(join(outputDir, 'GRAPH_REPORT.md'), report);
      console.log('✅ Exported GRAPH_REPORT.md');
    }
    
    if (!options.format || options.format === 'html' || options.format === 'all') {
      const html = this.generateHTMLVisualization(extraction);
      writeFileSync(join(outputDir, 'graph.html'), html);
      console.log('✅ Exported graph.html');
    }
    
    if (options.report) {
      console.log('\n📈 Graph Summary:');
      console.log(`   Nodes: ${extraction.nodes.length}`);
      console.log(`   Edges: ${extraction.edges.length}`);
      console.log(`   Communities: ${extraction.communities.length}`);
      
      console.log('\n🔗 God Nodes:');
      const nodeDegrees = this.calculateDegrees(extraction.edges);
      const topNodes = Array.from(nodeDegrees.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      topNodes.forEach(([id, degree]) => {
        const node = extraction.nodes.find(n => n.id === id);
        console.log(`   - ${node?.label || id} (${degree} connections)`);
      });
    }
    
    console.log(`\n✨ Complete! Outputs saved to ${outputDir}/`);
  }

  /**
   * Calculate node degrees
   */
  private calculateDegrees(edges: any[]): Map<string, number> {
    const degrees = new Map<string, number>();
    edges.forEach(edge => {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    });
    return degrees;
  }

  /**
   * Generate HTML visualization
   */
  private generateHTMLVisualization(extraction: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>MathMD Knowledge Graph</title>
  <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    #network { width: 100%; height: 700px; border: 1px solid #ccc; border-radius: 4px; }
    .info { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>📊 MathMD Knowledge Graph</h1>
  <div class="info">
    <strong>Nodes:</strong> ${extraction.nodes.length} | 
    <strong>Edges:</strong> ${extraction.edges.length} | 
    <strong>Communities:</strong> ${extraction.communities.length}
  </div>
  <div id="network"></div>
  <script>
    const nodes = new vis.DataSet(${JSON.stringify(extraction.nodes.map((n: any) => ({
      id: n.id,
      label: n.label,
      title: n.properties ? JSON.stringify(n.properties) : '',
      color: this.getNodeColor(n.type)
    })))} );
    
    const edges = new vis.DataSet(${JSON.stringify(extraction.edges.map((e: any) => ({
      from: e.source,
      to: e.target,
      label: e.relation,
      dashes: e.confidence === 'INFERRED',
      title: 'Confidence: ' + e.confidence
    })))} );
    
    const data = { nodes, edges };
    const options = {
      nodes: { shape: 'dot', size: 16, font: { size: 12 } },
      edges: { arrows: 'to', font: { size: 10 } },
      physics: { stabilization: { iterations: 100 } }
    };
    
    new vis.Network(document.getElementById('network'), data, options);
  </script>
</body>
</html>`;
  }

  /**
   * Get node color based on type
   */
  private getNodeColor(type: string): string {
    const colors: Record<string, string> = {
      plot2d: '#4CAF50',
      surface3d: '#2196F3',
      vector2d: '#FF9800',
      slider: '#9C27B0',
      function: '#00BCD4',
      operation: '#FF5722',
      domain: '#795548',
      visualization: '#4CAF50',
      interactive: '#9C27B0',
      mathematical: '#2196F3'
    };
    
    return colors[type] || '#757575';
  }
}

// CLI entry point
export async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: mathmd-graph <input.md> [options]');
    console.log('Options:');
    console.log('  --output <dir>    Output directory (default: graphify-out)');
    console.log('  --format <json|html|md|all>  Output format (default: all)');
    console.log('  --report          Show summary report');
    process.exit(1);
  }
  
  const input = args[0];
  const options: GraphCLIOptions = {
    input,
    format: 'all',
    report: true
  };
  
  // Parse options
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
      options.output = args[i + 1];
      i++;
    } else if (args[i] === '--format' && args[i + 1]) {
      options.format = args[i + 1] as any;
      i++;
    } else if (args[i] === '--report') {
      options.report = true;
    }
  }
  
  const cli = new MathMDGraphCLI();
  await cli.process(options);
}

if (require.main === module) {
  main().catch(console.error);
}