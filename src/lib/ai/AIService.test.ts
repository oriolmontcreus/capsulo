import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from './AIService';

// Mocking global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mocking prompts
vi.mock('./prompts', () => ({
    generateCMSSystemPrompt: vi.fn().mockReturnValue('System prompt')
}));

// Mock @ai-sdk/groq
const mockGroqModel = vi.fn();
vi.mock('@ai-sdk/groq', () => ({
    createGroq: vi.fn().mockReturnValue(() => mockGroqModel)
}));

// Mock streamText from ai
const mockStreamText = vi.fn();
vi.mock('ai', async (importOriginal) => {
    const actual = await importOriginal<typeof import('ai')>();
    return {
        ...actual,
        streamText: (options: any) => mockStreamText(options)
    };
});

describe('AIService', () => {
    let aiService: AIService;

    beforeEach(() => {
        aiService = new AIService();
        vi.clearAllMocks();
        vi.stubEnv('PUBLIC_AI_WORKER_URL', 'https://ai-worker.test');
    });

    it('should correctly process AI SDK data stream from Cloudflare (text and tools)', async () => {
        const streamData = [
            '0:"Hello"\n',
            '0:" world!"\n',
            '9:{"toolCallId":"1","toolName":"setChatTitle","args":{"title":"New Title"}}\n',
            'b:{"toolCallId":"2","toolName":"updateContent","args":{"componentId":"hero","data":{"title":"Updated"}}}\n'
        ];

        const mockReadableStream = new ReadableStream({
            start(controller) {
                streamData.forEach(chunk => controller.enqueue(new TextEncoder().encode(chunk)));
                controller.close();
            }
        });

        mockFetch.mockResolvedValueOnce({
            ok: true,
            body: mockReadableStream,
            text: () => Promise.resolve('')
        });

        const onToken = vi.fn();
        const onAction = vi.fn();
        const onTitle = vi.fn();
        const onComplete = vi.fn();
        const onError = vi.fn();

        await aiService.generateStream(
            {
                message: 'Hi',
                context: {},
                history: [],
                attachments: [{ type: 'image', data: 'base64', mimeType: 'image/jpeg' }]
            },
            { onToken, onAction, onTitle, onComplete, onError }
        );

        expect(onToken).toHaveBeenCalledTimes(2);
        expect(onToken).toHaveBeenNthCalledWith(1, 'Hello');
        expect(onToken).toHaveBeenNthCalledWith(2, ' world!');

        expect(onTitle).toHaveBeenCalledWith('New Title');
        expect(onAction).toHaveBeenCalledWith({ componentId: 'hero', data: { title: 'Updated' } });

        expect(onComplete).toHaveBeenCalledWith('Hello world!');
        expect(onError).not.toHaveBeenCalled();
    });

    it('should correctly process Groq stream using AI SDK', async () => {
        // Mock localStorage for Groq key
        vi.stubGlobal('window', {
            localStorage: {
                getItem: vi.fn().mockReturnValue('test-groq-key')
            }
        });

        const mockFullStream = (async function* () {
            yield { type: 'text-delta', textDelta: 'Hello' };
            yield { type: 'text-delta', textDelta: ' world!' };
            yield { type: 'tool-call', toolName: 'setChatTitle', args: { title: 'Groq Title' } };
        })();

        mockStreamText.mockReturnValueOnce({
            fullStream: mockFullStream
        });

        const onToken = vi.fn();
        const onAction = vi.fn();
        const onTitle = vi.fn();
        const onComplete = vi.fn();
        const onError = vi.fn();

        await aiService.generateStream(
            {
                message: 'Hi',
                context: {},
                history: []
            },
            { onToken, onAction, onTitle, onComplete, onError }
        );

        expect(onToken).toHaveBeenCalledTimes(2);
        expect(onTitle).toHaveBeenCalledWith('Groq Title');
        expect(onComplete).toHaveBeenCalledWith('Hello world!');
    });
});
