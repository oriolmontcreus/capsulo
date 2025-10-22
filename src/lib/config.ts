import capsuloConfig from '../../capsulo.config';

/**
 * Type-safe helper to check if a feature is enabled
 */
export const isFeatureEnabled = (feature: keyof typeof capsuloConfig.features): boolean => {
    return capsuloConfig.features[feature];
};

export { capsuloConfig };
