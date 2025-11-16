import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Code } from 'lucide-react';
import { CodeEditor } from './CodeEditor';
import { cn } from '@/lib/utils';
import { detectSvgBrightness } from '@/lib/utils/image-brightness';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Simple SVG formatter
const formatSvg = (svgString: string): string => {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');

        // Check for parsing errors
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
            return svgString; // Return original if parsing fails
        }

        // Serialize with proper formatting
        const serializer = new XMLSerializer();
        let formatted = serializer.serializeToString(doc);

        // Add indentation with proper depth tracking
        formatted = formatted.replace(/></g, '>\n<'); // Add newlines between tags

        const lines = formatted.split('\n');
        let depth = 0;
        const indentedLines = lines.map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return '';

            // Check if line is a closing tag
            const isClosingTag = /^<\//.test(trimmed);
            // Check if line is self-closing tag
            const isSelfClosing = /\/>$/.test(trimmed);
            // Check if line is an opening tag (not closing, not self-closing)
            const isOpeningTag = /^<[^/!?]/.test(trimmed) && !isSelfClosing;

            // Decrease depth before adding indent for closing tags
            if (isClosingTag) {
                depth = Math.max(0, depth - 1);
            }

            const indented = '  '.repeat(depth) + trimmed;

            // Increase depth after processing opening tags (but not self-closing)
            if (isOpeningTag) {
                depth++;
            }

            return indented;
        });

        return indentedLines.join('\n');
    } catch (error) {
        // If formatting fails, return original
        return svgString;
    }
};

