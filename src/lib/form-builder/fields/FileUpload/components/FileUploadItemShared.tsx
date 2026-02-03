import { Image, FileText, FileArchive, FileSpreadsheet, Video, Headphones, File } from 'lucide-react';

// Helper function to get appropriate file icon based on file type
export const getFileIcon = (file: { type: string; name: string }, size: string = 'size-4') => {
    const fileType = file.type;
    const fileName = file.name;

    if (fileType.includes("pdf") ||
        fileName.endsWith(".pdf") ||
        fileType.includes("word") ||
        fileName.endsWith(".doc") ||
        fileName.endsWith(".docx")) {
        return <FileText className={`${size} opacity-60`} />;
    } else if (fileType.includes("zip") ||
        fileType.includes("archive") ||
        fileName.endsWith(".zip") ||
        fileName.endsWith(".rar")) {
        return <FileArchive className={`${size} opacity-60`} />;
    } else if (fileType.includes("excel") ||
        fileType.includes("spreadsheet") ||
        fileName.endsWith(".xls") ||
        fileName.endsWith(".xlsx")) {
        return <FileSpreadsheet className={`${size} opacity-60`} />;
    } else if (fileType.includes("video/")) {
        return <Video className={`${size} opacity-60`} />;
    } else if (fileType.includes("audio/")) {
        return <Headphones className={`${size} opacity-60`} />;
    } else if (fileType.startsWith("image/")) {
        return <Image className={`${size} opacity-60`} />;
    }

    return <File className={`${size} opacity-60`} />;
};

// Helper function to check if a file is a PDF
export const isPDF = (file: { type: string; name: string }) => {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
};

// Helper function to check if a file is audio
export const isAudio = (file: { type: string; name: string }) => {
    return file.type.startsWith('audio/') ||
        file.name.toLowerCase().endsWith('.mp3') ||
        file.name.toLowerCase().endsWith('.wav') ||
        file.name.toLowerCase().endsWith('.ogg') ||
        file.name.toLowerCase().endsWith('.m4a') ||
        file.name.toLowerCase().endsWith('.flac');
};

// Helper function to check if a file is video
export const isVideo = (file: { type: string; name: string }) => {
    return file.type.startsWith('video/') ||
        file.name.toLowerCase().endsWith('.mp4') ||
        file.name.toLowerCase().endsWith('.webm') ||
        file.name.toLowerCase().endsWith('.mov') ||
        file.name.toLowerCase().endsWith('.avi');
};

// Helper function to check if a file is previewable (PDF, audio, or video)
export const isPreviewable = (file: { type: string; name: string }) => {
    return isPDF(file) || isAudio(file) || isVideo(file);
};

// Helper function to check if a file is SVG
export const isSVG = (file: { type: string; name: string }) => {
    return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
};

// Helper function to handle file preview
export const handleFilePreview = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
};
