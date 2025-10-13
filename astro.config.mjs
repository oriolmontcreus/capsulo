// @ts-check

import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // Static output: All pages are pre-rendered at build time
  // API endpoints marked with prerender=false will work in dev mode only
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react()],
});