// SVG Preview Component with zoom
const SvgPreview: React.FC<{ svgContent: string; zoom: number; onZoomChange: (zoom: number) => void }> = ({ svgContent, zoom, onZoomChange }) => {
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const imgRef = React.useRef<HTMLImageElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const previewUrl = useMemo(() => {
        try {
            const blob = new Blob([svgContent], { type: 'image/svg+xml' });
            return URL.createObjectURL(blob);
        } catch {
            return null;
        }
    }, [svgContent]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Update transform
    const updateTransform = (newZoom: number, newPan: { x: number, y: number }) => {
        if (imgRef.current) {
            imgRef.current.style.transform = `translate(${newPan.x}px, ${newPan.y}px) scale(${newZoom})`;
            imgRef.current.style.transformOrigin = 'center';
        }
    };

    // Handle wheel zoom (zoom towards cursor)
    useEffect(() => {
        if (!containerRef.current) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newZoom = Math.max(0.5, Math.min(5, zoom + delta));

            // Zoom towards cursor position
            const rect = containerRef.current!.getBoundingClientRect();
            const mouseX = e.clientX - rect.left - rect.width / 2;
            const mouseY = e.clientY - rect.top - rect.height / 2;

            const zoomRatio = newZoom / zoom;
            const newPan = {
                x: mouseX - (mouseX - pan.x) * zoomRatio,
                y: mouseY - (mouseY - pan.y) * zoomRatio
            };

            setPan(newPan);
            updateTransform(newZoom, newPan);
            onZoomChange(newZoom);
        };

        const container = containerRef.current;
        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [zoom, pan, onZoomChange]);

    // Handle pan/drag
    useEffect(() => {
        if (!containerRef.current) return;

        const handleMouseDown = (e: MouseEvent) => {
            if (zoom > 1) {
                setIsDragging(true);
                setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging && zoom > 1) {
                const newPan = {
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y
                };
                setPan(newPan);
                updateTransform(zoom, newPan);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        const container = containerRef.current;
        container.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            container.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart, pan, zoom]);

    if (!previewUrl) {
        return <p className="text-sm text-muted-foreground">Unable to generate preview</p>;
    }

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full flex items-center justify-center"
            style={{
                cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
        >
            <img
                ref={imgRef}
                src={previewUrl}
                alt="SVG Preview"
                draggable="false"
                className="max-w-full max-h-[200px] object-contain select-none"
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
            />
        </div>
    );
};

interface SvgEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    svgUrl?: string;
    svgFile?: File;
    fileName: string;
    onSave: (newSvgContent: string) => Promise<void>;
}

export const SvgEditorModal: React.FC<SvgEditorModalProps> = ({
    isOpen,
    onClose,
    svgUrl,
    svgFile,
    fileName,
    onSave
}) => {
    const [svgContent, setSvgContent] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [bgColor, setBgColor] = useState<'black' | 'white'>('white');
    const [zoom, setZoom] = useState(1);

    // Load SVG content when modal opens
    useEffect(() => {
        if (!isOpen) return;

        const loadSvg = async () => {
            setIsLoading(true);
            setError(null);

            try {
                let content: string;

                if (svgFile) {
                    // Load from File object (queued files)
                    content = await svgFile.text();
                } else if (svgUrl) {
                    // Load from URL (uploaded files)
                    // Just fetch it - no CORS issues because we're not doing anything special
                    const response = await fetch(svgUrl);
                    if (!response.ok) {
                        throw new Error('Failed to load SVG');
                    }
                    content = await response.text();
                } else {
                    throw new Error('No SVG source provided');
                }

                // Format the SVG content for better readability
                const formattedContent = formatSvg(content);

                // Auto-detect best background color
                const detectedBg = detectSvgBrightness(formattedContent);
                setBgColor(detectedBg);

                setSvgContent(formattedContent);
                setOriginalContent(formattedContent);
            } catch (err) {
                console.error('Failed to load SVG:', err);

                // Check if it's a CORS error
                const errorMessage = err instanceof Error ? err.message : 'Failed to load SVG';
                const isCorsError = errorMessage.includes('CORS') ||
                    errorMessage.includes('NetworkError') ||
                    errorMessage.includes('fetch');

                if (isCorsError && svgUrl) {
                    setError(
                        'CORS Error: Your R2 bucket needs CORS configuration. ' +
                        'See R2_CORS_SETUP.md in the project root for a 2-minute fix.'
                    );
                } else {
                    setError(errorMessage);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadSvg();
    }, [isOpen, svgUrl, svgFile]);

    // Validate SVG content
    const validateSvg = (content: string): boolean => {
        setValidationError(null);

        if (!content.trim()) {
            setValidationError('SVG content cannot be empty');
            return false;
        }

        // Check if it's valid XML/SVG
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'image/svg+xml');

            // Check for parsing errors
            const parserError = doc.querySelector('parsererror');
            if (parserError) {
                setValidationError('Invalid SVG syntax');
                return false;
            }

            // Check if root element is SVG
            if (doc.documentElement.tagName.toLowerCase() !== 'svg') {
                setValidationError('Root element must be <svg>');
                return false;
            }

            return true;
        } catch (err) {
            setValidationError('Invalid SVG format');
            return false;
        }
    };



    // Handle save
    const handleSave = async () => {
        if (!validateSvg(svgContent)) {
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await onSave(svgContent);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save SVG');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle cancel
    const handleCancel = () => {
        setSvgContent(originalContent);
        setValidationError(null);
        setError(null);
        onClose();
    };

    const hasChanges = svgContent !== originalContent;

    return (
        <Dialog open={isOpen} onOpenChange={handleCancel}>
            <DialogContent className="w-[95vw] h-[95vh] max-w-[95vw] sm:max-w-[95vw] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Code className="size-5" />
                        Edit SVG: {fileName}
                    </DialogTitle>
                    <DialogDescription>
                        Modify the SVG code on the left. Preview updates in real-time on the right.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    </div>
                ) : error ? (
                    <div className="flex-1 flex items-center justify-center p-6">
                        <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-md">
                            <AlertCircle className="size-5" />
                            <span>{error}</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Side-by-side layout */}
                        <div className="flex-1 flex gap-4 p-6 overflow-hidden">
                            {/* Left: Code Editor */}
                            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">Code</p>
                                    {validationError && (
                                        <div className="flex items-center gap-2 text-sm text-destructive">
                                            <AlertCircle className="size-4" />
                                            <span>{validationError}</span>
                                        </div>
                                    )}
                                </div>
                                <CodeEditor
                                    value={svgContent}
                                    onChange={(newValue) => {
                                        setSvgContent(newValue);
                                        if (validationError) {
                                            setValidationError(null);
                                        }
                                    }}
                                    hasError={!!validationError}
                                />
                            </div>

                            {/* Right: Preview */}
                            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">Preview</p>
                                    <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-full bg-muted/50">
                                        {/* Zoom dropdown */}
                                        <Select
                                            value={zoom.toString()}
                                            onValueChange={(value) => setZoom(parseFloat(value))}
                                        >
                                            <SelectTrigger size="sm" className="h-6 px-2 text-xs w-[74px]">
                                                <SelectValue>{Math.round(zoom * 100)}%</SelectValue>
                                            </SelectTrigger>
                                            <SelectContent className="min-w-[80px]">
                                                {[0.5, 0.75, 1, 1.5, 2, 3, 4, 5].map((zoomLevel) => (
                                                    <SelectItem key={zoomLevel} value={zoomLevel.toString()}>
                                                        {Math.round(zoomLevel * 100)}%
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {/* Divider */}
                                        <div className="w-px h-6 bg-border" />

                                        {/* Color options */}
                                        <button
                                            onClick={() => setBgColor('black')}
                                            className="flex items-center gap-1.5 group"
                                            aria-label="Dark background"
                                        >
                                            <div className={cn(
                                                "size-5 rounded-full bg-black cursor-pointer transition-all",
                                                bgColor === 'black'
                                                    ? 'ring-1 ring-primary ring-offset-1 ring-offset-muted/50'
                                                    : 'ring-1 ring-border group-hover:ring-primary/50'
                                            )} />
                                            <span className="text-[10px] text-muted-foreground font-medium">Dark</span>
                                        </button>

                                        <button
                                            onClick={() => setBgColor('white')}
                                            className="flex items-center gap-1.5 group"
                                            aria-label="Light background"
                                        >
                                            <div className={cn(
                                                "size-5 rounded-full bg-white cursor-pointer transition-all",
                                                bgColor === 'white'
                                                    ? 'ring-1 ring-primary ring-offset-1 ring-offset-muted/50'
                                                    : 'ring-1 ring-border group-hover:ring-primary/50'
                                            )} />
                                            <span className="text-[10px] text-muted-foreground font-medium">Light</span>
                                        </button>
                                    </div>
                                </div>
                                <div
                                    className="flex-1 border rounded-md p-8 flex items-center justify-center overflow-auto transition-colors"
                                    style={{
                                        backgroundColor: bgColor === 'black' ? '#000' : '#fff'
                                    }}
                                >
                                    {validationError ? (
                                        <p className="text-sm text-muted-foreground">Fix errors to see preview</p>
                                    ) : (
                                        <SvgPreview svgContent={svgContent} zoom={zoom} onZoomChange={setZoom} />
                                    )}
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="px-6 pb-6 pt-4 border-t shrink-0">
                            <Button
                                variant="outline"
                                onClick={handleCancel}
                                disabled={isSaving}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={!hasChanges || isSaving || !!validationError}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="size-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save'
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog >
    );
};
