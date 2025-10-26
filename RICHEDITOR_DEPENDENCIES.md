# PlateJS Rich Editor - Installed Dependencies

This document lists all the npm packages that were installed when adding the PlateJS rich editor component to the Capsulo CMS.

**Last Updated:** After removing export/import and audio media features

## PlateJS Core & Plugins (24 packages)

### Core
- `platejs@^51.0.0` - Main PlateJS editor framework

### Plugins
- `@platejs/autoformat@^51.0.0` - Auto-formatting (e.g., markdown shortcuts)
- `@platejs/basic-nodes@^51.0.0` - Basic block nodes (paragraphs, headings)
- `@platejs/basic-styles@^51.0.0` - Text formatting (bold, italic, etc.)
- `@platejs/callout@^51.0.0` - Callout blocks
- `@platejs/caption@^51.0.0` - Image/media captions
- `@platejs/code-block@^51.0.0` - Code blocks with syntax highlighting
- `@platejs/combobox@^51.0.0` - Combobox UI component
- `@platejs/comment@^51.0.0` - Comments and discussion features
- `@platejs/date@^51.0.0` - Date picker functionality
- `@platejs/dnd@^51.0.0` - Drag and drop support
- `@platejs/emoji@^51.0.0` - Emoji picker
- `@platejs/excalidraw@^51.0.0` - Excalidraw diagram integration
- `@platejs/floating@^51.0.0` - Floating toolbar
- `@platejs/indent@^51.0.0` - Text indentation
- `@platejs/layout@^51.0.0` - Multi-column layouts
- `@platejs/link@^51.0.0` - Hyperlinks
- `@platejs/list@^51.0.0` - Bulleted and numbered lists
- `@platejs/math@^51.0.0` - Math equations (KaTeX)
- `@platejs/media@^51.0.0` - Image, video, file embeds
- `@platejs/mention@^51.0.0` - @mentions
- `@platejs/resizable@^51.0.0` - Resizable elements
- `@platejs/selection@^51.0.0` - Block selection
- `@platejs/slash-command@^51.0.0` - Slash commands menu
- `@platejs/suggestion@^51.0.0` - Track changes/suggestions
- `@platejs/table@^51.0.0` - Tables
- `@platejs/toc@^51.0.0` - Table of contents
- `@platejs/toggle@^51.0.0` - Toggle/collapsible blocks

## Radix UI Components (11 packages)

UI primitives used by PlateJS components:

- `@radix-ui/react-alert-dialog@^1.1.15`
- `@radix-ui/react-checkbox@^1.3.3`
- `@radix-ui/react-context-menu@^2.2.16`
- `@radix-ui/react-popover@^1.1.15`
- `@radix-ui/react-toolbar@^1.1.11`

## Additional UI Libraries (7 packages)

- `@ariakit/react@^0.4.19` - Accessible UI components
- `@emoji-mart/data@^1.2.1` - Emoji data for picker
- `cmdk@^1.1.1` - Command menu (Cmd+K style)
- `sonner@^2.0.7` - Toast notifications
- `react-day-picker@^9.11.1` - Date picker component
- `react-textarea-autosize@^8.5.9` - Auto-growing textarea
- `tailwind-scrollbar-hide@^4.0.0` - Hide scrollbars utility

## React Utilities (4 packages)

- `react-dnd@^16.0.1` - Drag and drop for React
- `react-dnd-html5-backend@^16.0.1` - HTML5 backend for react-dnd
- `react-lite-youtube-embed@^2.5.6` - YouTube embeds
- `react-player@^3.3.1` - Video player

**Note:** `react-player` was initially removed with audio features but reinstalled as it's required for video playback

## Social Media Embeds (1 package)

- `react-tweet@^3.2.2` - Twitter/X tweet embeds

## File Handling (3 packages)

- `@uploadthing/react@^7.3.3` - File upload component
- `uploadthing@^7.7.4` - File upload service
- `use-file-picker@^2.1.2` - File picker hook

## Document Processing (2 packages)

- `lowlight@^3.3.0` - Syntax highlighting
- `dedent@^1.0.0` - Template string indentation

## Utilities (5 packages)

- `@udecode/cn@^49.0.15` - Class name utilities
- `@faker-js/faker@^10.1.0` - Fake data generation
- `date-fns@^4.1.0` - Date utilities
- `lodash@^4.17.21` - Utility functions
- `zod@^3.25.76` - Schema validation

**Note:** `remark-gfm@^4.0.1` is still installed but as a dependency of Astro's MDX integration, not PlateJS

## Summary

**Total: 55 active dependencies** (62 originally installed, 7 removed)

### Breakdown:
- **PlateJS packages**: 21 (originally 24)
- **Radix UI components**: 11  
- **Additional UI**: 7
- **React utilities**: 4
- **File handling**: 3
- **Document processing**: 2 (originally 4)
- **Social media**: 1
- **General utilities**: 5 (originally 6)
- **Validation**: 1

## Removed Packages

The following packages were removed after initial installation:

### AI/Copilot Features (3 packages)
- ❌ `@ai-sdk/react` - AI SDK for React
- ❌ `@platejs/ai` - PlateJS AI plugin
- ❌ `ai` - Vercel AI SDK

### Export/Import Features (5 packages)
- ❌ `@platejs/docx` - Microsoft Word document import/export
- ❌ `@platejs/juice` - CSS inlining for email
- ❌ `@platejs/markdown` - Markdown import/export
- ❌ `html2canvas-pro` - HTML to canvas conversion
- ❌ `pdf-lib` - PDF generation/manipulation
- ❌ `remark-math` - Math in markdown

**Total Removed: 8 packages** (react-player was reinstalled for video support)

### Remaining Media Features:
- ✅ Images (upload and embed)
- ✅ Videos (embed with react-player)
- ✅ Files (upload and attach)
- ✅ Media Embeds (external media)
