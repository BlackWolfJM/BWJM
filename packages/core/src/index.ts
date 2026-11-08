import { MathMDDocument, MathMDNode } from "@mathmd/ast";
import { compileExpression, evaluateExpression, sample1D, sampleSurface } from "@mathmd/math";

// Core MathMD runtime with reactivity system
export class MathMDCore {
  private document: MathMDDocument;
  private variables: Map<string, number> = new Map();
  private dependencyMap: Map<string, Set<string>> = new Map(); // variable -> nodes that depend on it
  private reverseDependencyMap: Map<string, Set<string>> = new Map(); // node -> variables it depends on
  private nodeCache: Map<string, any> = new Map(); // cached rendered results
  
  constructor(document: MathMDDocument) {
    this.document = document;
    this.initialize();
  }
  
  private initialize() {
    // Extract initial state from slider and checkbox nodes
    this.document.children.forEach(node => {
      if (node.type === "slider") {
        this.variables.set(node.name, node.default);
      }
      if (node.type === "checkbox") {
        this.variables.set(node.name, node.default ? 1 : 0);
      }
    });
    
    // Build dependency graph
    this.buildDependencyGraph();
  }
  
  private buildDependencyGraph() {
    // Clear existing maps
    this.dependencyMap.clear();
    this.reverseDependencyMap.clear();
    
    // Initialize dependency sets for each variable
    this.variables.forEach((_, name) => {
      this.dependencyMap.set(name, new Set());
    });
    
    // Analyze each node to build dependencies
    this.document.children.forEach(node => {
      const nodeId = node.id;
      const dependencies = this.extractDependencies(node);
      
      // Store reverse dependencies (node -> variables)
      this.reverseDependencyMap.set(nodeId, new Set(dependencies));
      
      // Store forward dependencies (variable -> nodes)
      dependencies.forEach(dep => {
        if (!this.dependencyMap.has(dep)) {
          this.dependencyMap.set(dep, new Set());
        }
        this.dependencyMap.get(dep)!.add(nodeId);
      });
    });
  }
  
  private extractDependencies(node: MathMDNode): string[] {
    const deps: string[] = [];
    
    // Extract variables from equations and expressions
    const extractVarsFromStr = (str: string) => {
      // Simple regex to find variable names (letters, possibly with numbers)
      const varMatches = str.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
      return varMatches.filter(name => this.variables.has(name));
    };
    
    switch (node.type) {
      case "plot2d":
        deps.push(...extractVarsFromStr(node.equation));
        break;
        
      case "surface3d":
        deps.push(...extractVarsFromStr(node.equation));
        break;
        
      case "vector2d":
        // Check origin and vector components
        if (Array.isArray(node.origin)) {
          node.origin.forEach(val => {
            if (typeof val === 'string') {
              deps.push(...extractVarsFromStr(val));
            }
          });
        }
        if (Array.isArray(node.vector)) {
          node.vector.forEach(val => {
            if (typeof val === 'string') {
              deps.push(...extractVarsFromStr(val));
            }
          });
        }
        break;
        
      case "vector3d":
        // Check origin and vector components
        if (Array.isArray(node.origin)) {
          node.origin.forEach(val => {
            if (typeof val === 'string') {
              deps.push(...extractVarsFromStr(val));
            }
          });
        }
        if (Array.isArray(node.vector)) {
          node.vector.forEach(val => {
            if (typeof val === 'string') {
              deps.push(...extractVarsFromStr(val));
            }
          });
        }
        break;
        
      case "curve3d":
        deps.push(...extractVarsFromStr(node.x));
        deps.push(...extractVarsFromStr(node.y));
        deps.push(...extractVarsFromStr(node.z));
        break;
        
      case "vectorfield2d":
        deps.push(...extractVarsFromStr(node.field[0]));
        deps.push(...extractVarsFromStr(node.field[1]));
        break;
        
      case "gradient":
        deps.push(...extractVarsFromStr(node.function));
        break;
        
      case "tangentplane":
        deps.push(...extractVarsFromStr(node.function));
        break;
        
      case "contour":
        deps.push(...extractVarsFromStr(node.function));
        break;
        
      default:
        // slider, checkbox, etc. don't have dependencies in their definitions
        break;
    }
    
    return [...new Set(deps)]; // Remove duplicates
  }
  
  // Get current variable value
  getVariable(name: string): number | undefined {
    return this.variables.get(name);
  }
  
  // Set variable value and return affected nodes
  setVariable(name: string, value: number): string[] {
    if (!this.variables.has(name)) {
      throw new Error(`Unknown variable: ${name}`);
    }
    
    const oldValue = this.variables.get(name)!;
    if (oldValue === value) {
      return []; // No change
    }
    
    this.variables.set(name, value);
    
    // Clear cache for affected nodes
    const affectedNodes = this.dependencyMap.get(name) || new Set();
    affectedNodes.forEach(nodeId => {
      this.nodeCache.delete(nodeId);
    });
    
    return Array.from(affectedNodes);
  }
  
