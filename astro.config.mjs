// @ts-check

import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import capsuloConfig from './capsulo.config.ts';

// https://astro.build/config
export default defineConfig({
  // Static output: All pages are pre-rendered at build time
  // API endpoints marked with prerender=false will work in dev mode only
  output: 'static',
  i18n: {
    defaultLocale: capsuloConfig.i18n?.defaultLocale || 'en',
    locales: capsuloConfig.i18n?.locales || ['en'],
    routing: {
      prefixDefaultLocale: false
    }
  },
  vite: {
    plugins: [
      tailwindcss()
    ],
    ssr: {
      noExternal: ['katex', 'platejs', '@platejs/*', 'react-tweet']
    },
    server: {
      watch: {
        // Ignore the content/pages directory to prevent HMR when JSON files change
        ignored: ['**/src/content/pages/**']
      }
    }
  },
  integrations: [react()],
});