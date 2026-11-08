import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { MathMDDiagnostic } from '@mathmd/ast';
import {
  createGithubFallbackBundle,
  type MathMDFallbackManifest,
} from '@mathmd/github';
import { parseMathMD } from '@mathmd/parser';

export interface MathMDValidationResult {
  valid: boolean;
  diagnostics: MathMDDiagnostic[];
}

function readSourceFile(inputPath: string): string {
  if (!existsSync(inputPath)) {
    throw new Error(`Input file does not exist: ${inputPath}`);
  }
  return readFileSync(inputPath, 'utf8');
}

export function validateMathMDFile(inputPath: string): MathMDValidationResult {
  const document = parseMathMD(readSourceFile(inputPath));
  return {
    valid: !document.diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    diagnostics: document.diagnostics,
  };
}

export function exportGithubFallbacks(
  inputPath: string,
  outputDirectory: string,
): MathMDFallbackManifest {
  const bundle = createGithubFallbackBundle(readSourceFile(inputPath), basename(inputPath));
  mkdirSync(outputDirectory, { recursive: true });
  for (const asset of bundle.assets) {
    writeFileSync(join(outputDirectory, asset.path), asset.content, 'utf8');
  }
  writeFileSync(
    join(outputDirectory, 'manifest.json'),
    `${JSON.stringify(bundle.manifest, null, 2)}\n`,
    'utf8',
  );
  return bundle.manifest;
}
