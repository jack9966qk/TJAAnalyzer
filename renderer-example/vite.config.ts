import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/playground/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        basic: path.resolve(__dirname, "basic.html"),
      },
    },
  },
});
