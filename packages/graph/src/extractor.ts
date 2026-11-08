// MathMD-specific extractor for knowledge graph

import { MathMDGraph, GraphNode, GraphEdge } from './graph.js';

export interface MathMDExtractionResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  communities: GraphCommunity[];
}

export interface GraphCommunity {
  id: string;
  nodes: string[];
  label: string;
  type: 'mathematical' | 'visualization' | 'interactive' | 'documentation';
}

/**
 * Advanced extractor for MathMD documents with mathematical concept extraction
 */
export class MathMDExtractor {
  private graph: MathMDGraph;

  constructor() {
    this.graph = new MathMDGraph();
  }

  /**
   * Extract comprehensive graph from MathMD document with mathematical concepts
   */
  extractMathConcepts(markdown: string, filename: string = 'document.md'): MathMDExtractionResult {
    const baseExtraction = this.graph.extractFromMarkdown(markdown, filename);
    
    // Enhance with mathematical concept extraction
    const enhancedNodes = this.extractMathematicalConcepts(baseExtraction.nodes);
    const enhancedEdges = this.enhanceWithMathematicalRelations(
      baseExtraction.edges, 
      enhancedNodes
    );
    
    // Detect communities
    const communities = this.detectCommunities(enhancedNodes, enhancedEdges);

    return {
      nodes: enhancedNodes,
      edges: enhancedEdges,
      communities
    };
  }

  /**
   * Extract mathematical concepts from nodes
   */
  private extractMathematicalConcepts(nodes: GraphNode[]): GraphNode[] {
    const enhancedNodes = [...nodes];

    nodes.forEach(node => {
      if (node.type === 'plot2d' || node.type === 'surface3d') {
        const equation = node.properties?.equation || '';
        
        // Extract functions used
        const functions = this.extractFunctions(equation);
        functions.forEach(func => {
          enhancedNodes.push({
            id: `function_${func}`,
            label: func,
            type: 'function',
            sourceFile: node.sourceFile,
            properties: { category: 'mathematical_function', usage: 'in_equation' }
          });

          enhancedNodes.push({
            id: `${node.id}_uses_${func}`,
            label: `${node.label} uses ${func}`,
            type: 'usage',
            sourceFile: node.sourceFile,
            properties: { parent: node.id, function: func }
          });
        });

        // Extract mathematical operations
        const operations = this.extractOperations(equation);
        operations.forEach(op => {
          enhancedNodes.push({
            id: `operation_${op}_${node.id}`,
            label: op,
            type: 'operation',
            sourceFile: node.sourceFile,
            properties: { category: 'mathematical_operation', in_node: node.id }
          });
        });
      }

      // Extract domain concepts
      if (node.properties?.xDomain || node.properties?.yDomain) {
        enhancedNodes.push({
          id: `domain_${node.id}`,
          label: `Domain of ${node.label}`,
          type: 'domain',
          sourceFile: node.sourceFile,
          properties: {
            xDomain: node.properties.xDomain,
            yDomain: node.properties.yDomain,
            parent: node.id
          }
        });
      }
    });

    return enhancedNodes;
  }

  /**
   * Extract mathematical functions from equation
   */
  private extractFunctions(equation: string): string[] {
    const functionPattern = /\b(sin|cos|tan|asin|acos|atan|sqrt|exp|log|ln|abs|floor|ceil|min|max)\b/g;
    const matches = equation.match(functionPattern) || [];
    return [...new Set(matches)];
  }

  /**
   * Extract mathematical operations from equation
   */
  private extractOperations(equation: string): string[] {
    const operations = [];
    
    if (/\^/.test(equation)) operations.push('power');
    if (/[*/]/.test(equation)) operations.push('arithmetic');
    if (/[+-]/.test(equation)) operations.push('addition_subtraction');
    if (/\(.*\)/.test(equation)) operations.push('parentheses');
    
    return operations;
  }

  /**
   * Enhance edges with mathematical relationships
   */
  private enhanceWithMathematicalRelations(
    edges: GraphEdge[], 
    nodes: GraphNode[]
  ): GraphEdge[] {
    const enhancedEdges = [...edges];

    // Add mathematical concept relationships
    nodes.forEach(node => {
      if (node.type === 'function') {
        // Link functions to other mathematical functions they might compose with
        const relatedFunctions = nodes.filter(n => 
          n.type === 'function' && n.id !== node.id
        );
        
        relatedFunctions.forEach(related => {
          enhancedEdges.push({
            source: node.id,
            target: related.id,
            relation: 'similar_category',
            confidence: 'INFERRED',
            properties: { category: 'mathematical_functions' }
          });
        });
      }

      if (node.type === 'operation') {
        // Link operations to functions used
        const parentNode = nodes.find(n => n.id === node.properties?.in_node);
        if (parentNode) {
          enhancedEdges.push({
            source: node.id,
            target: parentNode.id,
            relation: 'applies_to',
            confidence: 'EXTRACTED'
          });
        }
      }
    });

    return enhancedEdges;
  }

