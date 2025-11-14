import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { componentTagger } from "lovable-tagger";
import inspect from "vite-plugin-inspect";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDebug = mode === "debug";
  const isDev = mode === "development";
  const isProduction = mode === "production" || process.env.NODE_ENV === "production";
  const enableSourceMaps = isDebug || process.env.GENERATE_SOURCEMAPS === "true";

  // Ensure React is only loaded once
  const reactPath = require.resolve("react");
  const reactDomPath = require.resolve("react-dom");
  const reactDomClientPath = require.resolve("react-dom/client");
  const reactJsxRuntimePath = require.resolve("react/jsx-runtime");
  const reactJsxDevRuntimePath = require.resolve("react/jsx-dev-runtime");

  const minifySetting = isDebug ? false : "esbuild";
  const sourcemapSetting = enableSourceMaps;

  return {
    base: "/",
    define: {
      "process.env.NODE_ENV": JSON.stringify(isDev ? "development" : "production"),
      __DEBUG_MODE__: JSON.stringify(isDebug),
    },
    resolve: {
      alias: [
        { find: "react", replacement: reactPath },
        { find: "react-dom", replacement: reactDomPath },
        { find: "react-dom/client", replacement: reactDomClientPath },
        { find: "react/jsx-runtime", replacement: reactJsxRuntimePath },
        { find: "react/jsx-dev-runtime", replacement: reactJsxDevRuntimePath },
        { find: "@", replacement: path.resolve(__dirname, "./src") },
      ],
      extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
      preserveSymlinks: false,
    },
    esbuild: {
      drop: isProduction ? ["console", "debugger"] : [],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react-router-dom",
        "@tanstack/react-query",
      ],
      esbuildOptions: {
        loader: { ".js": "jsx" },
        jsx: "automatic",
        jsxImportSource: "react",
        define: {
          "process.env.NODE_ENV": JSON.stringify(isDev ? "development" : "production"),
        },
      },
    },
    server: {
      host: "::",
      port: 8080,
    },
    preview: {
      host: "0.0.0.0",
      port: 4174,
      strictPort: false,
      open: false,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
      cors: true,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      mode === "development" && inspect(),
    ].filter(Boolean),
    build: {
      target: "esnext",
      cssCodeSplit: true,
      minify: minifySetting,
      sourcemap: sourcemapSetting,
      chunkSizeWarningLimit: 1000,
      reportCompressedSize: true,
      rollupOptions: {
        treeshake: !isDebug,
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              if (
                id.includes("react/") ||
                id.includes("react-dom/") ||
                id === "react" ||
                id === "react-dom"
              ) {
                return "vendor-react";
              }
              if (id.includes("@emotion")) {
                return "vendor-react";
              }
              if (id.includes("@tanstack")) {
                return "vendor-tanstack";
              }
              return "vendor";
            }
            if (id.includes("src/pages/")) {
              const page = id.split("pages/")[1].split("/")[0];
              return `page-${page}`;
            }
          },
          chunkFileNames: "js/[name]-[hash:8].js",
          entryFileNames: "js/[name]-[hash:8].js",
          assetFileNames: "assets/[name]-[hash:8][extname]",
          ...(isDebug ? {} : { compact: true, minifyInternalExports: true }),
        },
      },
    },
  };
});