import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves a project at /BWJM/, not the domain root.
  // Keep the local development server rooted at /.
  base: process.env.BWJM_BASE_PATH || '/',
  server: {
    port: 3000
  },
  resolve: {
    alias: {
      '@mathmd/ast': path.resolve(__dirname, '../../packages/ast/src/index.ts'),
      '@mathmd/parser': path.resolve(__dirname, '../../packages/parser/src/index.ts'),
      '@mathmd/math': path.resolve(__dirname, '../../packages/math/src/index.ts'),
      '@mathmd/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@mathmd/renderer-plotly': path.resolve(__dirname, '../../packages/renderer-plotly/src/index.ts'),
      '@mathmd/renderer-svg': path.resolve(__dirname, '../../packages/renderer-svg/src/index.ts')
    }
  }
});