  /**
   * Detect communities in the graph
   */
  private detectCommunities(nodes: GraphNode[], _edges: GraphEdge[]): GraphCommunity[] {
    const communities: GraphCommunity[] = [];
    
    // Group by node type
    const typeGroups = new Map<string, GraphNode[]>();
    nodes.forEach(node => {
      if (!typeGroups.has(node.type)) {
        typeGroups.set(node.type, []);
      }
      typeGroups.get(node.type)!.push(node);
    });

    // Create communities based on types
    typeGroups.forEach((nodesInGroup, type) => {
      let communityType: GraphCommunity['type'] = 'documentation';
      
      if (['plot2d', 'surface3d', 'vector2d', 'vector3d', 'curve3d'].includes(type)) {
        communityType = 'visualization';
      } else if (['slider', 'checkbox', 'point2d', 'point3d'].includes(type)) {
        communityType = 'interactive';
      } else if (['function', 'operation', 'domain'].includes(type)) {
        communityType = 'mathematical';
      }

      communities.push({
        id: `community_${type}`,
        nodes: nodesInGroup.map(n => n.id),
        label: `${type} components`,
        type: communityType
      });
    });

    return communities;
  }

  /**
   * Generate a report similar to graphify's GRAPH_REPORT.md
   */
  generateReport(markdown: string, filename: string = 'document.md'): string {
    const extraction = this.extractMathConcepts(markdown, filename);
    
    // Find god nodes (highest degree)
    const nodeDegrees = new Map<string, number>();
    extraction.edges.forEach(edge => {
      nodeDegrees.set(edge.source, (nodeDegrees.get(edge.source) || 0) + 1);
      nodeDegrees.set(edge.target, (nodeDegrees.get(edge.target) || 0) + 1);
    });
    
    const godNodes = Array.from(nodeDegrees.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, degree]) => {
        const node = extraction.nodes.find(n => n.id === id);
        return { id, label: node?.label || id, degree };
      });

    // Find surprising connections
    const surprisingConnections = extraction.edges
      .filter(e => e.confidence === 'INFERRED')
      .slice(0, 5);

    // Generate suggested questions
    const suggestedQuestions = this.generateQuestions(extraction);

    let report = `# MathMD Knowledge Graph Report\n\n`;
    report += `**File:** ${filename}\n\n`;
    report += `**Nodes:** ${extraction.nodes.length}\n`;
    report += `**Edges:** ${extraction.edges.length}\n`;
    report += `**Communities:** ${extraction.communities.length}\n\n`;

    report += `## God Nodes\n\n`;
    godNodes.forEach((node, i) => {
      report += `${i + 1}. **${node.label}** (${node.id}) - ${node.degree} connections\n`;
    });

    report += `\n## Surprising Connections\n\n`;
    surprisingConnections.forEach((edge, i) => {
      const source = extraction.nodes.find(n => n.id === edge.source)?.label || edge.source;
      const target = extraction.nodes.find(n => n.id === edge.target)?.label || edge.target;
      report += `${i + 1}. **${source}** → **${target}** (${edge.relation})\n`;
    });

    report += `\n## Suggested Questions\n\n`;
    suggestedQuestions.forEach((q, i) => {
      report += `${i + 1}. ${q}\n`;
    });

    report += `\n## Communities\n\n`;
    extraction.communities.forEach(community => {
      report += `### ${community.label} (${community.type})\n`;
      report += `Nodes: ${community.nodes.length}\n\n`;
    });

    return report;
  }

  /**
   * Generate suggested questions based on graph structure
   */
  private generateQuestions(extraction: MathMDExtractionResult): string[] {
    const questions: string[] = [];
    
    // Find slider-visualization connections
    const sliders = extraction.nodes.filter(n => n.type === 'slider');
    const visualizations = extraction.nodes.filter(n => 
      ['plot2d', 'surface3d'].includes(n.type)
    );

    if (sliders.length > 0 && visualizations.length > 0) {
      questions.push(
        'How do the sliders affect the visualizations in this document?'
      );
    }

    // Find functions
    const functions = extraction.nodes.filter(n => n.type === 'function');
    if (functions.length > 0) {
      questions.push(
        `Which mathematical functions are used: ${functions.map(f => f.label).join(', ')}?`
      );
    }

    // Find domains
    const domains = extraction.nodes.filter(n => n.type === 'domain');
    if (domains.length > 0) {
      questions.push(
        'What are the mathematical domains explored in this document?'
      );
    }

    // Generic questions
    questions.push(
      'What are the main mathematical concepts covered?',
      'Are there any dependencies between different visualizations?'
    );

    return questions.slice(0, 5);
  }

  /**
   * Export graph in graphify-compatible format
   */
  exportGraphifyFormat(markdown: string, filename: string = 'document.md'): any {
    const extraction = this.extractMathConcepts(markdown, filename);
    
    return {
      metadata: {
        file: filename,
        extracted_at: new Date().toISOString(),
        node_count: extraction.nodes.length,
        edge_count: extraction.edges.length
      },
      nodes: extraction.nodes,
      edges: extraction.edges,
      communities: extraction.communities
    };
  }
}