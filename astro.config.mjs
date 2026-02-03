// @ts-check

import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import capsuloConfig from './capsulo.config.ts';
import { componentScannerPlugin } from './src/lib/vite-plugin-component-scanner.ts';
import { schemaTypesPlugin } from './src/lib/vite-plugin-schema-types.ts';
import { cmsPreviewPlugin } from './src/lib/vite-plugin-cms-preview.ts';
import { autoI18nRoutes } from './src/lib/astro-i18n-auto-routes.ts';

// https://astro.build/config
export default defineConfig({
  // Static output: All pages are pre-rendered at build time
  // API endpoints marked with prerender=false will work in dev mode only
  output: 'static',
  i18n: {
    defaultLocale: capsuloConfig.i18n?.defaultLocale || 'en',
    locales: capsuloConfig.i18n?.locales || ['en'],
    routing: {
      prefixDefaultLocale: false,  // Default locale has no prefix (e.g., / for default locale)
      redirectToDefaultLocale: false  // Root (/) is not redirected to default locale
    }
  },
  vite: {
    plugins: [
      tailwindcss(),
      componentScannerPlugin(),
      schemaTypesPlugin(),  // Auto-regenerate .schema.d.ts files during dev
      cmsPreviewPlugin(),   // Live preview without disk writes
    ],

    // Persistent cache for faster incremental builds
    cacheDir: 'node_modules/.vite',

    build: {
      minify: 'esbuild',
      target: 'esnext',
      chunkSizeWarningLimit: 800,

      rollupOptions: {
        output: {
          // Use function form to avoid package entry resolution issues
          manualChunks(id) {
            // Core React ecosystem
            if (id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router') ||
              /node_modules\/react(\/|$)/.test(id)) {
              return 'vendor-react';
            }

            // State management
            if (id.includes('node_modules/zustand') ||
              id.includes('node_modules/@tanstack/react-query')) {
              return 'vendor-state';
            }

            // Lexical editor (largest dependency)
            if (id.includes('node_modules/lexical') ||
              id.includes('node_modules/@lexical')) {
              return 'vendor-lexical';
            }

            // CodeMirror
            if (id.includes('node_modules/@codemirror') ||
              id.includes('node_modules/@uiw/codemirror')) {
              return 'vendor-codemirror';
            }

            // UI components (Radix)
            if (id.includes('node_modules/@radix-ui')) {
              return 'vendor-ui';
            }

            // Utilities
            if (id.includes('node_modules/lodash') ||
              id.includes('node_modules/date-fns') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/zod') ||
              id.includes('node_modules/diff')) {
              return 'vendor-utils';
            }
          },
        },
      },
    },

    // Pre-bundle heavy dependencies for faster dev & build
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'lexical',
        '@lexical/rich-text',
        '@lexical/utils',
        '@lexical/selection',
        '@lexical/list',
        '@lexical/markdown',
        'react-router-dom',
        '@tanstack/react-query',
        'zustand',
        'lodash',
        'date-fns',
      ],
    },

    server: {
      watch: {
        // Ignore the content/pages directory to prevent HMR when JSON files change
        ignored: ['**/src/content/pages/**', '**/src/content/globals.json']
      }
    }
  },
  integrations: [react(), autoI18nRoutes()],
});