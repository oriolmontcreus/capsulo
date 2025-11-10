import { RichEditor } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

export const RichEditorShowcaseSchema = createSchema(
    'RichEditorShowcase',
    [
        RichEditor('content')
            .label('Content')
            .description('A full-featured rich text editor with all capabilities enabled')
            .placeholder('Start typing or press / for commands...')
            .required(true),
    ],
    'Showcase of the rich text editor capabilities',
    'rich-editor-showcase'
);
