import type { PageData, GlobalData, ComponentData } from '@/lib/form-builder';
import { getPendingFile } from '@/lib/cms-local-changes';
import type { UploadManager } from './uploadManager';
import { isPendingFileRef } from './fileUpload.types';

/**
 * Re-instantiate in-memory upload queue entries from draft placeholders + IndexedDB blobs.
 */
export async function hydratePendingUploadsForPageData(
    pageId: string,
    pageData: PageData,
    uploadManager: UploadManager
): Promise<void> {
    for (const c of pageData.components) {
        await hydrateComponentData(pageId, c.id, c.data, uploadManager);
    }
}

export async function hydratePendingUploadsForGlobalData(
    globalData: GlobalData,
    uploadManager: UploadManager
): Promise<void> {
    const pageId = 'globals';
    for (const v of globalData.variables) {
        await hydrateComponentData(pageId, v.id, v.data, uploadManager);
    }
}

async function hydrateComponentData(
    pageId: string,
    componentId: string,
    data: ComponentData['data'],
    uploadManager: UploadManager
): Promise<void> {
    for (const [fieldName, cell] of Object.entries(data)) {
        await hydrateFieldValue(pageId, componentId, fieldName, cell?.value, uploadManager);
    }
}

async function hydrateFieldValue(
    pageId: string,
    componentId: string,
    fieldName: string,
    value: unknown,
    uploadManager: UploadManager
): Promise<void> {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
        for (const item of value) {
            await hydrateFieldValue(pageId, componentId, fieldName, item, uploadManager);
        }
        return;
    }
    if (typeof value !== 'object') return;

    const o = value as Record<string, unknown>;

    if (Array.isArray(o.files)) {
        for (const i of o.files) {
            if (!isPendingFileRef(i)) continue;
            const rec = await getPendingFile(i.pendingId);
            if (!rec || rec.pageId !== pageId) continue;
            const file = new File([rec.blob], rec.name, { type: rec.type });
            const cid = rec.componentId ?? componentId;
            const fn = rec.fieldName ?? fieldName;
            uploadManager.restoreQueuedUpload(rec.id, file, cid, fn);
        }
    }

    for (const [k, v] of Object.entries(o)) {
        if (k === 'files') continue;
        await hydrateFieldValue(pageId, componentId, fieldName, v, uploadManager);
    }
}
