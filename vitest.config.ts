import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/*/__tests__/**/*.test.ts',
      'apps/*/__tests__/**/*.test.ts'
    ]
  },
  resolve: {
    alias: {
      '@mathmd/ast': path.resolve(__dirname, './packages/ast/src/index.ts'),
      '@mathmd/parser': path.resolve(__dirname, './packages/parser/src/index.ts'),
      '@mathmd/math': path.resolve(__dirname, './packages/math/src/index.ts'),
      '@mathmd/core': path.resolve(__dirname, './packages/core/src/index.ts'),
      '@mathmd/renderer-svg': path.resolve(__dirname, './packages/renderer-svg/src/index.ts'),
      '@mathmd/renderer-plotly': path.resolve(__dirname, './packages/renderer-plotly/src/index.ts'),
      '@mathmd/github': path.resolve(__dirname, './packages/github/src/index.ts'),
      '@mathmd/cli': path.resolve(__dirname, './packages/cli/src/index.ts'),
      '@mathmd/graph': path.resolve(__dirname, './packages/graph/src/index.ts')
    }
  }
});
