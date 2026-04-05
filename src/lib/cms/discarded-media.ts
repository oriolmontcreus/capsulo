import type { GlobalData, PageData } from '@/lib/form-builder';
import { isR2Url } from '@/lib/storage';
import { extractMediaStorageKeyFromUrl } from '@/lib/storage/mediaStorageKey';

export const DISCARDED_MEDIA_REPO_PATH = 'src/content/discarded-media.json';

export const DISCARDED_MEDIA_VERSION = 1 as const;

export interface DiscardedMediaFile {
    version: typeof DISCARDED_MEDIA_VERSION;
    entries: DiscardedMediaEntry[];
}

export interface DiscardedMediaEntry {
    id: string;
    url: string;
    storageKey: string;
    fileName: string;
    mimeType: string | null;
    sizeBytes: number | null;
    removedAt: string;
    source: {
        kind: 'page' | 'globals';
        pageName?: string;
        componentId?: string;
        fieldName?: string;
        origin: 'fileUpload' | 'richText' | 'unknown';
    };
}

export interface MediaRefInfo {
    url: string;
    fileName: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
    componentId?: string;
    fieldName?: string;
    origin: 'fileUpload' | 'richText' | 'unknown';
}

function stableEntryId(storageKey: string | null, url: string): string {
    const base = storageKey || url;
    let h = 0;
    for (let i = 0; i < base.length; i++) {
        h = (Math.imul(31, h) + base.charCodeAt(i)) | 0;
    }
    return `dm-${Math.abs(h).toString(36)}`;
}

function mergeRefInfo(a: MediaRefInfo, b: MediaRefInfo): MediaRefInfo {
    return {
        url: a.url,
        fileName: a.fileName ?? b.fileName,
        mimeType: a.mimeType ?? b.mimeType,
        sizeBytes: a.sizeBytes ?? b.sizeBytes,
        componentId: a.componentId ?? b.componentId,
        fieldName: a.fieldName ?? b.fieldName,
        origin: a.origin === 'unknown' ? b.origin : a.origin,
    };
}

function addRef(map: Map<string, MediaRefInfo>, url: string, info: MediaRefInfo): void {
    if (!isR2Url(url)) return;
    const prev = map.get(url);
    if (prev) {
        map.set(url, mergeRefInfo(prev, info));
    } else {
        map.set(url, { ...info, url });
    }
}

/**
 * Deep-walk JSON: Lexical image nodes + file lists with committed R2 URLs.
 */
function deepExtractMediaRefs(
    value: unknown,
    map: Map<string, MediaRefInfo>,
    ctx: { componentId?: string; fieldName?: string }
): void {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
        for (const item of value) {
            deepExtractMediaRefs(item, map, ctx);
        }
        return;
    }
    if (typeof value !== 'object') return;

    const o = value as Record<string, unknown>;

    if (o.type === 'image' && typeof o.src === 'string') {
        addRef(map, o.src, {
            url: o.src,
            fileName: null,
            mimeType: null,
            sizeBytes: null,
            ...ctx,
            origin: 'richText',
        });
    }

    if (Array.isArray(o.files)) {
        for (const f of o.files) {
            if (!f || typeof f !== 'object') continue;
            const rec = f as Record<string, unknown>;
            if ('pendingId' in rec) continue;
            const u = rec.url;
            if (typeof u !== 'string') continue;
            addRef(map, u, {
                url: u,
                fileName: typeof rec.name === 'string' ? rec.name : null,
                mimeType: typeof rec.type === 'string' ? rec.type : null,
                sizeBytes: typeof rec.size === 'number' ? rec.size : null,
                ...ctx,
                origin: 'fileUpload',
            });
        }
    }

    for (const v of Object.values(o)) {
        deepExtractMediaRefs(v, map, ctx);
    }
}

export function extractMediaRefsFromPageData(pageData: PageData): Map<string, MediaRefInfo> {
    const map = new Map<string, MediaRefInfo>();
    for (const c of pageData.components) {
        for (const [fieldName, cell] of Object.entries(c.data)) {
            deepExtractMediaRefs(cell?.value, map, {
                componentId: c.id,
                fieldName,
            });
        }
    }
    return map;
}

export function extractMediaRefsFromGlobalData(globalData: GlobalData): Map<string, MediaRefInfo> {
    const map = new Map<string, MediaRefInfo>();
    for (const v of globalData.variables) {
        for (const [fieldName, cell] of Object.entries(v.data)) {
            deepExtractMediaRefs(cell?.value, map, {
                componentId: v.id,
                fieldName,
            });
        }
    }
    return map;
}

