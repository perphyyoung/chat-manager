import { defineConfig } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  main: {
    build: {
      outDir: "out/main",
      externalizeDeps: true,
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, "electron/main.ts"),
        },
        external: ["electron"],
      },
    },
  },
  preload: {
    build: {
      outDir: "out/preload",
      externalizeDeps: true,
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, "electron/preload.ts"),
        },
        external: ["electron"],
      },
    },
  },
  renderer: {
    root: ".",
    plugins: [vue()],
    build: {
      outDir: "out/renderer",
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, "index.html"),
        },
      },
    },
  },
});
