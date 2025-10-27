'use client';

import { createPlatePlugin } from 'platejs/react';
import type { PluginFeature } from '@/lib/form-builder/fields/RichEditor/richeditor.plugins';

import { FixedToolbar } from '@/components/ui/fixed-toolbar';
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
                        <DynamicToolbarButtons enabledFeatures={enabledFeatures} />
                    </FixedToolbar>
                ),
            },
        }),
    ];
}
