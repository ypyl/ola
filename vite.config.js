import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5678,
    strictPort: true,
  },
  build: {
    outDir: "./build",
  },
});
