import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };
const define = { __PKG_VERSION__: JSON.stringify(pkg.version) };

export default defineConfig([
  {
    entry: { index: "src/index.ts", server: "src/server.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: false,
    clean: false,
    target: "es2019",
    define,
  },
  {
    entry: { next: "src/next.ts", react: "src/react.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: false,
    clean: false,
    target: "es2019",
    external: ["react", "next", "next/navigation"],
    banner: { js: '"use client";' },
    define,
  },
  {
    entry: { script: "src/script/entry.ts" },
    format: ["iife"],
    outExtension: () => ({ js: ".js" }),
    minify: true,
    dts: false,
    sourcemap: false,
    clean: false,
    target: "es2017",
    define,
  },
]);