function toDiscardedEntry(
    url: string,
    info: MediaRefInfo,
    source: DiscardedMediaEntry['source'],
    removedAt: string
): DiscardedMediaEntry | null {
    const storageKey = extractMediaStorageKeyFromUrl(url);
    if (!storageKey) return null;
    return {
        id: stableEntryId(storageKey, url),
        url,
        storageKey,
        fileName: info.fileName ?? inferFileNameFromUrl(url),
        mimeType: info.mimeType,
        sizeBytes: info.sizeBytes,
        removedAt,
        source,
    };
}

function inferFileNameFromUrl(url: string): string {
    try {
        const path = new URL(url).pathname;
        const seg = path.split('/').filter(Boolean);
        return seg[seg.length - 1] || url;
    } catch {
        return url;
    }
}

export function emptyDiscardedMediaFile(): DiscardedMediaFile {
    return { version: DISCARDED_MEDIA_VERSION, entries: [] };
}

export function parseDiscardedMediaFile(json: unknown): DiscardedMediaFile {
    if (!json || typeof json !== 'object') return emptyDiscardedMediaFile();
    const o = json as Record<string, unknown>;
    if (o.version !== DISCARDED_MEDIA_VERSION || !Array.isArray(o.entries)) {
        return emptyDiscardedMediaFile();
    }
    return {
        version: DISCARDED_MEDIA_VERSION,
        entries: o.entries as DiscardedMediaEntry[],
    };
}

/**
 * Merge newly removed URLs into the repo file. Deduplicates by `url`; updates `removedAt` when the same URL is discarded again.
 */
export function mergeDiscardedMediaFile(
    existing: DiscardedMediaFile | null,
    newEntries: DiscardedMediaEntry[]
): DiscardedMediaFile {
    const file = existing ?? emptyDiscardedMediaFile();
    const byUrl = new Map<string, DiscardedMediaEntry>();
    for (const e of file.entries) {
        byUrl.set(e.url, e);
    }
    for (const e of newEntries) {
        const prev = byUrl.get(e.url);
        if (prev) {
            byUrl.set(e.url, { ...prev, removedAt: e.removedAt });
        } else {
            byUrl.set(e.url, e);
        }
    }
    const entries = [...byUrl.values()].sort((a, b) => a.removedAt.localeCompare(b.removedAt));
    return { version: DISCARDED_MEDIA_VERSION, entries };
}

export interface BuildDiscardedMediaParams {
    changes: {
        pages: Array<{ pageName: string; data: PageData }>;
        globals?: GlobalData;
    };
    getBaselinePage: (sanitizedFileName: string) => Promise<PageData | null>;
    getBaselineGlobals: () => Promise<GlobalData | null>;
    getExistingDiscarded: () => Promise<DiscardedMediaFile | null>;
}

/**
 * Compute merged `discarded-media.json` body for this publish batch.
 */
export async function buildDiscardedMediaJsonForPublish(params: BuildDiscardedMediaParams): Promise<string> {
    const removedAt = new Date().toISOString();
    const newEntries: DiscardedMediaEntry[] = [];

    for (const { pageName, data } of params.changes.pages) {
        const fileName = pageName === 'home' ? 'index' : pageName;
        const baseline = await params.getBaselinePage(fileName);
        const baselineRefs = baseline ? extractMediaRefsFromPageData(baseline) : new Map<string, MediaRefInfo>();
        const newRefs = extractMediaRefsFromPageData(data);

        for (const [url, info] of baselineRefs) {
            if (newRefs.has(url)) continue;
            const entry = toDiscardedEntry(url, info, {
                kind: 'page',
                pageName: fileName,
                componentId: info.componentId,
                fieldName: info.fieldName,
                origin: info.origin === 'richText' ? 'richText' : info.origin === 'fileUpload' ? 'fileUpload' : 'unknown',
            }, removedAt);
            if (entry) newEntries.push(entry);
        }
    }

    if (params.changes.globals) {
        const baseline = await params.getBaselineGlobals();
        const baselineRefs = baseline ? extractMediaRefsFromGlobalData(baseline) : new Map<string, MediaRefInfo>();
        const newRefs = extractMediaRefsFromGlobalData(params.changes.globals);

        for (const [url, info] of baselineRefs) {
            if (newRefs.has(url)) continue;
            const entry = toDiscardedEntry(url, info, {
                kind: 'globals',
                componentId: info.componentId,
                fieldName: info.fieldName,
                origin: info.origin === 'richText' ? 'richText' : info.origin === 'fileUpload' ? 'fileUpload' : 'unknown',
            }, removedAt);
            if (entry) newEntries.push(entry);
        }
    }

    const existing = await params.getExistingDiscarded();
    const merged = mergeDiscardedMediaFile(existing, newEntries);
    return JSON.stringify(merged, null, 2);
}
