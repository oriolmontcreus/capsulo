/// <reference types="astro/client" />

declare module 'virtual:component-manifest' {
    import type { ComponentManifest } from './lib/component-scanner';
    const manifest: ComponentManifest;
    export default manifest;
}
