#!/usr/bin/env node
import { program } from 'commander';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { exportGithubFallbacks, validateMathMDFile } from './operations.js';

export { exportGithubFallbacks, validateMathMDFile } from './operations.js';

program
  .name('mathmd')
  .description('MathMD CLI tool')
  .version('0.1.0');

program
  .command('dev')
  .description('Start the MathMD playground development server')
  .action(() => {
    const result = spawnSync('pnpm', ['--filter', '@mathmd/playground', 'run', 'dev'], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    if (result.status !== 0) process.exitCode = result.status ?? 1;
  });

program
  .command('validate')
  .description('Validate a MathMD document (.bwjm, .jm, or .md)')
  .argument('<input>', 'MathMD file (.bwjm, .jm, or .md) to validate')
  .action((input: string) => {
    const result = validateMathMDFile(input);
    if (result.diagnostics.length === 0) {
      console.log('MathMD document is valid.');
    } else {
      for (const diagnostic of result.diagnostics) {
        console.log(`${diagnostic.severity.toUpperCase()} ${diagnostic.code}: ${diagnostic.message}`);
      }
    }
    if (!result.valid) process.exitCode = 1;
  });

program
  .command('build')
  .description('Build static fallbacks for a MathMD document (.bwjm, .jm, or .md)')
  .argument('<input>', 'MathMD file (.bwjm, .jm, or .md) to build')
  .option('-o, --output <dir>', 'Output directory', './mathmd-dist')
  .action((input: string, options: { output: string }) => {
    const manifest = exportGithubFallbacks(input, options.output);
    console.log(`Generated ${manifest.assets.length} asset(s) in ${options.output}.`);
  });

program
  .command('github')
  .description('Generate GitHub fallbacks (SVG, STL, manifest.json)')
  .argument('<input>', 'MathMD file (.bwjm, .jm, or .md) to export')
  .option('-o, --output <dir>', 'Output directory', './github-output')
  .action((input: string, options: { output: string }) => {
    const manifest = exportGithubFallbacks(input, options.output);
    console.log(`Generated ${manifest.assets.length} GitHub fallback asset(s) in ${options.output}.`);
  });

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  program.parseAsync(process.argv).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
