import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: process.env.BASE_PATH || "/",
  appType: "spa",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  plugins: [
    {
      name: "copy-404",
      closeBundle() {
        const index = resolve("dist/index.html");
        if (existsSync(index)) {
          copyFileSync(index, resolve("dist/404.html"));
        }
      },
    },
  ],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
