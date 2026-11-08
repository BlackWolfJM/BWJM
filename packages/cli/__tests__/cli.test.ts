import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { exportGithubFallbacks, validateMathMDFile } from '../src/index.js';

const temporaryDirectories: string[] = [];

function createTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'mathmd-cli-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('MathMD CLI public operations', () => {
  it('validates a MathMD file and exposes structured diagnostics', () => {
    const directory = createTemporaryDirectory();
    const input = join(directory, 'invalid.md');
    writeFileSync(input, '```plot2d\nequation: ""\n```\n', 'utf8');

    const result = validateMathMDFile(input);

    expect(result.valid).toBe(false);
    expect(result.diagnostics[0]?.code).toBe('MATHMD_SCHEMA_INVALID');
  });

  it('writes deterministic GitHub assets and a manifest for a real input file', () => {
    const directory = createTemporaryDirectory();
    const input = join(directory, 'example.md');
    const output = join(directory, 'generated');
    writeFileSync(
      input,
      '```plot2d\nequation: x^2\nx: [-2, 2]\n```\n\n```surface3d\nequation: x+y\nx: [-1, 1]\ny: [-1, 1]\nsamples: 3\n```\n',
      'utf8',
    );

    const manifest = exportGithubFallbacks(input, output);

    expect(manifest.assets.map((asset) => asset.path)).toEqual(['mathmd-2d.svg', 'surface-1.stl']);
    expect(readFileSync(join(output, 'mathmd-2d.svg'), 'utf8')).toContain('<polyline');
    expect(readFileSync(join(output, 'surface-1.stl'), 'utf8')).toContain('facet normal');
    expect(JSON.parse(readFileSync(join(output, 'manifest.json'), 'utf8'))).toEqual(manifest);
  });

  it('validates and exports .bwjm and .jm files seamlessly', () => {
    const directory = createTemporaryDirectory();
    const input = join(directory, 'interactivo.bwjm');
    const output = join(directory, 'bwjm-dist');
    writeFileSync(
      input,
      '# Hoja BWJM\n\n```slider\nname: a\nmin: 1\nmax: 3\nstep: 0.5\ndefault: 2\n```\n\n```plot2d\nequation: a*x^2\nx: [-2, 2]\n```\n',
      'utf8',
    );

    const validation = validateMathMDFile(input);
    expect(validation.valid).toBe(true);
    expect(validation.diagnostics).toHaveLength(0);

    const manifest = exportGithubFallbacks(input, output);
    expect(manifest.source).toBe('interactivo.bwjm');
    expect(manifest.assets.map((asset) => asset.path)).toEqual(['mathmd-2d.svg']);
  });
});
