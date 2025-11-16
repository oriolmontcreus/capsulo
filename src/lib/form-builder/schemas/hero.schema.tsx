import { Input, Select, Textarea, Switch, RichEditor, FileUpload } from '../fields';
import { Tabs, Tab } from '../layouts';
import { createSchema } from '../builders/SchemaBuilder';
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
          .placeholder('Enter the main title')
          .defaultValue('Welcome to Capsulo'),

        Textarea('subtitle')
          .label('Subtitle')
          .description('Supporting text that provides more context about your offering')
          .rows(3)
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
            { label: 'Internal', value: 'internal' },
            { label: 'External', value: 'external' },
          ])
          .defaultValue('internal'),

        Input('ctaLink')
          .label('CTA link URL')
          .description('The URL where the button should link to')
          .placeholder('/admin')
          .defaultValue('/admin'),

        Switch('ctaNewTab')
          .label('Open in new tab')
          .description('When enabled, the CTA link will open in a new browser tab')
          .defaultValue(false)
      ], { prefix: <SendIcon size={16} /> }),
    FileUpload('testupload')
      .label('Test Upload')
      .description('Upload various file types to test the format display')
      .accept('image/jpeg,image/png,image/gif,image/svg+xml,image/webp,application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,application/x-rar-compressed,video/mp4,video/quicktime,video/x-msvideo,audio/mpeg,audio/wav,audio/ogg,.mp3')
      .maxSize(10 * 1024 * 1024) // 10MB
      .maxFiles(5)
      .variant('grid')
      .multiple(true)
  ],
  'Main hero section with title, subtitle, and CTA button',
  'hero' // Unique key for CMS injection
);

