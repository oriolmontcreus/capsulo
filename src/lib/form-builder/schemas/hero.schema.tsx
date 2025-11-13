import { Input, Select, Textarea, Switch } from '../fields';
import { Tabs, Tab } from '../layouts';
import { createSchema } from '../builders/SchemaBuilder';
import { SendIcon } from 'lucide-react';
import { AVAILABLE_PAGES } from '../fields/Select/pages';

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
          .internalLinks(AVAILABLE_PAGES, true, true) // auto-resolve + grouped
          .searchable(true)
          .defaultValue('/'),

        // External URL input
        Input('ctaExternalLink')
          .label('External URL')
          .description('Enter the full URL (e.g., https://example.com)')
          .placeholder('https://example.com')
          .defaultValue(''),

        Switch('ctaNewTab')
          .label('Open in new tab')
          .description('When enabled, the CTA link will open in a new browser tab')
          .defaultValue(false)
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

