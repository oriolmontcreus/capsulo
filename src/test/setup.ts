import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock canvas and image APIs for testing
global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    drawImage: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
}));

global.HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
    const blob = new Blob(['test'], { type: 'image/webp' });
    callback(blob);
});

global.HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/webp;base64,test');

// Mock document.createElement for canvas
const originalCreateElement = document.createElement;
document.createElement = vi.fn((tagName: string) => {
    if (tagName === 'canvas') {
        return {
            width: 100,
            height: 100,
            getContext: vi.fn(() => ({
                drawImage: vi.fn(),
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            })),
            toBlob: vi.fn((callback) => {
                const blob = new Blob(['test'], { type: 'image/webp' });
                callback(blob);
            }),
        } as any;
    }
    return originalCreateElement.call(document, tagName);
});

// Mock Image constructor
global.Image = class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    src = '';
    naturalWidth = 100;
    naturalHeight = 100;
    width = 100;
    height = 100;

    constructor() {
        setTimeout(() => {
            if (this.onload) {
                this.onload();
            }
        }, 0);
    }
} as any;

// Mock File constructor for tests - create a proper mock that extends Blob
global.File = class MockFile extends Blob {
    name: string;
    lastModified: number;

    constructor(chunks: BlobPart[], filename: string, options?: FilePropertyBag) {
        super(chunks, options);
        this.name = filename;
        this.lastModified = options?.lastModified || Date.now();

        // Override size property to match what we set in tests
        if (options && 'size' in options) {
            Object.defineProperty(this, 'size', {
                value: (options as any).size,
                writable: false
            });
        }
    }
} as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = vi.fn();