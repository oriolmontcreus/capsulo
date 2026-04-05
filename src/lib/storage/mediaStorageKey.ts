/**
 * Extract R2 object key / worker file path from a public URL.
 * Shared with worker delete logic — keep in sync with workerUploadService.extractFilePathFromUrl.
 */
export function extractMediaStorageKeyFromUrl(url: string): string | null {
    try {
        const urlObj = new URL(url);

        if (urlObj.pathname.startsWith('/file/')) {
            return urlObj.pathname.substring(6);
        }

        const pathWithoutLeadingSlash = urlObj.pathname.startsWith('/')
            ? urlObj.pathname.substring(1)
            : urlObj.pathname;

        return pathWithoutLeadingSlash || null;
    } catch {
        return null;
    }
}
