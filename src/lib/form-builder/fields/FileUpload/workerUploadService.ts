/**
 * Upload service that uses Cloudflare Worker for presigned URLs
 * This keeps R2 credentials secure while allowing static CMS to upload files
 */

import { loadUploadWorkerConfig } from '../../../storage';

export interface PresignedUploadResponse {
    uploadUrl: string;
    filePath: string;
    publicUrl: string;
    expiresIn: number;
}

export interface UploadRequest {
    fileName: string;
    fileSize: number;
    fileType: string;
}



class WorkerUploadService {
    private workerUrl: string | null = null;

    constructor() {
        const config = loadUploadWorkerConfig();
        this.workerUrl = config?.workerUrl || null;
    }

    /**
     * Check if the upload service is configured
     */
    isConfigured(): boolean {
        return !!this.workerUrl;
    }

    /**
     * Get configuration status
     */
    getConfigStatus(): {
        configured: boolean;
        errors: string[];
        source: 'environment' | 'config' | 'none';
    } {
        if (!this.workerUrl) {
            return {
                configured: false,
                errors: ['Upload worker URL not configured. Set PUBLIC_UPLOAD_WORKER_URL environment variable.'],
                source: 'none'
            };
        }

        return {
            configured: true,
            errors: [],
            source: 'environment'
        };
    }

    /**
     * Get presigned upload URL from worker
     */
    async getPresignedUploadUrl(request: UploadRequest): Promise<PresignedUploadResponse> {
        if (!this.workerUrl) {
            throw new Error('Upload worker not configured');
        }

        try {
            // Ensure we're using the correct /upload endpoint
            const uploadUrl = this.workerUrl.endsWith('/')
                ? `${this.workerUrl}upload`
                : `${this.workerUrl}/upload`;

            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Worker request failed: ${response.status} ${errorText}`);
            }

            const data: PresignedUploadResponse = await response.json();
            return data;
        } catch (error) {
            throw new Error(`Failed to get presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Upload file using worker endpoint
     */
    async uploadFile(file: File, uploadResponse: PresignedUploadResponse): Promise<string> {
        try {
            const uploadHeaders: Record<string, string> = {
                'Content-Type': file.type,
                'X-File-Path': uploadResponse.filePath,
                'X-File-Type': file.type,
                ...(uploadResponse as any).uploadHeaders || {}
            };

            const response = await fetch(uploadResponse.uploadUrl, {
                method: 'PUT',
                body: file,
                headers: uploadHeaders
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Upload failed: ${response.status} ${errorText}`);
            }

            // Try to parse JSON response, fallback to public URL
            try {
                const result = await response.json();
                return result.url || uploadResponse.publicUrl;
            } catch {
                return uploadResponse.publicUrl;
            }
        } catch (error) {
            throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Complete upload process: get presigned URL and upload file
     */
    async uploadFileComplete(file: File): Promise<string> {
        const request: UploadRequest = {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
        };

        const presignedResponse = await this.getPresignedUploadUrl(request);
        return await this.uploadFile(file, presignedResponse);
    }

    /**
     * Delete file from R2 storage
     */
    async deleteFile(fileUrl: string): Promise<void> {
        if (!this.workerUrl) {
            throw new Error('Upload worker not configured');
        }

        try {
            // Extract file path from URL
            const filePath = this.extractFilePathFromUrl(fileUrl);
            if (!filePath) {
                throw new Error('Could not extract file path from URL');
            }

            // Ensure we're using the correct /file/{path} endpoint for deletion
            const deleteUrl = this.workerUrl.endsWith('/')
                ? `${this.workerUrl}file/${filePath}`
                : `${this.workerUrl}/file/${filePath}`;

            const response = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Delete request failed: ${response.status} ${errorText}`);
            }

            // Parse response to check for success
            try {
                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.message || 'Delete operation failed');
                }
            } catch (parseError) {
                // If response is not JSON, assume success if status is OK
                if (response.status !== 200) {
                    throw new Error('Delete operation may have failed');
                }
            }
        } catch (error) {
            throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Extract file path from a full URL
     * Handles both worker URLs and R2 public URLs
     */
    private extractFilePathFromUrl(url: string): string | null {
        try {
            const urlObj = new URL(url);

            // If it's a worker URL with /file/ prefix, extract the path after that
            if (urlObj.pathname.startsWith('/file/')) {
                return urlObj.pathname.substring(6); // Remove '/file/' prefix
            }

            // If it's a direct R2 URL, extract the path after the domain
            // Common patterns:
            // - https://pub-xxx.r2.dev/cms-uploads/...
            // - https://bucket.r2.cloudflarestorage.com/cms-uploads/...
            const pathWithoutLeadingSlash = urlObj.pathname.startsWith('/')
                ? urlObj.pathname.substring(1)
                : urlObj.pathname;

            return pathWithoutLeadingSlash || null;
        } catch (error) {
            console.error('Failed to parse file URL:', error);
            return null;
        }
    }
}

// Global instance
export const workerUploadService = new WorkerUploadService();