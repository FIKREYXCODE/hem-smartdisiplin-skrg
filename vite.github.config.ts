import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: path.join(root, "github-pages"),
  base: "/hem-smartdisiplin-skrg/",
  publicDir: path.join(root, "public"),
  resolve: { alias: { "@": root } },
  plugins: [react()],
  build: { outDir: path.join(root, "pages-dist"), emptyOutDir: true },
});
