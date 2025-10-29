'use client';

import React, { useMemo, useEffect, useState } from 'react';
import type { PlateStaticProps } from 'platejs/static';
import { createStaticEditor, serializeHtml } from 'platejs/static';
import { cn } from '@/lib/utils';

// Import all the base kits needed for HTML serialization
import { BaseBasicMarksKit } from '@/components/basic-marks-base-kit';
import { BaseBasicBlocksKit } from '@/components/basic-blocks-base-kit';
import { BaseLinkKit } from '@/components/link-base-kit';
import { BaseMediaKit } from '@/components/media-base-kit';
import { BaseListKit } from '@/components/list-base-kit';
import { BaseCalloutKit } from '@/components/callout-base-kit';
import { BaseCodeBlockKit } from '@/components/code-block-base-kit';
import { BaseTableKit } from '@/components/table-base-kit';
import { BaseMentionKit } from '@/components/mention-base-kit';
import { BaseColumnKit } from '@/components/column-base-kit';
import { BaseToggleKit } from '@/components/toggle-base-kit';
import { BaseMathKit } from '@/components/math-base-kit';
import { BaseDateKit } from '@/components/date-base-kit';
import { BaseTocKit } from '@/components/toc-base-kit';
import { BaseFontKit } from '@/components/font-base-kit';
import { BaseAlignKit } from '@/components/align-base-kit';
import { BaseLineHeightKit } from '@/components/line-height-base-kit';
import { BaseIndentKit } from '@/components/indent-base-kit';

interface RichEditorRendererProps {
    /**
     * The rich text content to render (PlateJS value format)
     */
    value?: PlateStaticProps['value'];

    /**
     * Additional CSS classes
     */
    className?: string;
}

/**
 * Renders rich text content from the RichEditor field as clean HTML
 * This serializes PlateJS nodes to HTML for displaying CMS content on your website
 * 
 * @example
 * ```tsx
 * <RichEditorRenderer value={heroData.description} />
 * ```
 */
export const RichEditorRenderer: React.FC<RichEditorRendererProps> = ({
    value,
    className,
}) => {
    const [html, setHtml] = useState<string>('');

    // Collect all plugins needed for HTML serialization
    const plugins = useMemo(() => [
        ...BaseBasicMarksKit,
        ...BaseBasicBlocksKit,
        ...BaseLinkKit,
        ...BaseMediaKit,
        ...BaseListKit,
        ...BaseCalloutKit,
        ...BaseCodeBlockKit,
        ...BaseTableKit,
        ...BaseMentionKit,
        ...BaseColumnKit,
        ...BaseToggleKit,
        ...BaseMathKit,
        ...BaseDateKit,
        ...BaseTocKit,
        ...BaseFontKit,
        ...BaseAlignKit,
        ...BaseLineHeightKit,
        ...BaseIndentKit,
    ], []);

    // Create a static editor instance with all plugins
    const editor = useMemo(() => createStaticEditor({ plugins }), [plugins]);

    // Serialize to HTML when value changes
    useEffect(() => {
        if (!value) {
            setHtml('');
            return;
        }

        // Extract content from RichEditor value if it's wrapped in {content: [...], discussions: [...]}
        const content = typeof value === 'object' && 'content' in value && Array.isArray(value.content)
            ? value.content
            : Array.isArray(value)
                ? value
                : [];

        // If no content, don't render
        if (content.length === 0) {
            setHtml('');
            return;
        }

        // Set the editor's children to our content
        editor.children = content;

        // Serialize the PlateJS nodes to HTML
        serializeHtml(editor, {
            stripClassNames: true, // Remove Slate-specific classes for clean HTML
            stripDataAttributes: true, // Remove data-* attributes for SEO-friendly output
        }).then((htmlString) => {
            setHtml(htmlString);
        });
    }, [value, editor]);

    // If no content, render nothing
    if (!html) {
        return null;
    }

    // Render the HTML
    return (
        <div
            className={cn('rich-editor-content', className)}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
};

export default RichEditorRenderer;
