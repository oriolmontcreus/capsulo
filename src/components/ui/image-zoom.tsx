"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { detectImageBrightness } from "@/lib/utils/image-brightness";

export type ImageZoomProps = {
    children: ReactNode;
    className?: string;
};

export const ImageZoom = ({ children, className }: ImageZoomProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [imageSrc, setImageSrc] = useState<string>('');

    return (
        <>
            <div
                className={cn("cursor-zoom-in", className)}
                onClick={(e) => {
                    const target = e.target as HTMLElement;
                    const img = target.tagName === 'IMG' ? target as HTMLImageElement : target.querySelector('img');
                    if (img) {
                        setImageSrc(img.src);
                        setIsOpen(true);
                    }
                }}
            >
                {children}
            </div>

            {isOpen && (
                <ImageZoomModal
                    src={imageSrc}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </>
    );
};

const ImageZoomModal = ({ src, onClose }: { src: string; onClose: () => void }) => {
    const [bgColor, setBgColor] = useState<'black' | 'white'>('black');
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-detect background color
    useEffect(() => {
        if (imgRef.current && imgRef.current.complete) {
            detectImageBrightness(imgRef.current).then(setBgColor);
        }
    }, [src]);

    // Update transform
    const updateTransform = (newZoom: number, newPan: { x: number, y: number }, disableTransition = false) => {
        if (imgRef.current) {
            imgRef.current.style.transition = disableTransition ? 'none' : 'transform 0.1s ease-out';
            imgRef.current.style.transform = `translate(${newPan.x}px, ${newPan.y}px) scale(${newZoom})`;
        }
    };

    // Handle wheel zoom
    useEffect(() => {
        if (!containerRef.current) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;

            setZoom(prev => {
                const newZoom = Math.max(0.5, Math.min(5, prev + delta));
                const rect = containerRef.current!.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;

                setPan(prevPan => {
                    const zoomRatio = newZoom / prev;
                    const newPan = {
                        x: mouseX - (mouseX - prevPan.x) * zoomRatio,
                        y: mouseY - (mouseY - prevPan.y) * zoomRatio
                    };
                    updateTransform(newZoom, newPan);
                    return newPan;
                });

                return newZoom;
            });
        };

        const container = containerRef.current;
        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, []);

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
                updateTransform(zoom, newPan, true);
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

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isDropdownOpen) return;

        const handleClick = () => setIsDropdownOpen(false);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [isDropdownOpen]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
                backgroundColor: bgColor === 'black' ? '#000' : '#fff',
                transition: 'background-color 0.2s'
            }}
        >
            <div
                ref={containerRef}
                className="relative w-full h-full flex items-center justify-center overflow-hidden"
                style={{
                    cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                }}
            >
                <img
                    ref={imgRef}
                    src={src}
                    alt="Zoomed image"
                    draggable="false"
                    className="max-w-full max-h-full object-contain select-none"
                    style={{
                        transformOrigin: 'center'
                    }}
                    onLoad={(e) => {
                        detectImageBrightness(e.currentTarget).then(setBgColor);
                    }}
                />

                {/* Floating island controls */}
                <div className="absolute top-5 left-5 z-10">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-full bg-black/70 backdrop-blur-sm shadow-lg">
                        {/* Zoom dropdown */}
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDropdownOpen(!isDropdownOpen);
                                }}
                                className="px-2.5 py-1 rounded-md bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors flex items-center gap-1.5"
                            >
                                {Math.round(zoom * 100)}%
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="opacity-70">
                                    <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>

                            {isDropdownOpen && (
                                <div
                                    className="absolute top-full left-0 mt-1 py-1 rounded-md bg-black/90 text-white text-sm min-w-[80px] shadow-lg"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {[0.5, 0.75, 1, 1.5, 2, 3, 4, 5].map((zoomLevel) => (
                                        <button
                                            key={zoomLevel}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setZoom(zoomLevel);
                                                setPan({ x: 0, y: 0 });
                                                updateTransform(zoomLevel, { x: 0, y: 0 });
                                                setIsDropdownOpen(false);
                                            }}
                                            className={cn(
                                                "w-full px-3 py-1.5 text-left hover:bg-white/10 transition-colors",
                                                zoom === zoomLevel && "bg-white/20"
                                            )}
                                        >
                                            {Math.round(zoomLevel * 100)}%
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="w-px h-6 bg-white/20" />

                        {/* Color options with labels */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setBgColor('black');
                                }}
                                className="flex items-center gap-2 group"
                                aria-label="Dark background"
                            >
                                <div className={cn(
                                    "size-6 rounded-full bg-black cursor-pointer transition-all",
                                    bgColor === 'black'
                                        ? "ring-2 ring-white ring-offset-2 ring-offset-black/70"
                                        : "ring-1 ring-white/30 group-hover:ring-white/50"
                                )} />
                                <span className="text-[10px] text-white/70 font-medium">Dark</span>
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setBgColor('white');
                                }}
                                className="flex items-center gap-2 group"
                                aria-label="Light background"
                            >
                                <div className={cn(
                                    "size-6 rounded-full bg-white cursor-pointer transition-all",
                                    bgColor === 'white'
                                        ? "ring-2 ring-white ring-offset-2 ring-offset-black/70"
                                        : "ring-1 ring-white/30 group-hover:ring-white/50"
                                )} />
                                <span className="text-[10px] text-white/70 font-medium">Light</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Close button */}
                <div className="absolute top-5 right-5 z-10">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="size-10 rounded-full bg-black/70 backdrop-blur-sm cursor-pointer transition-all flex items-center justify-center text-white hover:bg-black/80 shadow-lg"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
