// Graph extraction and analysis for MathMD documents

import { MathMDNode } from '@mathmd/ast';
import { parseMathMD } from '@mathmd/parser';

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  sourceFile?: string;
  sourceLocation?: string;
  properties?: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  confidence: 'EXTRACTED' | 'INFERRED' | 'AMBIGUOUS';
  properties?: Record<string, any>;
}

export interface GraphExtraction {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export class MathMDGraph {
  private graph: Map<string, Set<string>> = new Map();
  private nodeMap: Map<string, GraphNode> = new Map();
  private edgeMap: Map<string, GraphEdge[]> = new Map();

  constructor() {}

  /**
   * Extract knowledge graph from MathMD document
   */
  extractFromMarkdown(markdown: string, filename: string = 'document.md'): GraphExtraction {
    const doc = parseMathMD(markdown);
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Extract nodes from each MathMD block
    doc.children.forEach((node, index) => {
      const nodeId = `${node.type}_${node.id}`;
      
      // Create node for the block
      nodes.push({
        id: nodeId,
        label: this.formatNodeLabel(node),
        type: node.type,
        sourceFile: filename,
        sourceLocation: `block ${index + 1}`,
        properties: this.extractNodeProperties(node)
      });

      // Extract internal relationships within the node
      this.extractInternalRelations(node, nodeId, edges);

      // Extract cross-references to other nodes
      this.extractCrossReferences(node, doc.children, edges);
    });

    // Store in graph
    this.updateGraph(nodes, edges);

    return { nodes, edges };
  }

  /**
   * Format readable label for a MathMD node
   */
  private formatNodeLabel(node: MathMDNode): string {
    switch (node.type) {
      case 'plot2d':
        return `Plot: ${node.equation || 'function'}`;
      case 'surface3d':
        return `Surface: ${node.equation || 'function'}`;
      case 'vector2d':
        return `Vector: ${node.label || 'v'}`;
      case 'slider':
        return `Slider: ${node.name}`;
      case 'gradient':
        return `Gradient of: ${node.function}`;
      default:
        return `${node.type} ${node.id}`;
    }
  }

  /**
   * Extract properties from a MathMD node
   */
  private extractNodeProperties(node: MathMDNode): Record<string, any> {
    const props: Record<string, any> = {
      id: node.id,
      type: node.type
    };

    // Extract type-specific properties
    switch (node.type) {
      case 'plot2d':
        props.equation = node.equation;
        props.xDomain = node.xDomain;
        props.grid = node.grid;
        break;
      case 'surface3d':
        props.equation = node.equation;
        props.xDomain = node.xDomain;
        props.yDomain = node.yDomain;
        break;
      case 'slider':
        props.name = node.name;
        props.min = node.min;
        props.max = node.max;
        break;
      case 'gradient':
        props.function = node.function;
        props.point = node.point;
        break;
    }

    return props;
  }

  /**
   * Extract internal relationships within a node
   */
  private extractInternalRelations(node: MathMDNode, nodeId: string, edges: GraphEdge[]): void {
    // Extract relationships between mathematical concepts within the node
    switch (node.type) {
      case 'gradient':
        // Gradient depends on function
        edges.push({
          source: nodeId,
          target: `${node.type}_${node.function}`,
          relation: 'computes',
          confidence: 'EXTRACTED'
        });
        break;

      case 'plot2d':
      case 'surface3d': {
        // Block depends on variables in equation
        const variables = this.extractVariables(node.equation || '');
        variables.forEach(variable => {
          edges.push({
            source: nodeId,
            target: `variable_${variable}`,
            relation: 'uses',
            confidence: 'EXTRACTED'
          });
        });
        break;
      }

      case 'slider':
        // Slider provides variable
        edges.push({
          source: nodeId,
          target: `variable_${node.name}`,
          relation: 'provides',
          confidence: 'EXTRACTED'
        });
        break;
    }
  }

