#!/usr/bin/env node
/**
 * Smoke test for MathMD distribution (ESM)
 * Validates manifest targets and verifies runtime ESM imports and CLI help
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const ACTIVE_LIBRARIES = [
  'ast',
  'parser',
  'math',
  'core',
  'renderer-svg',
  'renderer-plotly',
  'github',
  'graph'
];

async function testPackage(pkgName) {
  const pkgDir = path.resolve(REPO_ROOT, 'packages', pkgName);
  const manifestPath = path.resolve(pkgDir, 'package.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`✗ @mathmd/${pkgName} - package.json not found at ${manifestPath}`);
    return false;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // 1. Verify main target
  if (manifest.main) {
    const mainTarget = path.resolve(pkgDir, manifest.main);
    if (!fs.existsSync(mainTarget)) {
      console.error(`✗ @mathmd/${pkgName} - 'main' target missing: ${manifest.main}`);
      return false;
    }
  }

  // 2. Verify types target
  if (manifest.types) {
    const typesTarget = path.resolve(pkgDir, manifest.types);
    if (!fs.existsSync(typesTarget)) {
      console.error(`✗ @mathmd/${pkgName} - 'types' target missing: ${manifest.types}`);
      return false;
    }
  }

  // 3. Verify exports targets
  if (manifest.exports) {
    const checkExportEntry = (entry) => {
      if (typeof entry === 'string') {
        const targetPath = path.resolve(pkgDir, entry);
        if (!fs.existsSync(targetPath)) {
          console.error(`✗ @mathmd/${pkgName} - export target missing: ${entry}`);
          return false;
        }
      } else if (typeof entry === 'object' && entry !== null) {
        for (const [key, val] of Object.entries(entry)) {
          if (!checkExportEntry(val)) return false;
        }
      }
      return true;
    };

    if (!checkExportEntry(manifest.exports)) {
      return false;
    }
  }

  // 4. Test dynamic ESM import
  const entrypoint = path.resolve(pkgDir, manifest.main || 'dist/index.js');
  try {
    const fileUrl = pathToFileURL(entrypoint).href;
    const mod = await import(fileUrl);
    if (!mod || typeof mod !== 'object') {
      console.error(`✗ @mathmd/${pkgName} - import did not yield a module namespace`);
      return false;
    }
    console.log(`✓ @mathmd/${pkgName} - manifest targets verified & ESM import successful`);
    return true;
  } catch (error) {
    console.error(`✗ @mathmd/${pkgName} - ESM import failed: ${error.message}`);
    return false;
  }
}

function testCli() {
  const cliDir = path.resolve(REPO_ROOT, 'packages', 'cli');
  const cliPath = path.resolve(cliDir, 'dist', 'index.js');

  if (!fs.existsSync(cliPath)) {
    console.error(`✗ @mathmd/cli - built binary missing at ${cliPath}`);
    return false;
  }

  const result = spawnSync(process.execPath, [cliPath, '--help'], {
    encoding: 'utf8',
    cwd: REPO_ROOT
  });

  if (result.status !== 0) {
    console.error(`✗ @mathmd/cli - exited with status ${result.status}`);
    if (result.stderr) console.error(result.stderr);
    return false;
  }

  const output = result.stdout || '';
  if (output.includes('MathMD CLI tool') && output.includes('Commands:')) {
    console.log('✓ @mathmd/cli - Help command successful (exit code 0, recognized commands)');
    return true;
  }

  console.error('✗ @mathmd/cli - Help command output did not contain expected content');
  return false;
}

async function main() {
  console.log('Running MathMD distribution smoke test (ESM)...\n');

  let allPassed = true;

  for (const pkgName of ACTIVE_LIBRARIES) {
    const passed = await testPackage(pkgName);
    if (!passed) allPassed = false;
  }

  console.log('');
  const cliPassed = testCli();
  if (!cliPassed) allPassed = false;

  console.log('');
  if (allPassed) {
    console.log('🎉 All distribution tests passed!');
    process.exit(0);
  } else {
    console.error('❌ Some distribution tests failed!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled smoke test error:', err);
  process.exit(1);
});