  // Get processed node data (with variables substituted)
  getNodeData(nodeId: string): any {
    // Check cache first
    if (this.nodeCache.has(nodeId)) {
      return this.nodeCache.get(nodeId);
    }
    
    const node = this.document.children.find(n => n.id === nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    
    const processed = this.processNode(node);
    this.nodeCache.set(nodeId, processed);
    return processed;
  }
  
  private processNode(node: MathMDNode): any {
    // Create a scope with current variable values
    const scope: Record<string, number> = {};
    this.variables.forEach((value, name) => {
      scope[name] = value;
    });
    
    switch (node.type) {
      case "plot2d": {
        const compiled = compileExpression(node.equation);
        const sampled = sample1D(
          node.equation, 
          node.xDomain, 
          100,
          scope
        );
        
        return {
          ...node,
          type: "plot2d",
          points: sampled.x.map((x, i) => [x, sampled.y[i]]),
          compiledExpression: compiled
        };
      }
      
      case "surface3d": {
        const sampled = sampleSurface(
          node.equation,
          node.xDomain,
          node.yDomain,
          node.samples ?? 50,
          node.samples ?? 50,
          scope
        );
        
        return {
          ...node,
          type: "surface3d",
          points: sampled,
          compiledExpression: compileExpression(node.equation)
        };
      }
      
      case "vector2d": {
        // Resolve origin and vector with variables
        const origin = this.resolveArray(node.origin, scope);
        const vector = this.resolveArray(node.vector, scope);
        
        return {
          ...node,
          type: "vector2d",
          origin: origin ?? [0, 0],
          vector: vector ?? [0, 0],
          end: [
            (origin ?? [0, 0])[0] + (vector ?? [0, 0])[0],
            (origin ?? [0, 0])[1] + (vector ?? [0, 0])[1]
          ]
        };
      }
      
      case "vector3d": {
        // Resolve origin and vector with variables
        const origin = this.resolveArray(node.origin, scope);
        const vector = this.resolveArray(node.vector, scope);
        
        return {
          ...node,
          type: "vector3d",
          origin: origin ?? [0, 0, 0],
          vector: vector ?? [0, 0, 0],
          end: [
            (origin ?? [0, 0, 0])[0] + (vector ?? [0, 0, 0])[0],
            (origin ?? [0, 0, 0])[1] + (vector ?? [0, 0, 0])[1],
            (origin ?? [0, 0, 0])[2] + (vector ?? [0, 0, 0])[2]
          ]
        };
      }
      
      case "curve3d": {
        // Sample parametric curve
        const tCount = 100;
        const [tMin, tMax] = node.tDomain;
        const points: number[][] = [];
        
        for (let i = 0; i <= tCount; i++) {
          const t = tMin + (i / tCount) * (tMax - tMin);
          const scopeWithT = { ...scope, t };
          
          const x = evaluateExpression(compileExpression(node.x), scopeWithT);
          const y = evaluateExpression(compileExpression(node.y), scopeWithT);
          const z = evaluateExpression(compileExpression(node.z), scopeWithT);
          
          points.push([x, y, z]);
        }
        
        return {
          ...node,
          type: "curve3d",
          points
        };
      }
      
      case "vectorfield2d": {
        const density = node.density ?? 15;
        const [xMin, xMax] = node.xDomain;
        const [yMin, yMax] = node.yDomain;
        
        const vectors: {
          position: [number, number];
          vector: [number, number];
        }[] = [];
        
        // Create grid
        const cols = density;
        const rows = density;
        
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x = xMin + (col / (cols - 1)) * (xMax - xMin);
            const y = yMin + (row / (rows - 1)) * (yMax - yMin);
            
            const scopeWithXY = { ...scope, x, y };
            
            const fx = evaluateExpression(compileExpression(node.field[0]), scopeWithXY);
            const fy = evaluateExpression(compileExpression(node.field[1]), scopeWithXY);
            
            vectors.push({
              position: [x, y],
              vector: [fx, fy]
            });
          }
        }
        
        return {
          ...node,
          type: "vectorfield2d",
          vectors
        };
      }
      
      case "gradient": {
        const [x, y] = node.point;
        const scopeWithPoint = { ...scope, x, y };
        
        // Compute partial derivatives numerically
        const h = 1e-5;
        
        // df/dx
        const fxPlus = evaluateExpression(compileExpression(node.function), { ...scopeWithPoint, x: x + h });
        const fxMinus = evaluateExpression(compileExpression(node.function), { ...scopeWithPoint, x: x - h });
        const dfdx = (fxPlus - fxMinus) / (2 * h);
        
        // df/dy
        const fyPlus = evaluateExpression(compileExpression(node.function), { ...scopeWithPoint, y: y + h });
        const fyMinus = evaluateExpression(compileExpression(node.function), { ...scopeWithPoint, y: y - h });
        const dfdy = (fyPlus - fyMinus) / (2 * h);
        
        const fValue = evaluateExpression(compileExpression(node.function), scopeWithPoint);
        
        return {
          ...node,
          type: "gradient",
          point: [x, y],
          functionValue: fValue,
          gradient: [dfdx, dfdy],
          magnitude: Math.sqrt(dfdx * dfdx + dfdy * dfdy)
        };
      }
      
      case "tangentplane": {
        const [x0, y0] = node.point;
        const scopeWithPoint = { ...scope, x: x0, y: y0 };
        
        // Compute partial derivatives numerically
        const h = 1e-5;
        
        // df/dx
        const fxPlus = evaluateExpression(compileExpression(node.function), { ...scopeWithPoint, x: x0 + h });
        const fxMinus = evaluateExpression(compileExpression(node.function), { ...scopeWithPoint, x: x0 - h });
        const dfdx = (fxPlus - fxMinus) / (2 * h);
        
        // df/dy
        const fyPlus = evaluateExpression(compileExpression(node.function), { ...scopeWithPoint, y: y0 + h });
        const fyMinus = evaluateExpression(compileExpression(node.function), { ...scopeWithPoint, y: y0 - h });
        const dfdy = (fyPlus - fyMinus) / (2 * h);
        
        const fValue = evaluateExpression(compileExpression(node.function), scopeWithPoint);
        
        // Tangent plane: z = f(x0,y0) + fx*(x-x0) + fy*(y-y0)
        return {
          ...node,
          type: "tangentplane",
          point: [x0, y0],
          functionValue: fValue,
          gradient: [dfdx, dfdy],
          // Returns function: (x, y) => fValue + dfdx*(x-x0) + dfdy*(y-y0)
          tangentPlaneFunc: (x: number, y: number) => 
            fValue + dfdx * (x - x0) + dfdy * (y - y0)
        };
      }
      
      case "slider":
        return {
          ...node,
          type: "slider",
          value: this.variables.get(node.name) ?? node.default
        };
        
      case "checkbox":
        return {
          ...node,
          type: "checkbox",
          value: this.variables.get(node.name as string) ?? !!node.default
        };
        
      case "point2d": {
        return {
          ...node,
          type: "point2d",
          x: typeof node.x === 'number' ? node.x : 
                evaluateExpression(compileExpression(node.x as string), scope),
          y: typeof node.y === 'number' ? node.y : 
                evaluateExpression(compileExpression(node.y as string), scope)
        };
      }
      
      case "point3d": {
        return {
          ...node,
          type: "point3d",
          x: typeof node.x === 'number' ? node.x : 
                evaluateExpression(compileExpression(node.x as string), scope),
          y: typeof node.y === 'number' ? node.y : 
                evaluateExpression(compileExpression(node.y as string), scope),
          z: typeof node.z === 'number' ? node.z : 
                evaluateExpression(compileExpression(node.z as string), scope)
        };
      }
      
      case "contour": {
        const surface = sampleSurface(node.function, node.xDomain, node.yDomain, 50, 50, scope);
        const finiteValues = surface.z.flat().filter(Number.isFinite);
        const minimum = finiteValues.length > 0 ? Math.min(...finiteValues) : 0;
        const maximum = finiteValues.length > 0 ? Math.max(...finiteValues) : 0;
        const count = typeof node.levels === "number" ? node.levels : 10;
        const levels = Array.isArray(node.levels)
          ? node.levels
          : Array.from({ length: count }, (_, index) =>
              minimum + ((index + 1) / (count + 1)) * (maximum - minimum));
        
        return {
          ...node,
          type: "contour",
          levels,
          surface,
        };
      }
      
      case "diagram":
      case "geometry":
        // These don't need variable substitution in their basic form
        return {
          ...node,
          type: node.type
        };
        
      default:
        return node;
    }
  }
  
  private resolveArray(value: any, scope: Record<string, number>): number[] | null {
    if (Array.isArray(value)) {
      const resolved: number[] = [];
      for (const item of value) {
        if (typeof item === 'number') {
          resolved.push(item);
        } else if (typeof item === 'string') {
          try {
            resolved.push(evaluateExpression(compileExpression(item), scope));
          } catch (e) {
            return null; // Failed to resolve
          }
        } else {
          return null; // Invalid type
        }
      }
      return resolved;
    }
    
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const resolved: number[] = [];
          for (const item of parsed) {
            if (typeof item === 'number') {
              resolved.push(item);
            } else if (typeof item === 'string') {
              resolved.push(evaluateExpression(compileExpression(item), scope));
            } else {
              return null;
            }
          }
          return resolved;
        }
      } catch (e) {
        // Try comma-separated string
        const parts = value.split(',').map(part => part.trim());
        const resolved: number[] = [];
        for (const part of parts) {
          if (/^[\d.-]+$/.test(part)) {
            resolved.push(parseFloat(part));
          } else {
            try {
              resolved.push(evaluateExpression(compileExpression(part), scope));
            } catch (e) {
              return null;
            }
          }
        }
        return resolved;
      }
    }
    
    return null;
  }
  
  // Get all current variables
  getVariables(): Record<string, number> {
    const result: Record<string, number> = {};
    this.variables.forEach((value, name) => {
      result[name] = value;
    });
    return result;
  }
  
  // Clear node cache
  clearCache() {
    this.nodeCache.clear();
  }
}

// Export the core class
export default MathMDCore;

export * from "./container.js";

