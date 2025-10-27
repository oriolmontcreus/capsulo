'use client';

import React from 'react';
import {
    BaselineIcon,
    BoldIcon,
    Code2Icon,
    HighlighterIcon,
    ItalicIcon,
    ListIcon,
    ListOrderedIcon,
    StrikethroughIcon,
    UnderlineIcon,
    LinkIcon,
    ImageIcon,
    TableIcon,
    Heading1Icon,
    Heading2Icon,
    QuoteIcon,
} from 'lucide-react';
import { KEYS } from 'platejs';
import { useEditorReadOnly } from 'platejs/react';
import type { PluginFeature } from '@/lib/form-builder/fields/RichEditor/richeditor.plugins';

import { formatShortcut } from '@/lib/keyboard-utils';
import { useIsTouchDevice } from '@/hooks/use-is-touch-device';

import { MarkToolbarButton } from './mark-toolbar-button';
import { LinkToolbarButton } from './link-toolbar-button';
import { MediaToolbarButton } from './media-toolbar-button';
import { TableToolbarButton } from './table-toolbar-button';
import { FontColorToolbarButton } from './font-color-toolbar-button';
import { FontSizeToolbarButton } from './font-size-toolbar-button';
import { AlignToolbarButton } from './align-toolbar-button';
import { LineHeightToolbarButton } from './line-height-toolbar-button';
import {
    BulletedListToolbarButton,
    NumberedListToolbarButton,
    TodoListToolbarButton,
} from './list-toolbar-button';
import { TurnIntoToolbarButton } from './turn-into-toolbar-button';
import { ToolbarGroup } from './toolbar';

interface DynamicToolbarButtonsProps {
    enabledFeatures: PluginFeature[];
}

export function DynamicToolbarButtons({ enabledFeatures }: DynamicToolbarButtonsProps) {
    const readOnly = useEditorReadOnly();
    const isTouchDevice = useIsTouchDevice();

    // Create a Set for fast lookup
    const features = new Set(enabledFeatures);

    // Generate tooltips based on OS, but don't show on touch devices
    const getTooltip = (text: string) => {
        if (isTouchDevice) return undefined;
        return formatShortcut(text);
    };

    if (readOnly) return null;

    // Group buttons by category for better organization
    const markButtons: React.ReactNode[] = [];
    const blockButtons: React.ReactNode[] = [];
    const listButtons: React.ReactNode[] = [];
    const insertButtons: React.ReactNode[] = [];
    const formatButtons: React.ReactNode[] = [];

    // Basic Marks
    if (features.has('bold')) {
        markButtons.push(
            <MarkToolbarButton key="bold" nodeType={KEYS.bold} tooltip={getTooltip("Bold (⌘+B)")}>
                <BoldIcon />
            </MarkToolbarButton>
        );
    }

    if (features.has('italic')) {
        markButtons.push(
            <MarkToolbarButton key="italic" nodeType={KEYS.italic} tooltip={getTooltip("Italic (⌘+I)")}>
                <ItalicIcon />
            </MarkToolbarButton>
        );
    }

    if (features.has('underline')) {
        markButtons.push(
            <MarkToolbarButton key="underline" nodeType={KEYS.underline} tooltip={getTooltip("Underline (⌘+U)")}>
                <UnderlineIcon />
            </MarkToolbarButton>
        );
    }

    if (features.has('strikethrough')) {
        markButtons.push(
            <MarkToolbarButton key="strikethrough" nodeType={KEYS.strikethrough} tooltip={getTooltip("Strikethrough (⌘+⇧+M)")}>
                <StrikethroughIcon />
            </MarkToolbarButton>
        );
    }

    if (features.has('code')) {
        markButtons.push(
            <MarkToolbarButton key="code" nodeType={KEYS.code} tooltip={getTooltip("Code (⌘+E)")}>
                <Code2Icon />
            </MarkToolbarButton>
        );
    }

    if (features.has('highlight')) {
        markButtons.push(
            <MarkToolbarButton key="highlight" nodeType={KEYS.highlight} tooltip={isTouchDevice ? undefined : "Highlight"}>
                <HighlighterIcon />
            </MarkToolbarButton>
        );
    }

    // Font formatting
    if (features.has('fontColor')) {
        formatButtons.push(
            <FontColorToolbarButton key="fontColor" nodeType={KEYS.color} tooltip={isTouchDevice ? undefined : "Text color"}>
                <BaselineIcon />
            </FontColorToolbarButton>
        );
    }

    if (features.has('fontSize')) {
        formatButtons.push(<FontSizeToolbarButton key="fontSize" />);
    }

    if (features.has('align')) {
        formatButtons.push(<AlignToolbarButton key="align" />);
    }

    if (features.has('lineHeight')) {
        formatButtons.push(<LineHeightToolbarButton key="lineHeight" />);
    }

    // Block types (heading, paragraph, blockquote)
    if (features.has('heading') || features.has('paragraph') || features.has('blockquote') || features.has('codeBlock')) {
        blockButtons.push(<TurnIntoToolbarButton key="turnInto" />);
    }

    // Lists
    if (features.has('bulletList')) {
        listButtons.push(<BulletedListToolbarButton key="bulletList" />);
    }

    if (features.has('orderedList')) {
        listButtons.push(<NumberedListToolbarButton key="orderedList" />);
    }

    if (features.has('todoList')) {
        listButtons.push(<TodoListToolbarButton key="todoList" />);
    }

    // Insert buttons
    if (features.has('link')) {
        insertButtons.push(<LinkToolbarButton key="link" />);
    }

    if (features.has('image') || features.has('media')) {
        insertButtons.push(<MediaToolbarButton key="media" nodeType={KEYS.img} />);
    }

    if (features.has('table')) {
        insertButtons.push(<TableToolbarButton key="table" />);
    }

    return (
        <div className="flex w-full">
            {/* Format buttons (font, size, align, etc.) */}
            {formatButtons.length > 0 && <ToolbarGroup>{formatButtons}</ToolbarGroup>}

            {/* Block type buttons */}
            {blockButtons.length > 0 && <ToolbarGroup>{blockButtons}</ToolbarGroup>}

            {/* Mark buttons (bold, italic, etc.) */}
            {markButtons.length > 0 && <ToolbarGroup>{markButtons}</ToolbarGroup>}

            {/* List buttons */}
            {listButtons.length > 0 && <ToolbarGroup>{listButtons}</ToolbarGroup>}

            {/* Insert buttons (link, image, table) */}
            {insertButtons.length > 0 && <ToolbarGroup>{insertButtons}</ToolbarGroup>}
        </div>
    );
}
