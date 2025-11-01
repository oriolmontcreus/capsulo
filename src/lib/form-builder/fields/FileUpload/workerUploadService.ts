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



export class WorkerUploadService {
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
}

// Global instance
export const workerUploadService = new WorkerUploadService();