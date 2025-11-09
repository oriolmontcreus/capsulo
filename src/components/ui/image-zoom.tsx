"use client";

import { useState, useRef } from "react";
import Zoom, {
    type ControlledProps,
    type UncontrolledProps,
} from "react-medium-image-zoom";
import { cn } from "@/lib/utils";

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
    const [bgColor, setBgColor] = useState<'black' | 'white'>('black');

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
                    "[&_[data-rmiz-modal-img]]:absolute [&_[data-rmiz-modal-img]]:origin-top-left [&_[data-rmiz-modal-img]]:cursor-zoom-out [&_[data-rmiz-modal-img]]:transition-transform",
                    "motion-reduce:[&_[data-rmiz-modal-img]]:transition-none motion-reduce:[&_[data-rmiz-modal-overlay]]:transition-none",
                    backdropClassName
                )}
                ZoomContent={({ img, buttonUnzoom, modalState }) => {
                    const isVisible = modalState === 'LOADED' || modalState === 'LOADING';
                    const overlayRef = useRef<HTMLDivElement>(null);

                    const handleClose = () => {
                        // Find the unzoom button within this specific overlay
                        const btn = overlayRef.current?.querySelector('[data-rmiz-btn-unzoom]') as HTMLButtonElement;
                        btn?.click();
                    };

                    return (
                        <div
                            ref={overlayRef}
                            data-rmiz-modal-overlay={isVisible ? 'visible' : 'hidden'}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                transition: 'background-color 0.2s',
                                backgroundColor: isVisible ? bgColor : 'transparent',
                                cursor: 'zoom-out'
                            }}
                            onClick={(e) => {
                                // Click on overlay closes zoom
                                if (e.target === e.currentTarget) {
                                    handleClose();
                                }
                            }}
                        >
                            <div
                                data-rmiz-modal-content
                                style={{ position: 'relative', width: '100%', height: '100%' }}
                            >
                                {img}
                                {buttonUnzoom}

                                {isVisible && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '20px',
                                        right: '20px',
                                        display: 'flex',
                                        gap: '8px',
                                        alignItems: 'center',
                                        zIndex: 2
                                    }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setBgColor('black');
                                            }}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                border: bgColor === 'black' ? '3px solid white' : '2px solid rgba(255,255,255,0.5)',
                                                backgroundColor: 'black',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            aria-label="Black background"
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setBgColor('white');
                                            }}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                border: bgColor === 'white' ? '3px solid black' : '2px solid rgba(0,0,0,0.3)',
                                                backgroundColor: 'white',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            aria-label="White background"
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleClose();
                                            }}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                border: '2px solid rgba(255,255,255,0.5)',
                                                backgroundColor: 'rgba(0,0,0,0.5)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: '20px',
                                                fontWeight: 'bold'
                                            }}
                                            aria-label="Close"
                                        >
                                            ×
                                        </button>
                                    </div>
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