import type { PageData, GlobalData } from '@/lib/form-builder';
import { getPendingFile, deletePendingFile } from '@/lib/cms-local-changes';
import { workerUploadService } from './workerUploadService';
import { isPendingFileRef } from './fileUpload.types';
import { globalUploadManager } from './uploadManager';

async function resolveFilesArray(files: unknown[]): Promise<unknown[]> {
    const out: unknown[] = [];
    for (const f of files) {
        if (isPendingFileRef(f)) {
            const rec = await getPendingFile(f.pendingId);
            if (!rec) {
                throw new Error(
                    `Pending file blob missing for "${f.name}" (${f.pendingId}). It may have been cleared or never saved.`
                );
            }
            const blobFile = new File([rec.blob], rec.name, { type: rec.type });
            if (!workerUploadService.isConfigured()) {
                throw new Error('Upload service is not configured; cannot publish pending files.');
            }
            const url = await workerUploadService.uploadFileComplete(blobFile);
            await deletePendingFile(f.pendingId);
            globalUploadManager.removeOperation(f.pendingId);
            out.push({
                url,
                name: rec.name,
                size: rec.size,
                type: rec.type,
            });
        } else {
            out.push(f);
        }
    }
    return out;
}

async function resolvePendingDeep(node: unknown): Promise<void> {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
        for (const item of node) {
            await resolvePendingDeep(item);
        }
        return;
    }
    if (typeof node !== 'object') return;

    const o = node as Record<string, unknown>;
    if (Array.isArray(o.files)) {
        o.files = await resolveFilesArray(o.files as unknown[]);
    }
    for (const [k, v] of Object.entries(o)) {
        if (k === 'files') continue;
        await resolvePendingDeep(v);
    }
}

export async function resolvePendingFilesInPageData(data: PageData): Promise<PageData> {
    const clone = structuredClone(data) as PageData;
    await resolvePendingDeep(clone);
    return clone;
}

export async function resolvePendingFilesInGlobalData(data: GlobalData): Promise<GlobalData> {
    const clone = structuredClone(data) as GlobalData;
    for (const variable of clone.variables) {
        await resolvePendingDeep(variable.data);
    }
    return clone;
}