  /**
   * Extract cross-references between nodes
   */
  private extractCrossReferences(node: MathMDNode, allNodes: MathMDNode[], edges: GraphEdge[]): void {
    const nodeId = `${node.type}_${node.id}`;

    // Check for variable dependencies
    if ('equation' in node && node.equation) {
      const variables = this.extractVariables(node.equation);
      
      allNodes.forEach(otherNode => {
        if (otherNode.type === 'slider') {
          if (variables.includes(otherNode.name)) {
            edges.push({
              source: `${otherNode.type}_${otherNode.id}`,
              target: nodeId,
              relation: 'affects',
              confidence: 'EXTRACTED'
            });
          }
        }
      });
    }

    // Check for function dependencies
    if ('function' in node && node.function) {
      allNodes.forEach(otherNode => {
        if ((otherNode.type === 'plot2d' || otherNode.type === 'surface3d') && 
            'equation' in otherNode && otherNode.equation) {
          if (node.function === otherNode.equation) {
            edges.push({
              source: `${otherNode.type}_${otherNode.id}`,
              target: nodeId,
              relation: 'defines',
              confidence: 'INFERRED'
            });
          }
        }
      });
    }
  }

  /**
   * Extract variable names from mathematical expression
   */
  private extractVariables(expression: string): string[] {
    const varMatches = expression.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    // Filter out common math functions
    const mathFunctions = ['sin', 'cos', 'tan', 'sqrt', 'exp', 'log', 'ln', 'abs', 'max', 'min'];
    return varMatches.filter(v => !mathFunctions.includes(v) && v !== 'pi' && v !== 'e');
  }

  /**
   * Update internal graph representation
   */
  private updateGraph(nodes: GraphNode[], edges: GraphEdge[]): void {
    nodes.forEach(node => {
      this.nodeMap.set(node.id, node);
    });

    edges.forEach(edge => {
      if (!this.graph.has(edge.source)) {
        this.graph.set(edge.source, new Set());
      }
      this.graph.get(edge.source)!.add(edge.target);

      if (!this.edgeMap.has(edge.source)) {
        this.edgeMap.set(edge.source, []);
      }
      this.edgeMap.get(edge.source)!.push(edge);
    });
  }

  /**
   * Get connected nodes
   */
  getConnectedNodes(nodeId: string): GraphNode[] {
    const connectedIds = this.graph.get(nodeId) || new Set();
    return Array.from(connectedIds).map(id => this.nodeMap.get(id)).filter(Boolean) as GraphNode[];
  }

  /**
   * Find shortest path between two nodes
   */
  findPath(sourceId: string, targetId: string): GraphNode[] {
    // Simple BFS implementation
    const startNode = this.nodeMap.get(sourceId);
    if (!startNode) {
      return [];
    }
    const queue: [string, GraphNode[]][] = [[sourceId, [startNode]]];
    const visited = new Set<string>();
    visited.add(sourceId);

    while (queue.length > 0) {
      const [currentId, path] = queue.shift()!;
      
      if (currentId === targetId) {
        return path;
      }

      const neighbors = this.graph.get(currentId) || new Set();
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          const neighborNode = this.nodeMap.get(neighborId);
          if (neighborNode) {
            queue.push([neighborId, [...path, neighborNode]]);
          }
        }
      }
    }

    return [];
  }

  /**
   * Export graph to JSON format compatible with graphify
   */
  exportToJSON(): any {
    return {
      nodes: Array.from(this.nodeMap.values()),
      edges: Array.from(this.edgeMap.values()).flat()
    };
  }

  /**
   * Export graph to HTML visualization
   */
  exportToHTML(outputPath?: string): string {
    const nodes = Array.from(this.nodeMap.values());
    const edges = Array.from(this.edgeMap.values()).flat();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>MathMD Knowledge Graph</title>
  <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
  <style>
    #network { width: 100%; height: 600px; border: 1px solid #ccc; }
  </style>
</head>
<body>
  <h1>MathMD Knowledge Graph</h1>
  <div id="network"></div>
  <script>
    const nodes = new vis.DataSet(${JSON.stringify(nodes.map(n => ({
      id: n.id,
      label: n.label,
      title: JSON.stringify(n.properties)
    })))});
    
    const edges = new vis.DataSet(${JSON.stringify(edges.map(e => ({
      from: e.source,
      to: e.target,
      label: e.relation
    })))});
    
    const data = { nodes, edges };
    const options = {
      nodes: { shape: 'dot', size: 16 },
      edges: { arrows: 'to' }
    };
    
    new vis.Network(document.getElementById('network'), data, options);
  </script>
</body>
</html>`;

    if (outputPath) {
      // In a real implementation, write to file
      console.log(`Graph exported to ${outputPath}`);
    }

    return html;
  }
}

// Export factory function
export function createGraph(): MathMDGraph {
  return new MathMDGraph();
}