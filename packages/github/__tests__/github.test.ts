import { describe, expect, it } from 'vitest';
import { createGithubFallbackBundle, mathmdToSVG } from '../src/index.js';

describe('GitHub fallbacks', () => {
  it('renders deterministic SVG in Node without DOM globals', () => {
    const markdown = '```point2d\nx: 1\ny: 2\nlabel: "</text><script>alert(1)</script>"\n```\n';

    const first = mathmdToSVG(markdown);
    const second = mathmdToSVG(markdown);

    expect(first).toBe(second);
    expect(first).toContain('<circle');
    expect(first).toContain('&lt;/text&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(first).not.toContain('<script>');
  });

  it('creates one deterministic STL asset per surface and a content-free manifest', () => {
    const markdown = '```surface3d\nequation: x+y\nx: [-1, 1]\ny: [-1, 1]\nsamples: 3\n```\n\n```surface3d\nequation: x-y\nx: [-1, 1]\ny: [-1, 1]\nsamples: 3\n```\n';

    const bundle = createGithubFallbackBundle(markdown, 'surfaces.md');

    expect(bundle.assets).toHaveLength(2);
    expect(bundle.assets.map((asset) => asset.path)).toEqual(['surface-1.stl', 'surface-2.stl']);
    expect(bundle.assets[0].content).toContain('facet normal');
    expect(bundle.manifest.source).toBe('surfaces.md');
    expect(bundle.manifest.assets[0]).not.toHaveProperty('content');
  });
});
