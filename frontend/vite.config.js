import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";

const frontendDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: resolve(frontendDir, "svelte"),
  plugins: [svelte(), tailwindcss()],
  build: {
    outDir: resolve(frontendDir, "dist"),
    emptyOutDir: true
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:5000",
      "/frontend/assets": "http://127.0.0.1:5000"
    }
  }
});
