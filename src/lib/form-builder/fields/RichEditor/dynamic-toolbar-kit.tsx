'use client';

import { createPlatePlugin } from 'platejs/react';
import type { PluginFeature } from '@/lib/form-builder/fields/RichEditor/richeditor.plugins';

import { FixedToolbar } from '@/components/ui/fixed-toolbar';
import { FloatingToolbar } from '@/components/ui/floating-toolbar';
import { DynamicToolbarButtons } from '@/components/ui/dynamic-toolbar-buttons';

/**
 * Create a fixed toolbar kit with only the enabled features
 */
export function createDynamicFixedToolbarKit(enabledFeatures: PluginFeature[]) {
    return [
        createPlatePlugin({
            key: 'dynamic-fixed-toolbar',
            render: {
                beforeEditable: () => (
                    <FixedToolbar>
                        <DynamicToolbarButtons enabledFeatures={enabledFeatures} variant="fixed" />
                    </FixedToolbar>
                ),
            },
        }),
    ];
}

/**
 * Create a floating toolbar kit with only the enabled features
 * Floating toolbar only shows actions that modify selected text
 */
export function createDynamicFloatingToolbarKit(enabledFeatures: PluginFeature[]) {
    return [
        createPlatePlugin({
            key: 'dynamic-floating-toolbar',
            render: {
                afterEditable: () => (
                    <FloatingToolbar>
                        <DynamicToolbarButtons enabledFeatures={enabledFeatures} variant="floating" />
                    </FloatingToolbar>
                ),
            },
        }),
    ];
}