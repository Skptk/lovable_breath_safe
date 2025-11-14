import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import inspect from "vite-plugin-inspect";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDebug = mode === "debug";
  const enableSourceMaps = isDebug || process.env.GENERATE_SOURCEMAPS === "true";
  const isDev = mode === "development";

  return {
    base: "/", // Ensure proper base path for Netlify
    define: {
      __DEBUG_MODE__: JSON.stringify(isDebug),
      __TRACK_VARIABLES__: JSON.stringify(isDebug || isDev),
      // Ensure React is in production mode when building for production
      'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
    },
    // Ensure React is only included once in the bundle
    resolve: {
      alias: {
        // Ensure React is resolved to a single copy
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
        // Add any other aliases here
        '@': path.resolve(__dirname, './src'),
      },
      // Ensure .jsx and .tsx extensions are resolved
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    },
    // Optimize dependencies to prevent duplicates
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-router-dom',
        '@tanstack/react-query',
      ],
      esbuildOptions: {
        // Ensure React is only included once
        loader: {
          '.js': 'jsx',
        },
        // Ensure React is in production mode when building for production
        define: {
          'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
        },
      },
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
      sourcemap: enableSourceMaps,
      chunkSizeWarningLimit: 1000,
      reportCompressedSize: true,
      rollupOptions: {
        // Enable tree shaking for production
        treeshake: !isDebug,
        output: {
          // Optimize chunk splitting
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // Split node_modules into vendor chunks
              if (id.includes('react-dom') || id.includes('@emotion')) {
                return 'vendor-react';
              }
              if (id.includes('@tanstack')) {
                return 'vendor-tanstack';
              }
              return 'vendor';
            }
            // Group pages into route-based chunks
            if (id.includes('src/pages/')) {
              const page = id.split('pages/')[1].split('/')[0];
              return `page-${page}`;
            }
          },
          chunkFileNames: 'js/[name]-[hash:8].js',
          entryFileNames: 'js/[name]-[hash:8].js',
          assetFileNames: 'assets/[name]-[hash:8][extname]',
          // Ensure consistent chunk naming in production
          ...(isDebug ? {} : {
            compact: true,
            minifyInternalExports: true,
          }),
        },
      },
      // Enable sourcemaps in development and debug modes
      sourcemap: enableSourceMaps,
      // Disable minification in debug mode
      minify: isDebug ? false : 'esbuild',
      // Enable brotli compression in production
      brotliSize: !isDebug,
      // Disable sourcemap in production
      ...(isDebug ? {} : {
        sourcemap: false,
      }),
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
