import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        contentScript: resolve(rootDir, "src/content/index.tsx"),
        background: resolve(rootDir, "src/background/index.ts"),
        pageBridge: resolve(rootDir, "src/content/pageBridge.ts")
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "contentScript") {
            return "contentScript.js";
          }
          if (chunkInfo.name === "background") {
            return "background.js";
          }
          if (chunkInfo.name === "pageBridge") {
            return "pageBridge.js";
          }
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
