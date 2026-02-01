import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from './AIService';

// Mocking global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mocking prompts
vi.mock('./prompts', () => ({
    generateCMSSystemPrompt: vi.fn().mockReturnValue('System prompt')
}));

describe('AIService', () => {
    let aiService: AIService;

    beforeEach(() => {
        aiService = new AIService();
        vi.clearAllMocks();

        // Mock import.meta.env
        vi.stubEnv('PUBLIC_AI_WORKER_URL', 'https://ai-worker.test');
    });

    it('should correctly process raw text stream from Cloudflare', async () => {
        const mockReadableStream = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode('Hello'));
                controller.enqueue(new TextEncoder().encode(' world!'));
                controller.close();
            }
        });

        mockFetch.mockResolvedValueOnce({
            ok: true,
            body: mockReadableStream,
            text: () => Promise.resolve('')
        });

        const onToken = vi.fn();
        const onComplete = vi.fn();
        const onError = vi.fn();

        await aiService.generateStream(
            {
                message: 'Hi',
                context: {},
                history: [],
                attachments: [{ type: 'image', data: 'base64', mimeType: 'image/jpeg' }] // Trigger Cloudflare
            },
            { onToken, onComplete, onError }
        );

        expect(onToken).toHaveBeenCalledTimes(2);
        expect(onToken).toHaveBeenNthCalledWith(1, 'Hello');
        expect(onToken).toHaveBeenNthCalledWith(2, ' world!');
        expect(onComplete).toHaveBeenCalledWith('Hello world!');
        expect(onError).not.toHaveBeenCalled();
    });

    it('should handle fetch errors in Cloudflare stream', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            text: () => Promise.resolve('Service Unavailable')
        });

        const onToken = vi.fn();
        const onComplete = vi.fn();
        const onError = vi.fn();

        await aiService.generateStream(
            {
                message: 'Hi',
                context: {},
                history: [],
                attachments: [{ type: 'image', data: 'base64', mimeType: 'image/jpeg' }]
            },
            { onToken, onComplete, onError }
        );

        expect(onError).toHaveBeenCalledWith(expect.any(Error));
        expect(onError.mock.calls[0][0].message).toContain('Cloudflare Worker Error: Service Unavailable');
    });

    it('should correctly process SSE stream from Groq', async () => {
        // Mock localStorage for Groq key
        const mockStorage: Record<string, string> = {
            'capsulo-ai-groq-key': 'test-groq-key'
        };
        vi.stubGlobal('window', {
            localStorage: {
                getItem: (key: string) => mockStorage[key]
            }
        });

        const sseData = [
            'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
            'data: {"choices":[{"delta":{"content":" world!"}}]}\n',
            'data: [DONE]\n'
        ];

        const mockReadableStream = new ReadableStream({
            start(controller) {
                sseData.forEach(chunk => controller.enqueue(new TextEncoder().encode(chunk)));
                controller.close();
            }
        });

        mockFetch.mockResolvedValueOnce({
            ok: true,
            body: mockReadableStream
        });

        const onToken = vi.fn();
        const onComplete = vi.fn();
        const onError = vi.fn();

        await aiService.generateStream(
            {
                message: 'Hi',
                context: {},
                history: []
                // No attachments -> Groq
            },
            { onToken, onComplete, onError }
        );

        expect(onToken).toHaveBeenCalledTimes(2);
        expect(onToken).toHaveBeenNthCalledWith(1, 'Hello');
        expect(onToken).toHaveBeenNthCalledWith(2, ' world!');
        expect(onComplete).toHaveBeenCalledWith('Hello world!');
        expect(onError).not.toHaveBeenCalled();
    });
});
