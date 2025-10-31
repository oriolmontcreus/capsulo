import React from 'react';
import type { ResponsiveColumns } from '../select.types';

/**
 * Styling and responsive utilities for Select component
 */

export const useResponsiveStyles = (field: any) => {
    // Generate unique ID for responsive styles
    const selectId = React.useId();

    // Helper to check if columns are configured (either number > 1 or responsive object)
    const hasMultipleColumns = () => {
        if (!field.columns) return false;
        if (typeof field.columns === 'number') return field.columns > 1;
        // For responsive, return true if it's an object (we'll handle the logic in CSS)
        return typeof field.columns === 'object';
    };

    // Generate responsive CSS for columns
    const generateResponsiveStyles = () => {
        if (!field.columns || typeof field.columns === 'number') return '';

        const responsive = field.columns as ResponsiveColumns;
        let css = '';

        // Always set base grid properties first
        css += `
      [data-select-id="${selectId}"] {
        display: grid !important;
        gap: 0.25rem !important;
        padding: 0.25rem !important;
        width: 100% !important;
      }
    `;

        // Base (mobile-first) - default to 1 column if not specified
        const baseCols = responsive.base || 1;
        css += `
      [data-select-id="${selectId}"] {
        grid-template-columns: repeat(${baseCols}, 1fr) !important;
      }
    `;

        // Responsive breakpoints
        if (responsive.sm !== undefined) {
            css += `
        @media (min-width: 640px) {
          [data-select-id="${selectId}"] {
            grid-template-columns: repeat(${responsive.sm}, 1fr) !important;
          }
        }
      `;
        }
        if (responsive.md !== undefined) {
            css += `
        @media (min-width: 768px) {
          [data-select-id="${selectId}"] {
            grid-template-columns: repeat(${responsive.md}, 1fr) !important;
          }
        }
      `;
        }
        if (responsive.lg !== undefined) {
            css += `
        @media (min-width: 1024px) {
          [data-select-id="${selectId}"] {
            grid-template-columns: repeat(${responsive.lg}, 1fr) !important;
          }
        }
      `;
        }
        if (responsive.xl !== undefined) {
            css += `
        @media (min-width: 1280px) {
          [data-select-id="${selectId}"] {
            grid-template-columns: repeat(${responsive.xl}, 1fr) !important;
          }
        }
      `;
        }

        return css;
    };

    // Get base grid styles for simple number columns
    const getBaseGridStyles = () => {
        if (!hasMultipleColumns()) return {};

        if (typeof field.columns === 'number') {
            return {
                display: 'grid',
                gridTemplateColumns: `repeat(${field.columns}, 1fr)`,
                gap: '0.25rem',
                padding: '0.25rem',
                width: '100%'
            };
        }

        // For responsive, don't return inline styles - let CSS handle it
        return {};
    };

    return {
        selectId,
        hasMultipleColumns,
        generateResponsiveStyles,
        getBaseGridStyles
    };
};