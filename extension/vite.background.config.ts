import { defineConfig } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(rootDir, "src/background/index.ts"),
      output: {
        format: "es",
        entryFileNames: "background.js",
        inlineDynamicImports: true
      }
    }
  }
});
