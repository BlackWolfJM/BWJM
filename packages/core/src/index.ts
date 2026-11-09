import { MathMDDocument, MathMDNode } from "@mathmd/ast";
import { 
  compileExpression, 
  evaluateExpression, 
  sample1D, 
  sampleSurface,
  sampleParametricTrajectory,
  computeKinematics
} from "@mathmd/math";
import type { Vector3D } from "@mathmd/math";

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
    // Extract initial state from slider, checkbox, and timeline nodes
    this.document.children.forEach(node => {
      if (node.type === "slider") {
        this.variables.set(node.name, node.default);
      }
      if (node.type === "checkbox") {
        this.variables.set(node.name, node.default ? 1 : 0);
      }
      if (node.type === "timeline") {
        this.variables.set(node.name, node.default ?? node.domain[0]);
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
      case "trajectory":
        deps.push(...extractVarsFromStr(node.x));
        deps.push(...extractVarsFromStr(node.y));
        if (node.z) deps.push(...extractVarsFromStr(node.z));
        break;
        
      case "vectorfield2d":
      case "field":
        if (node.type === "vectorfield2d") {
          deps.push(...extractVarsFromStr(node.field[0]));
          deps.push(...extractVarsFromStr(node.field[1]));
        } else {
          node.components.forEach(comp => deps.push(...extractVarsFromStr(comp)));
        }
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
        
      case "vectorarrow":
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
        
      case "particle":
      case "frame":
      case "region":
      case "camera":
        // These reference other nodes, not direct variable dependencies
        break;
        
      case "timeline":
        // Timeline controls its own variable
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

      case "trajectory": {
        const trajectory = sampleParametricTrajectory(
          { x: node.x, y: node.y, z: node.z },
          node.tDomain,
          node.samples ?? 100,
          scope
        );
        return {
          ...node,
          type: "trajectory",
          points: trajectory
        };
      }

      case "particle": {
        // Find the referenced trajectory
        const trajectoryNode = this.document.children.find(
          n => n.id === node.trajectoryRef && (n.type === "trajectory" || n.type === "curve3d")
        );
        if (!trajectoryNode) {
          return { ...node, type: "particle", position: [0, 0, 0], trail: [] };
        }

        const tVal = this.variables.get(node.timelineRef ?? "t") ?? 
                     (trajectoryNode.type === "trajectory" ? trajectoryNode.tDomain[0] : 
                      (trajectoryNode as any).tDomain?.[0] ?? 0);
        
        const trajectoryData = this.getNodeData(trajectoryNode.id);
        const points = trajectoryData.points || [];
        
        // Find closest point to current t
        let position: Vector3D = { x: 0, y: 0, z: 0 };
        if (trajectoryNode.type === "trajectory") {
          const kin = computeKinematics({ x: trajectoryNode.x, y: trajectoryNode.y, z: trajectoryNode.z ?? "0" }, tVal, scope);
          position = kin.position;
        } else if ((trajectoryNode as any).tDomain) {
          const kin = computeKinematics({ x: (trajectoryNode as any).x, y: (trajectoryNode as any).y, z: (trajectoryNode as any).z ?? "0" }, tVal, scope);
          position = kin.position;
        }

        // Generate trail if enabled
        const trail: Vector3D[] = [];
        if (node.showTrail && points.length > 0) {
          const trailLength = node.trailLength ?? 50;
          const startIdx = Math.max(0, points.length - trailLength);
          for (let i = startIdx; i < points.length; i++) {
            const p = points[i];
            trail.push(typeof p === 'object' && 'x' in p ? p : { x: p[0], y: p[1], z: p[2] || 0 });
          }
        }

        return {
          ...node,
          type: "particle",
          position,
          trail,
          currentT: tVal
        };
      }

      case "vectorarrow": {
        const origin = this.resolveArray(node.origin, scope) ?? [0, 0, 0];
        const vector = this.resolveArray(node.vector, scope) ?? [0, 0, 0];
        const visualScale = node.visualScale ?? 1;
        const physicalScale = node.physicalScale ?? 1;
        const scale = visualScale * physicalScale;
        
        const end = [
          origin[0] + vector[0] * scale,
          origin[1] + vector[1] * scale,
          origin[2] + vector[2] * scale
        ];

        // Calculate arrow tip points
        const tipSize = node.tipSize ?? 0.15;
        const vecMag = Math.sqrt(vector[0]**2 + vector[1]**2 + vector[2]**2);
        let tipPoints: number[][] = [];
        if (node.showTip !== false && vecMag > 0) {
          const dir = [vector[0]/vecMag, vector[1]/vecMag, vector[2]/vecMag];
          const tipBase = [end[0] - dir[0] * tipSize, end[1] - dir[1] * tipSize, end[2] - dir[2] * tipSize];
          // Simple cone tip - two side points
          const ortho = Math.abs(dir[0]) > 0.9 ? [0, 1, 0] : [1, 0, 0];
          const side1 = [
            tipBase[0] + ortho[0] * tipSize * 0.5,
            tipBase[1] + ortho[1] * tipSize * 0.5,
            tipBase[2] + ortho[2] * tipSize * 0.5
          ];
          const side2 = [
            tipBase[0] - ortho[0] * tipSize * 0.5,
            tipBase[1] - ortho[1] * tipSize * 0.5,
            tipBase[2] - ortho[2] * tipSize * 0.5
          ];
          tipPoints = [end, side1, tipBase, side2, end];
        }

        return {
          ...node,
          type: "vectorarrow",
          origin,
          vector,
          end,
          tipPoints,
          scale,
          layer: node.layer ?? "default",
          visible: node.visible !== false
        };
      }

      case "frame": {
        // Find referenced trajectory
        const trajectoryNode = this.document.children.find(
          n => n.id === node.trajectoryRef && (n.type === "trajectory" || n.type === "curve3d")
        );
        if (!trajectoryNode) {
          return { ...node, type: "frame", T: null, N: null, B: null };
        }

        const tVal = this.variables.get(node.timelineRef ?? "t") ?? 
                     (trajectoryNode.type === "trajectory" ? trajectoryNode.tDomain[0] : 
                      (trajectoryNode as any).tDomain?.[0] ?? 0);

        let kin: any = null;
        if (trajectoryNode.type === "trajectory") {
          kin = computeKinematics({ x: trajectoryNode.x, y: trajectoryNode.y, z: trajectoryNode.z ?? "0" }, tVal, scope);
        } else {
          kin = computeKinematics({ x: (trajectoryNode as any).x, y: (trajectoryNode as any).y, z: (trajectoryNode as any).z ?? "0" }, tVal, scope);
        }

        const frameLen = node.frameLength ?? 0.8;
        const colors = node.colors ?? { T: "#06b6d4", N: "#a855f7", B: "#ec4899" };

        // Determine if curvature/torsion are symbolic, numerical, or undefined
        const isStationary = kin.isStationary || kin.speed < 1e-7;
        const crossMag = Math.sqrt(
          (kin.tangent.y * kin.binormal.z - kin.tangent.z * kin.binormal.y)**2 +
          (kin.tangent.z * kin.binormal.x - kin.tangent.x * kin.binormal.z)**2 +
          (kin.tangent.x * kin.binormal.y - kin.tangent.y * kin.binormal.x)**2
        );
        const isDegenerate = crossMag < 1e-7;

        return {
          ...node,
          type: "frame",
          position: kin.position,
          T: node.showT !== false ? {
            start: kin.position,
            end: { x: kin.position.x + kin.tangent.x * frameLen, y: kin.position.y + kin.tangent.y * frameLen, z: kin.position.z + kin.tangent.z * frameLen },
            color: colors.T,
            curvatureType: isStationary ? "undefined" : (node.curvatureType ?? "numerical"),
            curvatureValue: kin.curvature
          } : null,
          N: node.showN !== false ? {
            start: kin.position,
            end: { x: kin.position.x + kin.normal.x * frameLen, y: kin.position.y + kin.normal.y * frameLen, z: kin.position.z + kin.normal.z * frameLen },
            color: colors.N,
            curvatureType: isDegenerate ? "undefined" : (node.curvatureType ?? "numerical")
          } : null,
          B: node.showB !== false ? {
            start: kin.position,
            end: { x: kin.position.x + kin.binormal.x * frameLen, y: kin.position.y + kin.binormal.y * frameLen, z: kin.position.z + kin.binormal.z * frameLen },
            color: colors.B,
            torsionType: isDegenerate ? "undefined" : (node.torsionType ?? "numerical"),
            torsionValue: kin.torsion
          } : null,
          currentT: tVal,
          isStationary,
          isDegenerate
        };
      }

      case "field": {
        const density = node.density ?? 15;
        const [xMin, xMax] = node.xDomain;
        const [yMin, yMax] = node.yDomain;
        const is3D = node.dimensions === 3;
        const [zMin, zMax] = is3D ? (node.zDomain ?? [-5, 5]) : [0, 0];

        const vectors: any[] = [];
        const cols = density;
        const rows = density;
        const layers = is3D ? density : 1;

        for (let layer = 0; layer < layers; layer++) {
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const x = xMin + (col / (cols - 1)) * (xMax - xMin);
              const y = yMin + (row / (rows - 1)) * (yMax - yMin);
              const z = is3D ? zMin + (layer / (layers - 1)) * (zMax - zMin) : 0;

              const scopeWithXYZ = { ...scope, x, y, z };
              const components = node.components as [string, string, string];

              const fx = evaluateExpression(compileExpression(components[0]), scopeWithXYZ);
              const fy = evaluateExpression(compileExpression(components[1]), scopeWithXYZ);
              const fz = is3D ? evaluateExpression(compileExpression(components[2]), scopeWithXYZ) : 0;

              vectors.push({
                position: [x, y, z],
                vector: [fx, fy, fz],
                magnitude: Math.sqrt(fx*fx + fy*fy + fz*fz)
              });
            }
          }
        }

        return {
          ...node,
          type: "field",
          vectors,
          dimensions: node.dimensions
        };
      }

      case "region": {
        // For now, return the region data for rendering
        // Actual region rendering would need boundary curve sampling
        return {
          ...node,
          type: "region",
          boundary: node.boundary,
          orientation: node.orientation ?? "ccw"
        };
      }

      case "camera": {
        return {
          ...node,
          type: "camera",
          mode: node.mode ?? "fixed"
        };
      }

      case "timeline": {
        const currentValue = this.variables.get(node.name) ?? node.default ?? node.domain[0];
        return {
          ...node,
          type: "timeline",
          value: currentValue,
          speed: node.speed ?? 1.0,
          loop: node.loop ?? true,
          autoplay: node.autoplay ?? false
        };
      }

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

