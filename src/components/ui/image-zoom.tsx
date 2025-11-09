"use client";

import { useState, useRef, useEffect } from "react";
import Zoom, {
    type ControlledProps,
    type UncontrolledProps,
} from "react-medium-image-zoom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { detectImageBrightness } from "@/lib/utils/image-brightness";

export type ImageZoomProps = UncontrolledProps & {
    isZoomed?: ControlledProps["isZoomed"];
    onZoomChange?: ControlledProps["onZoomChange"];
    className?: string;
    backdropClassName?: string;
};

export const ImageZoom = ({
    className,
    backdropClassName,
    ...props
}: ImageZoomProps) => {
    const bgColorRef = useRef<'black' | 'white'>('black');

    return (
        <div
            className={cn(
                "relative",
                "[&_[data-rmiz-ghost]]:pointer-events-none [&_[data-rmiz-ghost]]:absolute",
                "[&_[data-rmiz-btn-zoom]]:m-0 [&_[data-rmiz-btn-zoom]]:size-10 [&_[data-rmiz-btn-zoom]]:touch-manipulation [&_[data-rmiz-btn-zoom]]:appearance-none [&_[data-rmiz-btn-zoom]]:rounded-[50%] [&_[data-rmiz-btn-zoom]]:border-none [&_[data-rmiz-btn-zoom]]:bg-foreground/70 [&_[data-rmiz-btn-zoom]]:p-2 [&_[data-rmiz-btn-zoom]]:text-background [&_[data-rmiz-btn-zoom]]:outline-offset-2",
                "[&_[data-rmiz-btn-unzoom]]:m-0 [&_[data-rmiz-btn-unzoom]]:size-10 [&_[data-rmiz-btn-unzoom]]:touch-manipulation [&_[data-rmiz-btn-unzoom]]:appearance-none [&_[data-rmiz-btn-unzoom]]:rounded-[50%] [&_[data-rmiz-btn-unzoom]]:border-none [&_[data-rmiz-btn-unzoom]]:bg-foreground/70 [&_[data-rmiz-btn-unzoom]]:p-2 [&_[data-rmiz-btn-unzoom]]:text-background [&_[data-rmiz-btn-unzoom]]:outline-offset-2",
                "[&_[data-rmiz-btn-zoom]:not(:focus):not(:active)]:pointer-events-none [&_[data-rmiz-btn-zoom]:not(:focus):not(:active)]:absolute [&_[data-rmiz-btn-zoom]:not(:focus):not(:active)]:size-px [&_[data-rmiz-btn-zoom]:not(:focus):not(:active)]:overflow-hidden [&_[data-rmiz-btn-zoom]:not(:focus):not(:active)]:whitespace-nowrap [&_[data-rmiz-btn-zoom]:not(:focus):not(:active)]:[clip-path:inset(50%)] [&_[data-rmiz-btn-zoom]:not(:focus):not(:active)]:[clip:rect(0_0_0_0)]",
                "[&_[data-rmiz-btn-zoom]]:absolute [&_[data-rmiz-btn-zoom]]:top-2.5 [&_[data-rmiz-btn-zoom]]:right-2.5 [&_[data-rmiz-btn-zoom]]:bottom-auto [&_[data-rmiz-btn-zoom]]:left-auto [&_[data-rmiz-btn-zoom]]:cursor-zoom-in",
                "[&_[data-rmiz-btn-unzoom]]:absolute [&_[data-rmiz-btn-unzoom]]:top-5 [&_[data-rmiz-btn-unzoom]]:right-5 [&_[data-rmiz-btn-unzoom]]:bottom-auto [&_[data-rmiz-btn-unzoom]]:left-auto [&_[data-rmiz-btn-unzoom]]:z-[1] [&_[data-rmiz-btn-unzoom]]:cursor-zoom-out",
                '[&_[data-rmiz-content="found"]_img]:cursor-zoom-in',
                '[&_[data-rmiz-content="found"]_svg]:cursor-zoom-in',
                '[&_[data-rmiz-content="found"]_[role="img"]]:cursor-zoom-in',
                '[&_[data-rmiz-content="found"]_[data-zoom]]:cursor-zoom-in',
                className
            )}
        >
            <Zoom
                classDialog={cn(
                    "[&::backdrop]:hidden",
                    "[&[open]]:fixed [&[open]]:m-0 [&[open]]:h-dvh [&[open]]:max-h-none [&[open]]:w-dvw [&[open]]:max-w-none [&[open]]:overflow-hidden [&[open]]:border-0 [&[open]]:bg-transparent [&[open]]:p-0",
                    "[&_[data-rmiz-modal-overlay]]:absolute [&_[data-rmiz-modal-overlay]]:inset-0 [&_[data-rmiz-modal-overlay]]:transition-all",
                    '[&_[data-rmiz-modal-overlay="hidden"]]:bg-transparent',
                    "[&_[data-rmiz-modal-content]]:relative [&_[data-rmiz-modal-content]]:size-full",
                    "[&_[data-rmiz-modal-img]]:absolute [&_[data-rmiz-modal-img]]:select-none [&_[data-rmiz-modal-img]]:origin-top-left [&_[data-rmiz-modal-img]]:cursor-zoom-out [&_[data-rmiz-modal-img]]:transition-transform",
                    "motion-reduce:[&_[data-rmiz-modal-img]]:transition-none motion-reduce:[&_[data-rmiz-modal-overlay]]:transition-none",
                    backdropClassName
                )}
                ZoomContent={({ img, buttonUnzoom, modalState }) => {
                    const isVisible = modalState === 'LOADED' || modalState === 'LOADING';
                    const overlayRef = useRef<HTMLDivElement>(null);
                    const imgRef = useRef<HTMLImageElement | null>(null);
                    const containerRef = useRef<HTMLDivElement>(null);
                    const [bgColor, setBgColor] = useState<'black' | 'white'>(bgColorRef.current);
                    const [zoom, setZoom] = useState(1);
                    const [isOpen, setIsOpen] = useState(false);
                    const [pan, setPan] = useState({ x: 0, y: 0 });
                    const [isDragging, setIsDragging] = useState(false);
                    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

                    const handleClose = () => {
                        // Find the unzoom button within this specific overlay
                        const btn = overlayRef.current?.querySelector('[data-rmiz-btn-unzoom]') as HTMLButtonElement;
                        btn?.click();
                    };

                    // Detect background when image is loaded in zoom view
                    useEffect(() => {
                        if (isVisible && modalState === 'LOADED') {
                            const imgElement = overlayRef.current?.querySelector('img[data-rmiz-modal-img]') as HTMLImageElement;
                            if (imgElement) {
                                imgRef.current = imgElement;
                                // Disable native drag to prevent glitches during pan
                                imgElement.draggable = false;
                                imgElement.style.userSelect = 'none';
                                detectImageBrightness(imgElement).then((detected) => {
                                    bgColorRef.current = detected;
                                    setBgColor(detected);
                                });
                            }
                        }
                    }, [isVisible, modalState]);

                    // Update transform
                    const updateTransform = (newZoom: number, newPan: { x: number, y: number }, disableTransition = false) => {
                        if (imgRef.current) {
                            // Disable transitions during drag for smooth performance
                            if (disableTransition) {
                                imgRef.current.style.transition = 'none';
                            } else {
                                imgRef.current.style.transition = '';
                            }
                            imgRef.current.style.transform = `translate(${newPan.x}px, ${newPan.y}px) scale(${newZoom})`;
                            imgRef.current.style.transformOrigin = 'center';
                        }
                    };

                    // Handle wheel zoom (zoom towards cursor)
                    useEffect(() => {
                        if (!isVisible || !imgRef.current || !containerRef.current) return;

                        const handleWheel = (e: WheelEvent) => {
                            e.preventDefault();

                            const delta = e.deltaY > 0 ? -0.1 : 0.1;

                            setZoom(prev => {
                                const newZoom = Math.max(0.5, Math.min(5, prev + delta));

                                // Zoom towards cursor position
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
                    }, [isVisible]);

                    // Handle pan/drag
                    useEffect(() => {
                        if (!isVisible || !containerRef.current) return;

                        const handleMouseDown = (e: MouseEvent) => {
                            if (zoom > 1) {
                                // Disable transitions immediately when starting drag
                                if (imgRef.current) {
                                    imgRef.current.style.transition = 'none';
                                }
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
                                updateTransform(zoom, newPan, true); // Disable transition during drag
                            }
                        };

                        const handleMouseUp = () => {
                            if (isDragging && imgRef.current) {
                                // Re-enable transitions after drag
                                imgRef.current.style.transition = '';
                            }
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
                    }, [isVisible, isDragging, dragStart, pan, zoom]);

                    // Close dropdown when clicking outside
                    useEffect(() => {
                        if (!isOpen) return;

                        const handleClick = () => setIsOpen(false);
                        document.addEventListener('click', handleClick);
                        return () => document.removeEventListener('click', handleClick);
                    }, [isOpen]);

                    return (
                        <div
                            ref={overlayRef}
                            data-rmiz-modal-overlay={isVisible ? 'visible' : 'hidden'}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                transition: 'background-color 0.2s',
                                backgroundColor: isVisible ? bgColor : 'transparent',
                                cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-out'
                            }}
                            onClick={(e) => {
                                // Click on overlay closes zoom (only if not dragging)
                                if (e.target === e.currentTarget && !isDragging) {
                                    handleClose();
                                }
                            }}
                        >
                            <div
                                ref={containerRef}
                                data-rmiz-modal-content
                                style={{ position: 'relative', width: '100%', height: '100%' }}
                            >
                                {img}
                                {buttonUnzoom}

                                {isVisible && (
                                    <>
                                        {/* Zoom control dropdown */}
                                        <div className="absolute top-5 left-5 z-[2] flex items-center gap-2">
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsOpen(!isOpen);
                                                    }}
                                                    className="px-3 py-1.5 rounded-md bg-black/70 text-white text-sm font-medium hover:bg-black/80 transition-colors flex items-center gap-1"
                                                >
                                                    {Math.round(zoom * 100)}%
                                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-70">
                                                        <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </button>

                                                {isOpen && (
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
                                                                    setIsOpen(false);
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
                                        </div>

                                        {/* Controls */}
                                        <div className="absolute top-5 right-5 flex gap-2 items-center z-[2]">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setBgColor('black');
                                                }}
                                                className={cn(
                                                    "size-12 sm:size-8 rounded-md bg-black cursor-pointer transition-all",
                                                    bgColor === 'black'
                                                        ? "border-[2px] border-white"
                                                        : "border-2 border-white/50"
                                                )}
                                                aria-label="Black background"
                                            />
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setBgColor('white');
                                                }}
                                                className={cn(
                                                    "size-12 sm:size-8 rounded-md bg-white cursor-pointer transition-all",
                                                    bgColor === 'white'
                                                        ? "border-[2px] border-black"
                                                        : "border-2 border-black/30"
                                                )}
                                                aria-label="White background"
                                            />
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleClose();
                                                }}
                                                className="size-12 sm:size-8 rounded-full border-2 border-white/50 bg-black/50 cursor-pointer transition-all flex items-center justify-center text-white text-xl font-bold"
                                                aria-label="Close"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                }}
                {...props}
            />
        </div>
    );
};