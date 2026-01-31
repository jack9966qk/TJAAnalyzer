import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { viteStaticCopy } from "vite-plugin-static-copy";

const generateMetaFiles = () => {
  return {
    name: "generate-meta-files",
    buildStart() {
      try {
        const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
        this.emitFile({
          type: "asset",
          fileName: "version.json",
          source: JSON.stringify({ version: packageJson.version }, null, 2),
        });
      } catch (_e) {}

      try {
        const logOutput = execSync('git log -n 100 --pretty=format:"%h|%s|%ad" --date=short').toString();
        const changelog = logOutput
          .split("\n")
          .filter((l) => l)
          .map((l) => {
            const [h, m, d] = l.split("|");
            return { hash: h, message: m, date: d };
          });
        this.emitFile({
          type: "asset",
          fileName: "changelog.json",
          source: JSON.stringify(changelog, null, 2),
        });
      } catch (_e) {
        this.emitFile({ type: "asset", fileName: "changelog.json", source: "[]" });
      }
      this.emitFile({ type: "asset", fileName: ".nojekyll", source: "" });
    },
  };
};

export default defineConfig({
  root: "public",
  base: "",
  publicDir: false,
  resolve: {
    alias: {
      "webjsx/jsx-runtime": path.resolve(process.cwd(), "node_modules/webjsx/dist/jsx-runtime.js"),
      "webjsx/jsx-dev-runtime": path.resolve(process.cwd(), "node_modules/webjsx/dist/jsx-dev-runtime.js"),
      webjsx: path.resolve(process.cwd(), "node_modules/webjsx/dist/index.js"),
      "/src": path.resolve(process.cwd(), "src"),
    },
  },
  server: {
    port: 8080,
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(process.cwd(), "public/index.html"),
        chartOnly: path.resolve(process.cwd(), "public/chart-only.html"),
        componentTest: path.resolve(process.cwd(), "public/component-test.html"),
        noteStatsTest: path.resolve(process.cwd(), "public/note-stats-test.html"),
      },
    },
    target: "esnext",
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "webjsx",
  },
  plugins: [
    generateMetaFiles(),
    viteStaticCopy({
      targets: [
        { src: "ese", dest: "." },
        { src: "ese_index.json", dest: "." },
        { src: "CNAME", dest: "." },
        { src: "icon_simple.png", dest: "." },
        { src: "../icon.png", dest: "." },
        { src: "../node_modules/@neutralinojs/lib/dist/neutralino.js", dest: "." },
        { src: "../assets/heroicons/optimized/24/outline/*.svg", dest: "assets/heroicons/optimized/24/outline" },
      ],
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon_simple.png", "assets/heroicons/optimized/24/outline/*.svg"],
      manifestFilename: "manifest.json",
      manifest: {
        name: "TJA Analyzer",
        short_name: "TJA Analyzer",
        start_url: ".",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
          {
            src: "./icon_simple.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "./icon_simple.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/ese\.tjadataba\.se\/ese\/ese/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ese-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
    }),
  ],
});
