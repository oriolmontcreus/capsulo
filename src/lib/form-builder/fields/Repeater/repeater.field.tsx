import React from 'react';
import type { RepeaterField as RepeaterFieldType } from './repeater.types';
import { CardVariant } from './variants/card';
import { TableVariant } from './variants/table';

// Generate a unique ID for repeater items
const generateItemId = (): string => {
    // Prefer crypto.randomUUID() if available (modern browsers and Node.js 16.7.0+)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return `item_${crypto.randomUUID()}`;
    }
    
    // Fallback: use Date.now() + cryptographically strong random component
    const timestamp = Date.now();
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    
    // Convert bytes to hex string
    const hexString = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    
    return `item_${timestamp}_${hexString}`;
};

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface RepeaterFieldProps {
    field: RepeaterFieldType;
    value: any[];
    onChange: (value: any[]) => void;
    error?: string;
    fieldErrors?: Record<string, string>;
    fieldPath?: string;
    componentData?: ComponentData;
    formData?: Record<string, any>;
}

export const RepeaterField: React.FC<RepeaterFieldProps> = ({
    field,
    value = [],
    onChange,
    error,
    fieldErrors,
    fieldPath,
    componentData,
    formData,
}) => {
    // Select variant component based on field configuration
    const variant = field.variant || 'card';

    switch (variant) {
        case 'table':
            return (
                <TableVariant
                    field={field}
                    value={value}
                    onChange={onChange}
                    error={error}
                    fieldErrors={fieldErrors}
                    fieldPath={fieldPath}
                    componentData={componentData}
                    formData={formData}
                    generateItemId={generateItemId}
                />
            );
        case 'card':
        default:
            return (
                <CardVariant
                    field={field}
                    value={value}
                    onChange={onChange}
                    error={error}
                    fieldErrors={fieldErrors}
                    fieldPath={fieldPath}
                    componentData={componentData}
                    formData={formData}
                    generateItemId={generateItemId}
                />
            );
    }
};
