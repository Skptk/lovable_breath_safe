import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import inspect from "vite-plugin-inspect";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDebug = mode === "debug";

  return {
    base: "/", // Ensure proper base path for Netlify
    define: {
      __DEBUG_MODE__: JSON.stringify(isDebug),
      __TRACK_VARIABLES__: JSON.stringify(isDebug || mode === "development"),
    },
    server: {
      host: "::",
      port: 8080,
    },
    preview: {
      host: "0.0.0.0",
      port: 4174, // Changed from 4173 to avoid conflicts
      strictPort: false, // Allow fallback to other ports if 4174 is busy
      // Better CI support
      open: false,
      // Ensure proper headers for CI
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
      // Enhanced CI support
      cors: true,
      // Verbose logging for CI
      logLevel: "info",
      // Better ready detection
      hmr: false, // Disable HMR in preview for CI
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      mode === "development" && inspect(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      target: "esnext",
      cssCodeSplit: true,
      minify: isDebug ? false : "esbuild",
      brotliSize: false,
      sourcemap: isDebug ? true : false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        // Disable tree shaking at Rollup level to prevent initialization issues
        treeshake: false,
        output: {
          // Preserve original variable names and structure
          compact: false,
          minifyInternalExports: false,
          manualChunks: isDebug
            ? undefined
            : {
                react: ["react", "react-dom"],
                router: ["react-router-dom"],
                vendor: [
                  "framer-motion",
                  "@supabase/supabase-js",
                  "date-fns",
                  "@tanstack/react-query",
                  "leaflet",
                  "react-leaflet",
                  "recharts",
                  ...[
                    "@radix-ui/react-accordion",
                    "@radix-ui/react-alert-dialog",
                    "@radix-ui/react-aspect-ratio",
                    "@radix-ui/react-avatar",
                    "@radix-ui/react-checkbox",
                    "@radix-ui/react-collapsible",
                    "@radix-ui/react-context-menu",
                    "@radix-ui/react-dialog",
                    "@radix-ui/react-dropdown-menu",
                    "@radix-ui/react-hover-card",
                    "@radix-ui/react-label",
                    "@radix-ui/react-menubar",
                    "@radix-ui/react-navigation-menu",
                    "@radix-ui/react-popover",
                    "@radix-ui/react-progress",
                    "@radix-ui/react-radio-group",
                    "@radix-ui/react-scroll-area",
                    "@radix-ui/react-select",
                    "@radix-ui/react-separator",
                    "@radix-ui/react-slider",
                    "@radix-ui/react-switch",
                    "@radix-ui/react-tabs",
                    "@radix-ui/react-toast",
                    "@radix-ui/react-toggle",
                    "@radix-ui/react-toggle-group",
                    "@radix-ui/react-tooltip",
                  ],
                ],
              },
          chunkFileNames: "js/[name]-[hash].js",
          entryFileNames: "js/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
      ...(isDebug
        ? {
            sourcemap: true,
            minify: false,
            rollupOptions: {
              treeshake: false,
              output: {
                ...{
                  sourcemap: true,
                  preserveModules: false,
                  manualChunks: undefined,
                  inlineDynamicImports: false,
                },
              },
            },
          }
        : {}),
      esbuild: {
        keepNames: true,
        minifyIdentifiers: false,
        minifySyntax: false,
        minifyWhitespace: isDebug ? false : true,
        legalComments: "none",
        target: "esnext",
        treeShaking: false,
        define: {
          "process.env.NODE_ENV": '"production"',
          "__DEBUG_BUILD__": JSON.stringify(isDebug),
        },
        format: "esm",
        platform: "browser",
        drop: [],
        pure: [],
      },
    },
  };
});
