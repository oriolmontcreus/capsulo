import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Code } from 'lucide-react';
import { CodeEditor } from './CodeEditor';
import { cn } from '@/lib/utils';

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

        // Add indentation
        formatted = formatted
            .replace(/></g, '>\n<') // Add newlines between tags
            .split('\n')
            .map((line, index) => {
                const depth = (line.match(/^<[^/]/g) ? line.split('<').length - 1 : 0) -
                    (line.match(/<\//g) ? line.split('</').length - 1 : 0);
                const indent = '  '.repeat(Math.max(0, depth));
                return indent + line.trim();
            })
            .join('\n');

        return formatted;
    } catch (error) {
        // If formatting fails, return original
        return svgString;
    }
};

// SVG Preview Component
const SvgPreview: React.FC<{ svgContent: string }> = ({ svgContent }) => {
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

    if (!previewUrl) {
        return <p className="text-sm text-muted-foreground">Unable to generate preview</p>;
    }

    return (
        <img
            src={previewUrl}
            alt="SVG Preview"
            draggable="false"
            className="max-w-full max-h-[200px] object-contain select-none"
        />
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
                                    <div className="flex gap-2 items-center">
                                        <button
                                            onClick={() => setBgColor('black')}
                                            className={cn(
                                                "size-6 rounded-md bg-black cursor-pointer transition-all",
                                                bgColor === 'black'
                                                    ? 'border-[2px] border-primary'
                                                    : 'border-2 border-border'
                                            )}
                                            aria-label="Black background"
                                            title="Black background"
                                        />
                                        <button
                                            onClick={() => setBgColor('white')}
                                            className={cn(
                                                "size-6 rounded-md bg-white cursor-pointer transition-all",
                                                bgColor === 'white'
                                                    ? 'border-[2px] border-primary'
                                                    : 'border-2 border-border'
                                            )}
                                            aria-label="White background"
                                            title="White background"
                                        />
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
                                        <SvgPreview svgContent={svgContent} />
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
