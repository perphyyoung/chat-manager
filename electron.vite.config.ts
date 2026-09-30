import { defineConfig } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
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
          searchWorker: path.resolve(__dirname, "electron/searchWorker.ts"),
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
        output: {
          format: "cjs",
        },
      },
    },
  },
  renderer: {
    root: ".",
    // Tailwind 只服务 FontSelect 一个组件（按需，preflight 未引入），不影响主/preload
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      outDir: "out/renderer",
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, "index.html"),
        },
      },
    },
    server: {
      open: false,
    },
  },
});
