import { Input, Select, Textarea, Switch } from '../../lib/form-builder/fields';
import { Tabs, Tab } from '../../lib/form-builder/layouts';
import { createSchema } from '../../lib/form-builder/builders/SchemaBuilder';
import { SendIcon } from 'lucide-react';

export const HeroSchema = createSchema(
    'Hero',
    [
        Tabs()
            .tab('Content', [
                Input('title')
                    .label('Hero title')
                    .description('The main headline that appears at the top of your page')
                    .required()
                    .translatable()
                    .placeholder('Enter the main title')
                    .defaultValue('Welcome to Capsulo'),

                Textarea('subtitle')
                    .label('Subtitle')
                    .description('Supporting text that provides more context about your offering')
                    .rows(3)
                    .translatable()
                    .placeholder('Supporting text')
                    .defaultValue('A content management system for developers'),
            ])
            .tab('Call to Action', [
                Input('ctaButton')
                    .label('CTA text')
                    .description('The text that appears on your call-to-action button')
                    .placeholder('Get Started')
                    .defaultValue('Get Started'),

                Select('ctaLinkType')
                    .label('CTA link type')
                    .description('Choose whether the button links to an internal page or external URL')
                    .options([
                        { label: 'Internal Page', value: 'internal' },
                        { label: 'External URL', value: 'external' },
                    ])
                    .defaultValue('internal'),

                // Internal page selector with auto-resolve locale
                Select('ctaInternalLink')
                    .label('Internal page')
                    .description('Select an internal page to link to (auto-resolves to current locale)')
                    .placeholder('Choose a page...')
                    .internalLinks(true, true) // auto-resolve + grouped
                    .searchable(true)
                    .defaultValue('/'),
            ], { prefix: <SendIcon size={16} /> }),
        Textarea('subtitle_test')
            .label('Subtitle but translatable')
            .description('Supporting text that provides more context about your offering')
            .rows(3)
            .translatable()
            .placeholder('Supporting text')
            .defaultValue('A content management system for developers'),
    ],
    'Main hero section with title, subtitle, and CTA button',
    'hero' // Unique key for CMS injection
);
