import React, { useState, useEffect } from 'react';
import type { TabsLayout } from '../tabs.types';
import { DefaultTabsVariant } from './default';
import { FieldRenderer } from '../../../core/FieldRenderer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface VerticalTabsVariantProps {
    field: TabsLayout;
    value: any;
    onChange: (value: any) => void;
    fieldErrors?: Record<string, string>;
}

export const VerticalTabsVariant: React.FC<VerticalTabsVariantProps> = ({
    field,
    value,
    onChange,
    fieldErrors
}) => {
    const [isMobile, setIsMobile] = useState(false);

    // Check if we're on mobile (< 640px, which is the 'sm' breakpoint)
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Render default variant on mobile
    if (isMobile) {
        return (
            <DefaultTabsVariant
                field={field}
                value={value}
                onChange={onChange}
                fieldErrors={fieldErrors}
            />
        );
    }

    // Generate unique ID for default tab (first tab)
    const defaultTab = field.tabs.length > 0 ? `tab-0` : undefined;

    return (
        <Tabs
            defaultValue={defaultTab}
            orientation="vertical"
            className={cn("w-full flex-row", field.className)}
        >
            <TabsList className="flex-col gap-1 rounded-none bg-transparent px-1 py-0 text-foreground">
                {field.tabs.map((tab, index) => (
                    <TabsTrigger
                        key={`tab-${index}`}
                        value={`tab-${index}`}
                        className="relative w-full justify-start after:absolute after:inset-y-0 after:start-0 after:-ms-1 after:w-0.5 hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary data-[state=active]:hover:bg-accent rounded-s-none"
                    >
                        {tab.prefix && (
                            <span className="-ms-0.5 me-1.5 opacity-60 inline-flex shrink-0">
                                {tab.prefix}
                            </span>
                        )}
                        <span>{tab.label}</span>
                        {tab.suffix && (
                            <span className="ms-1.5 opacity-60 inline-flex shrink-0">
                                {tab.suffix}
                            </span>
                        )}
                    </TabsTrigger>
                ))}
            </TabsList>

            <div className="grow rounded-md border text-start -mt-[13px]">
                {field.tabs.map((tab, tabIndex) => (
                    <TabsContent
                        key={`tab-content-${tabIndex}`}
                        value={`tab-${tabIndex}`}
                        className="flex flex-col gap-7 px-4 py-3"
                    >
                        {tab.fields.map((childField, fieldIndex) => {
                            // Only data fields have names, not layouts
                            const fieldName = 'name' in childField ? childField.name : `tab-${tabIndex}-field-${fieldIndex}`;
                            const nestedValue = value?.[fieldName];
                            const nestedError = fieldErrors && 'name' in childField ? fieldErrors[childField.name] : undefined;

                            const handleNestedChange = (newValue: any) => {
                                onChange({
                                    ...value,
                                    [fieldName]: newValue
                                });
                            };

                            return (
                                <FieldRenderer
                                    key={fieldName}
                                    field={childField}
                                    value={nestedValue}
                                    onChange={handleNestedChange}
                                    error={nestedError}
                                    fieldErrors={fieldErrors}
                                />
                            );
                        })}
                    </TabsContent>
                ))}
            </div>
        </Tabs>
    );
};
