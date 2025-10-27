'use client';

import { useState, useEffect } from 'react';
import type { PluginFeature } from './richeditor.plugins';
import { getEnabledFeatures, loadPluginKits } from './richeditor.plugins';

interface UseEditorPluginsOptions {
    features?: PluginFeature[];
    disableFeatures?: PluginFeature[];
    disableAllFeatures?: boolean;
    // Legacy support
    toolbarButtons?: PluginFeature[];
    disableToolbarButtons?: PluginFeature[];
    disableAllToolbarButtons?: boolean;
}

/**
 * Hook to dynamically load editor plugins based on configuration
 * Only loads the plugins that are needed, improving performance
 */
export function useEditorPlugins(options: UseEditorPluginsOptions = {}) {
    const [plugins, setPlugins] = useState<any[] | null>(null);
    const [enabledFeatures, setEnabledFeatures] = useState<PluginFeature[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadPlugins() {
            try {
                setIsLoading(true);
                setError(null);

                // Determine which features to enable
                const featuresToEnable = getEnabledFeatures(
                    options.features,
                    options.disableFeatures,
                    options.disableAllFeatures,
                    options.toolbarButtons,
                    options.disableToolbarButtons,
                    options.disableAllToolbarButtons
                );

                // Load the plugin kits
                const { plugins: loadedPlugins, enabledFeatures: features } = await loadPluginKits(featuresToEnable);

                if (!cancelled) {
                    setPlugins(loadedPlugins);
                    setEnabledFeatures(features);
                    setIsLoading(false);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err : new Error('Failed to load plugins'));
                    setIsLoading(false);
                }
            }
        }

        loadPlugins();

        return () => {
            cancelled = true;
        };
    }, [
        options.features,
        options.disableFeatures,
        options.disableAllFeatures,
        options.toolbarButtons,
        options.disableToolbarButtons,
        options.disableAllToolbarButtons,
    ]);

    return { plugins, enabledFeatures, isLoading, error };
}
