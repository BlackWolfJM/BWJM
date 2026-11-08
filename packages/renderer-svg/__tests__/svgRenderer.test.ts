import { beforeAll, describe, expect, it } from 'vitest';
import { SVGRenderer } from '../src/index.js';

interface MockElement {
  tagName: string;
  attributes: Record<string, string>;
  children: MockElement[];
  lastChild: MockElement | null;
  textContent: string;
  appendChild(child: MockElement): MockElement;
  removeChild(child: MockElement): MockElement;
  setAttribute(name: string, value: string): void;
}

function createMockElement(tag: string): MockElement {
  return {
    tagName: tag,
    attributes: {},
    children: [],
    lastChild: null,
    textContent: '',
    appendChild(child) {
      this.children.push(child);
      this.lastChild = child;
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((candidate) => candidate !== child);
      this.lastChild = this.children.length > 0 ? this.children[this.children.length - 1] : null;
      return child;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
}

function allDescendants(element: MockElement): MockElement[] {
  return element.children.flatMap((child) => [child, ...allDescendants(child)]);
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElementNS: (_namespace: string, tag: string) => createMockElement(tag),
    },
  });
});

const range = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 4, column: 4, offset: 40 },
};

describe('SVGRenderer', () => {
  it('renders the vectors calculated by core instead of placeholder arrows', () => {
    const container = createMockElement('div');
    const renderer = new SVGRenderer(container as unknown as HTMLElement, 300, 200);

    renderer.render({
      id: 'field-1',
      range,
      type: 'vectorfield2d',
      field: ['-y', 'x'],
      xDomain: [-1, 1],
      yDomain: [-1, 1],
      density: 2,
      vectors: [{ position: [0, 0], vector: [1, 0] }],
    } as never);

    const lines = allDescendants(renderer.getElement() as unknown as MockElement)
      .filter((element) => element.tagName === 'line');
    expect(lines).toHaveLength(1);
  });

  it('renders contour line segments from sampled surface data', () => {
    const container = createMockElement('div');
    const renderer = new SVGRenderer(container as unknown as HTMLElement, 300, 200);

    renderer.render({
      id: 'contour-1',
      range,
      type: 'contour',
      function: 'x+y',
      xDomain: [-1, 1],
      yDomain: [-1, 1],
      levels: [0],
      surface: {
        x: [[-1, 1], [-1, 1]],
        y: [[-1, -1], [1, 1]],
        z: [[-2, 0], [0, 2]],
      },
    } as never);

    const lines = allDescendants(renderer.getElement() as unknown as MockElement)
      .filter((element) => element.tagName === 'line');
    expect(lines.length).toBeGreaterThan(0);
  });
});
