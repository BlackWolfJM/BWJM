import { describe, it, expect } from 'vitest';
import { parseMathMD } from '@mathmd/parser';
import { MathMDCore } from '../src/index.js';

describe('MathMD Core', () => {
  it('should initialize with slider values', () => {
    const markdown = `
\`\`\`slider
name: a
min: 0
max: 10
default: 5
\`\`\`
`;
    
    const doc = parseMathMD(markdown);
    const core = new MathMDCore(doc);
    
    expect(core.getVariable('a')).toBe(5);
  });
  
  it('should update variable values', () => {
    const markdown = `
\`\`\`slider
name: a
min: 0
max: 10
default: 5
\`\`\`
`;
    
    const doc = parseMathMD(markdown);
    const core = new MathMDCore(doc);
    
    expect(core.getVariable('a')).toBe(5);
    
    const affected = core.setVariable('a', 7);
    expect(core.getVariable('a')).toBe(7);
    expect(affected.length).toBe(0); // No nodes depend on this variable yet
  });
  
  it('should track dependencies', () => {
    const markdown = `
\`\`\`slider
name: a
min: -5
max: 5
\`\`\`

\`\`\`plot2d
equation: a*x^2
x: [-10, 10]
\`\`\`
`;
    
    const doc = parseMathMD(markdown);
    const core = new MathMDCore(doc);
    
    // Check that variable 'a' is set
    expect(core.getVariable('a')).toBe(0); // default
    
    // Check that changing 'a' affects the plot2d node
    const plotNode = doc.children[1];
    expect(plotNode.type).toBe('plot2d');
    
    const affected = core.setVariable('a', 3);
    expect(core.getVariable('a')).toBe(3);
    expect(affected.length).toBe(1);
    expect(affected[0]).toBe(plotNode.id);
  });
  
  it('should initialize checkbox values', () => {
    const markdown = `
\`\`\`checkbox
name: b
default: true
\`\`\`
`;
    
    const doc = parseMathMD(markdown);
    const core = new MathMDCore(doc);
    
    expect(core.getVariable('b')).toBe(1); // true -> 1
  });
  
  it('should update checkbox values', () => {
    const markdown = `
\`\`\`checkbox
name: b
default: false
\`\`\`
`;
    
    const doc = parseMathMD(markdown);
    const core = new MathMDCore(doc);
    
    expect(core.getVariable('b')).toBe(0); // false -> 0
    
    const affected = core.setVariable('b', 1);
    expect(core.getVariable('b')).toBe(1);
    expect(affected.length).toBe(0); // No nodes depend on this variable yet
  });
  
  it('should use slider variable in plot2d equation', () => {
    const markdown = `
\`\`\`slider
name: a
min: 0
max: 10
default: 2
\`\`\`

\`\`\`plot2d
equation: a*x
x: [0, 5]
\`\`\`
`;
    
    const doc = parseMathMD(markdown);
    const core = new MathMDCore(doc);
    
    const plotNode = doc.children[1];
    const data = core.getNodeData(plotNode.id);
    
    expect(data.type).toBe('plot2d');
    expect(data.points).toHaveLength(100); // default count in sample1D is 100
    // Check first and last points
    expect(data.points[0]).toEqual([0, 0]); // x=0 => a*0 = 0
    expect(data.points[99]).toEqual([5, 10]); // x=5 => a*5 = 2*5 = 10
  });
  
  it('should use slider variable in surface3d equation', () => {
    const markdown = `
\`\`\`slider
name: a
min: 0
max: 10
default: 1
\`\`\`

\`\`\`surface3d
equation: a*x + y
x: [0, 4]
y: [0, 4]
samples: 2
\`\`\`
`;
    
    const doc = parseMathMD(markdown);
    const core = new MathMDCore(doc);
    
    const surfaceNode = doc.children[1];
    const data = core.getNodeData(surfaceNode.id);
    
    expect(data.type).toBe('surface3d');
    expect(data.points.x).toHaveLength(2);
    expect(data.points.y).toHaveLength(2);
    expect(data.points.z).toHaveLength(2);
    // With samples=2, xSamples=2, ySamples=2
    // x: [0,4] for each row
    // y: [0,0] first row, [4,4] second row
    // z = a*x + y, a=1
    // [0,0]: 1*0+0=0
    // [4,0]: 1*4+0=4
    // [0,4]: 1*0+4=4
    // [4,4]: 1*4+4=8
    expect(data.points.x[0][0]).toBe(0);
    expect(data.points.y[0][0]).toBe(0);
    expect(data.points.z[0][0]).toBe(0);

    expect(data.points.x[0][1]).toBe(4);
    expect(data.points.y[0][1]).toBe(0);
    expect(data.points.z[0][1]).toBe(4);

    expect(data.points.x[1][0]).toBe(0);
    expect(data.points.y[1][0]).toBe(4);
    expect(data.points.z[1][0]).toBe(4);

    expect(data.points.x[1][1]).toBe(4);
    expect(data.points.y[1][1]).toBe(4);
    expect(data.points.z[1][1]).toBe(8);
  });
  
  it('should update slider variable and recalculate plot2d', () => {
    const markdown = `
\`\`\`slider
name: a
min: 0
max: 10
default: 1
\`\`\`

\`\`\`plot2d
equation: a*x
x: [0, 10]
\`\`\`
`;
    
    const doc = parseMathMD(markdown);
    const core = new MathMDCore(doc);
    
    const plotNode = doc.children[1];
    let data = core.getNodeData(plotNode.id);
    const midIndex = Math.floor(data.points.length / 2);
    const [midX, initialY] = data.points[midIndex];
    // initial a=1: y = 1*x
    expect(initialY).toBeCloseTo(1 * midX);
    
    // update a to 3
    const affected = core.setVariable('a', 3);
    expect(affected.length).toBe(1);
    expect(affected[0]).toBe(plotNode.id);
    
    data = core.getNodeData(plotNode.id);
    // now a=3: y = 3*x
    expect(data.points[midIndex][0]).toBe(midX);
    expect(data.points[midIndex][1]).toBeCloseTo(3 * midX);
  });
  
  it('should update slider variable and recalculate surface3d', () => {
    const markdown = `
\`\`\`slider
name: a
min: 0
max: 10
default: 1
\`\`\`

\`\`\`surface3d
equation: a*x + y
x: [0, 4]
y: [0, 4]
samples: 2
\`\`\`
`;
    
    const doc = parseMathMD(markdown);
    const core = new MathMDCore(doc);
    
    const surfaceNode = doc.children[1];
    let data = core.getNodeData(surfaceNode.id);
    // With samples: 2 over [0, 4], point at [1][1] has x=4, y=4
    const sampleX = data.points.x[1][1];
    const sampleY = data.points.y[1][1];
    expect(sampleX).toBe(4);
    expect(sampleY).toBe(4);
    // initial a=1: z = 1*4 + 4 = 8
    expect(data.points.z[1][1]).toBe(1 * sampleX + sampleY);
    expect(data.points.z[1][1]).toBe(8);
    
    // update a to 2
    const affected = core.setVariable('a', 2);
    expect(affected.length).toBe(1);
    expect(affected[0]).toBe(surfaceNode.id);
    
    data = core.getNodeData(surfaceNode.id);
    // now a=2: z = 2*4 + 4 = 12
    expect(data.points.z[1][1]).toBe(2 * sampleX + sampleY);
    expect(data.points.z[1][1]).toBe(12);
  });
  
  it('should use checkbox variable in plot2d equation', () => {
    const markdown = `
\`\`\`checkbox
name: b
default: true
\`\`\`

\`\`\`plot2d
equation: b*x
x: [0, 5]
\`\`\`
`;
    
    const doc = parseMathMD(markdown);
    const core = new MathMDCore(doc);
    
    const plotNode = doc.children[1];
    const data = core.getNodeData(plotNode.id);
    
    expect(data.type).toBe('plot2d');
    // b=true => 1, so y = 1*x
    expect(data.points[0]).toEqual([0, 0]);
    expect(data.points[99]).toEqual([5, 5]);
  });
  
  it('should update checkbox variable and recalculate plot2d', () => {
    const markdown = `
\`\`\`checkbox
name: b
default: false
\`\`\`

\`\`\`plot2d
equation: b*x
x: [0, 5]
\`\`\`
`;
    
    const doc = parseMathMD(markdown);
    const core = new MathMDCore(doc);
    
    const plotNode = doc.children[1];
    let data = core.getNodeData(plotNode.id);
    // initial b=false => 0, y=0
    expect(data.points[0]).toEqual([0, 0]);
    expect(data.points[99]).toEqual([5, 0]);
    
    // update b to true
    const affected = core.setVariable('b', 1);
    expect(affected.length).toBe(1);
    expect(affected[0]).toBe(plotNode.id);
    
    data = core.getNodeData(plotNode.id);
    // now b=true => 1, y = x
    expect(data.points[0]).toEqual([0, 0]);
    expect(data.points[99]).toEqual([5, 5]);
  });
  
  it('should reject unknown variable in setVariable and undefined symbols in equations', () => {
    const markdown = `
\`\`\`slider
name: a
min: 0
max: 10
default: 5
\`\`\`

\`\`\`plot2d
equation: unknown * x
x: [0, 5]
\`\`\`
`;
    
    const doc = parseMathMD(markdown);
    const core = new MathMDCore(doc);
    
    // setVariable with an undeclared name must throw Unknown variable
    expect(() => core.setVariable('undeclared', 10)).toThrow(/Unknown variable: undeclared/);

    // evaluating an equation with an undefined symbol must throw Undefined symbol
    expect(() => core.getNodeData(doc.children[1].id)).toThrow(/Undefined symbol unknown/);
  });

  it("should initialize timeline variable and update particle and frame reactively on setVariable (P0-03)", () => {
    const markdown = `
\`\`\`timeline
name: t
domain: [0, 6.28]
default: 0
\`\`\`

\`\`\`trajectory
id: traj-helix
x: cos(t)
y: sin(t)
z: t
tDomain: [0, 6.28]
samples: 50
\`\`\`

\`\`\`particle
id: part-1
trajectoryRef: traj-helix
timelineRef: t
showTrail: true
trailLength: 10
\`\`\`

\`\`\`frame
id: frame-1
trajectoryRef: traj-helix
timelineRef: t
showT: true
showN: true
showB: true
\`\`\`
`;

    const doc = parseMathMD(markdown);
    const core = new MathMDCore(doc);

    expect(core.getVariable("t")).toBe(0);

    const partInitial = core.getNodeData("part-1");
    expect(partInitial.position.x).toBeCloseTo(1, 2);
    expect(partInitial.position.y).toBeCloseTo(0, 2);

    const frameInitial = core.getNodeData("frame-1");
    expect(frameInitial.T).toBeDefined();
    expect(frameInitial.N).toBeDefined();

    const affected = core.setVariable("t", Math.PI / 2);
    expect(affected).toContain("part-1");
    expect(affected).toContain("frame-1");

    const partMoved = core.getNodeData("part-1");
    expect(partMoved.position.x).toBeCloseTo(0, 2);
    expect(partMoved.position.y).toBeCloseTo(1, 2);
    expect(partMoved.currentT).toBeCloseTo(Math.PI / 2, 2);
  });

  it("should compute particle trail that does not anticipate future points (P1-05)", () => {
    const markdown = `
\`\`\`timeline
name: t
domain: [0, 10]
default: 2
\`\`\`

\`\`\`trajectory
id: traj-line
x: t
y: "0"
z: "0"
tDomain: [0, 10]
samples: 11
\`\`\`

\`\`\`particle
id: part-line
trajectoryRef: traj-line
timelineRef: t
showTrail: true
trailLength: 5
\`\`\`
`;

    const doc = parseMathMD(markdown);
    const core = new MathMDCore(doc);

    const partAt2 = core.getNodeData("part-line");
    expect(partAt2.position.x).toBeCloseTo(2, 1);
    for (const pt of partAt2.trail) {
      expect(pt.x).toBeLessThanOrEqual(2.05);
    }

    core.setVariable("t", 5);
    const partAt5 = core.getNodeData("part-line");
    expect(partAt5.position.x).toBeCloseTo(5, 1);
    for (const pt of partAt5.trail) {
      expect(pt.x).toBeLessThanOrEqual(5.05);
    }
  });
});