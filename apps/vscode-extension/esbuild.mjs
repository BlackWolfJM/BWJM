import { build } from "esbuild";

await Promise.all([
  build({
    entryPoints: ["src/extension.ts"],
    outfile: "dist/extension.cjs",
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node18",
    external: ["vscode"],
    sourcemap: true,
    logLevel: "info",
  }),
  build({
    entryPoints: ["src/webview.ts"],
    outfile: "dist/webview.js",
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    sourcemap: true,
    logLevel: "info",
  }),
]);
