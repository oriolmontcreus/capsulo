'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PerformanceMetrics {
    fps: number;
    renderTime: number;
    memoryUsage?: number;
    slowComponents: Array<{
        name: string;
        duration: number;
        count: number;
    }>;
}

interface RenderTiming {
    id: string;
    phase: string;
    actualDuration: number;
    baseDuration: number;
    startTime: number;
    commitTime: number;
}

export const PerformanceMonitor: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [metrics, setMetrics] = useState<PerformanceMetrics>({
        fps: 60,
        renderTime: 0,
        slowComponents: [],
    });
    const [isVisible, setIsVisible] = useState(false);
    const frameCountRef = useRef(0);
    const lastTimeRef = useRef(performance.now());
    const renderTimingsRef = useRef<Map<string, RenderTiming[]>>(new Map());
    const fpsIntervalRef = useRef<number | undefined>(undefined);
    const metricsUpdateScheduledRef = useRef(false);

    // FPS Calculator (like Minecraft TPS)
    const calculateFPS = useCallback(() => {
        const now = performance.now();
        const delta = now - lastTimeRef.current;

        if (delta >= 1000) {
            const fps = Math.round((frameCountRef.current * 1000) / delta);
            frameCountRef.current = 0;
            lastTimeRef.current = now;

            setMetrics(prev => ({ ...prev, fps }));
        }

        frameCountRef.current++;
        fpsIntervalRef.current = requestAnimationFrame(calculateFPS);
    }, []);

    useEffect(() => {
        if (isVisible) {
            fpsIntervalRef.current = requestAnimationFrame(calculateFPS);
        }

        return () => {
            if (fpsIntervalRef.current) {
                cancelAnimationFrame(fpsIntervalRef.current);
            }
        };
    }, [isVisible, calculateFPS]);

    // Memory usage (if available)
    useEffect(() => {
        if (!isVisible) return;

        const updateMemory = () => {
            if ('memory' in performance && (performance as any).memory) {
                const memory = (performance as any).memory;
                const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
                setMetrics(prev => ({ ...prev, memoryUsage: usedMB }));
            }
        };

        const interval = setInterval(updateMemory, 1000);
        return () => clearInterval(interval);
    }, [isVisible]);

    // Profiler callback to track component render times
    const onRenderCallback = useCallback(
        (
            id: string,
            phase: 'mount' | 'update' | 'nested-update',
            actualDuration: number,
            baseDuration: number,
            startTime: number,
            commitTime: number
        ) => {
            if (!isVisible) return;

            const timing: RenderTiming = {
                id,
                phase,
                actualDuration,
                baseDuration,
                startTime,
                commitTime,
            };

            const timings = renderTimingsRef.current.get(id) || [];
            timings.push(timing);

            // Keep only last 10 renders per component
            if (timings.length > 10) {
                timings.shift();
            }

            renderTimingsRef.current.set(id, timings);

            // Schedule metrics update (debounced to prevent infinite loops)
            if (!metricsUpdateScheduledRef.current) {
                metricsUpdateScheduledRef.current = true;

                // Use setTimeout to batch updates and break the render cycle
                setTimeout(() => {
                    // Update slow components (components taking > 16ms to render = below 60fps)
                    const slowThreshold = 16;
                    const componentTimings = Array.from(renderTimingsRef.current.entries())
                        .map(([name, timings]) => ({
                            name,
                            duration: timings.reduce((sum, t) => sum + t.actualDuration, 0) / timings.length,
                            count: timings.length,
                        }))
                        .filter(c => c.duration > slowThreshold)
                        .sort((a, b) => b.duration - a.duration)
                        .slice(0, 5);

                    const avgRenderTime =
                        Array.from(renderTimingsRef.current.values())
                            .flat()
                            .reduce((sum, t) => sum + t.actualDuration, 0) /
                        Array.from(renderTimingsRef.current.values()).flat().length;

                    setMetrics(prev => ({
                        ...prev,
                        renderTime: avgRenderTime,
                        slowComponents: componentTimings,
                    }));

                    metricsUpdateScheduledRef.current = false;
                }, 100); // Update every 100ms at most
            }
        },
        [isVisible]
    );

    // Performance status (like Minecraft TPS colors)
    const getPerformanceStatus = (fps: number) => {
        if (fps >= 55) return { color: 'text-green-500', status: 'Excellent', bg: 'bg-green-500/10' };
        if (fps >= 45) return { color: 'text-yellow-500', status: 'Good', bg: 'bg-yellow-500/10' };
        if (fps >= 30) return { color: 'text-orange-500', status: 'Fair', bg: 'bg-orange-500/10' };
        return { color: 'text-red-500', status: 'Poor', bg: 'bg-red-500/10' };
    };

    const status = getPerformanceStatus(metrics.fps);

    // Keyboard shortcut to toggle (Shift + P)
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.shiftKey && e.key === 'P') {
                setIsVisible(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    return (
        <React.Profiler id="CMSApp" onRender={onRenderCallback}>
            {children}

            {isVisible && (
                <Card className="fixed bottom-4 right-4 z-50 p-4 w-96 shadow-lg bg-background/95 backdrop-blur">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">Performance Monitor</h3>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsVisible(false)}
                            >
                                ×
                            </Button>
                        </div>

                        {/* FPS Display (like Minecraft TPS) */}
                        <div className={`p-3 rounded-lg ${status.bg}`}>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">FPS</span>
                                <span className={`text-2xl font-bold ${status.color}`}>
                                    {metrics.fps}
                                </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Status: <span className={status.color}>{status.status}</span>
                            </div>
                        </div>

                        {/* Average Render Time */}
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Avg Render Time</span>
                            <span className="font-mono">
                                {metrics.renderTime.toFixed(2)}ms
                            </span>
                        </div>

                        {/* Memory Usage */}
                        {metrics.memoryUsage !== undefined && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Memory Usage</span>
                                <span className="font-mono">{metrics.memoryUsage}MB</span>
                            </div>
                        )}

                        {/* Slow Components */}
                        {metrics.slowComponents.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-muted-foreground">
                                    Slow Components (&gt;16ms)
                                </h4>
                                <div className="space-y-1">
                                    {metrics.slowComponents.map((comp, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between text-xs p-2 rounded bg-orange-500/10"
                                        >
                                            <span className="font-mono truncate flex-1">
                                                {comp.name}
                                            </span>
                                            <span className="font-mono text-orange-500 ml-2">
                                                {comp.duration.toFixed(1)}ms
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="text-xs text-muted-foreground border-t pt-2">
                            Press <kbd className="px-1 py-0.5 bg-muted rounded">Shift</kbd> +{' '}
                            <kbd className="px-1 py-0.5 bg-muted rounded">P</kbd> to toggle
                        </div>
                    </div>
                </Card>
            )}
        </React.Profiler>
    );
};

// Hook to detect expensive re-renders
export const useRenderTracking = (componentName: string) => {
    const renderCount = useRef(0);
    const lastRenderTime = useRef(performance.now());

    useEffect(() => {
        renderCount.current++;
        const now = performance.now();
        const timeSinceLastRender = now - lastRenderTime.current;

        if (timeSinceLastRender < 16 && renderCount.current > 1) {
            console.warn(
                `⚠️ ${componentName} rendered ${renderCount.current} times in ${timeSinceLastRender.toFixed(2)}ms - possible performance issue`
            );
        }

        lastRenderTime.current = now;
    });

    return renderCount.current;
};

// Hook to detect expensive computations
export const useWhyDidYouUpdate = (name: string, props: Record<string, any>) => {
    const previousProps = useRef<Record<string, any> | undefined>(undefined);

    useEffect(() => {
        if (previousProps.current) {
            const allKeys = Object.keys({ ...previousProps.current, ...props });
            const changedProps: Record<string, { from: any; to: any }> = {};

            allKeys.forEach(key => {
                if (previousProps.current![key] !== props[key]) {
                    changedProps[key] = {
                        from: previousProps.current![key],
                        to: props[key],
                    };
                }
            });

            if (Object.keys(changedProps).length > 0) {
                console.log(`[${name}] Props changed:`, changedProps);
            }
        }

        previousProps.current = props;
    });
};
