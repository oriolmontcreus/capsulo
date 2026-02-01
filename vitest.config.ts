import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
    },
    resolve: {
        alias: {
            '@/capsulo.config': resolve(__dirname, './capsulo.config.ts'),
            '@': resolve(__dirname, './src'),
        },
    },
});