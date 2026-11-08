#!/usr/bin/env node
/**
 * Smoke test for MathMD distribution
 * Verifies that all active packages can be imported from their dist artifacts
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// List of active packages that should be distributable
const ACTIVE_PACKAGES = [
  '@mathmd/ast',
  '@mathmd/parser', 
  '@mathmd/math',
  '@mathmd/core',
  '@mathmd/renderer-svg',
  '@mathmd/renderer-plotly',
  '@mathmd/github',
  '@mathmd/graph'
];

function testPackageImport(packageName) {
  try {
    // Try to import the package from dist
    require(`${packageName}/dist/index.js`);
    console.log(`✓ ${packageName} - Import successful`);
    return true;
  } catch (error) {
    console.error(`✗ ${packageName} - Import failed: ${error.message}`);
    return false;
  }
}

function testCliHelp() {
  try {
    // Try to run the CLI help command
    const cliPath = path.resolve(__dirname, '../packages/cli/dist/index.js');
    const output = execSync(`node "${cliPath}" --help`, { encoding: 'utf8' });
    if (output.includes('MathMD CLI tool') && output.includes('Commands:')) {
      console.log('✓ @mathmd/cli - Help command successful');
      return true;
    } else {
      console.error('✗ @mathmd/cli - Help command output unexpected');
      return false;
    }
  } catch (error) {
    console.error(`✗ @mathmd/cli - Help command failed: ${error.message}`);
    return false;
  }
}

function main() {
  console.log('Running MathMD distribution smoke test...\n');
  
  let allPassed = true;
  
  // Test each active package
  for (const packageName of ACTIVE_PACKAGES) {
    if (!testPackageImport(packageName)) {
      allPassed = false;
    }
  }
  
  console.log(''); // Empty line
  
  // Test CLI
  if (!testCliHelp()) {
    allPassed = false;
  }
  
  console.log('');
  if (allPassed) {
    console.log('🎉 All distribution tests passed!');
    process.exit(0);
  } else {
    console.error('❌ Some distribution tests failed!');
    process.exit(1);
  }
}

main();