import {
  Input,
  Select,
  Textarea,
  DateField,
  Repeater,
  RichEditor,
  Switch,
  FileUpload,
  ColorPicker,
} from '@/lib/form-builder/fields';
import { Tabs, Tab, Grid } from '@/lib/form-builder/layouts';
import { createSchema } from '@/lib/form-builder/builders/SchemaBuilder';
import { SendIcon, Sparkles } from 'lucide-react';
import type { HeroSchemaData } from './hero.schema.d';

export const HeroSchema = createSchema(
  'Hero',
  [
    Tabs()
      .variant('vertical')
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

        ColorPicker('brandColor').label('Brand Color').presetColors(
          [
            '#ef4444', // red-500
            '#f59e0b', // amber-500
            '#eab308', // yellow-500
            '#10b981', // emerald-500
            '#3b82f6', // blue-500
            '#8b5cf6', // violet-500
            '#ec4899', // pink-500
            '#f97316', // orange-500
            '#14b8a6', // teal-500
            '#6366f1', // indigo-500
          ],
          false
        ),

        Input('email_test')
          .label('Test Email')
          .type('email')
          .placeholder('Enter a valid email')
          .defaultValue('test@example.com'),

        RichEditor('test_rich')
          .label('Rich editor')
          .description('Supporting text that provides more context about your offering')
          .translatable()
          .placeholder('Supporting text')
          .defaultValue('A content management system for developers'),
      ])
      .tab(
        'Call to Action',
        [
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
            .hidden((formData: HeroSchemaData) => formData.ctaLinkType !== 'internal')
            .required((formData: HeroSchemaData) => formData.ctaLinkType === 'internal')
            .defaultValue('/'),

          Input('ctaExternalLink')
            .label('External URL')
            .description('Enter the full URL including https://')
            .placeholder('https://example.com')
            .hidden((formData: HeroSchemaData) => formData.ctaLinkType !== 'external')
            .required((formData: HeroSchemaData) => formData.ctaLinkType === 'external'),
        ],
        { prefix: <SendIcon size={16} /> }
      )
      .tab(
        'Field Examples',
        [
          // 1. Input Field
          Input('exampleInput')
            .label('Input Field')
            .description('Basic text input')
            .placeholder('Type something...'),

          // 2. Textarea Field
          Textarea('exampleTextarea')
            .label('Textarea Field')
            .description('Multi-line text input')
            .rows(3),

          // 3. Select Field
          Select('exampleSelect')
            .label('Select Field')
            .description('Dropdown selection')
            .options([
              { label: 'Option 1', value: '1' },
              { label: 'Option 2', value: '2' },
              { label: 'Option 3', value: '3' },
            ]),

          // 4. Switch Field (Boolean)
          Switch('exampleSwitch')
            .label('Switch Field')
            .description('Toggle switch for boolean values')
            .defaultValue(true),

          // 5. Rich Editor Field
          RichEditor('exampleRichEditor')
            .label('Rich Text Editor')
            .description('WYSIWYG editor for rich content'),

          // 6. File Upload Field
          FileUpload('exampleFileUpload')
            .label('File Upload')
            .description('Upload images or files')
            .accept('image/*')
            .maxFiles(1),

          // 7. Color Picker Field
          ColorPicker('exampleColorPicker')
            .label('Color Picker')
            .description('Select a color')
            .defaultValue('#3b82f6'),

          // 8. Date Field
          DateField('exampleDateField').label('Date Field').description('Date picker component'),

          // 9. Grid Layout (2 columns)
          Grid(2)
            .gap(4)
            .contains([
              Input('gridInputLeft').label('Left Column'),
              Input('gridInputRight').label('Right Column'),
            ]),

          // 10. Repeater Field
          Repeater('exampleRepeater', [Input('repeaterItem').label('Repeater Item')])
            .label('Repeater Field')
            .description('Repeatable list of items')
            .itemName('Item'),
        ],
        { prefix: <Sparkles size={16} /> }
      ),
    Textarea('subtitle_test')
      .label('Subtitle but translatable')
      .translatable()
      .placeholder('Supporting text')
      .defaultValue('A content management system for developers'),

    Repeater('cards', [
      Input('title').label('Card Title').required().placeholder('Enter card title').translatable(),
      Textarea('description')
        .label('Card Description')
        .rows(2)
        .placeholder('Enter card description')
        .translatable(),
      Input('email_test2')
        .label('Test Email')
        .type('email')
        .placeholder('Enter a valid email')
        .defaultValue('test@example.com'),
    ])
      .label('Feature Cards')
      .description('Add cards to display in the hero section')
      .itemName('Card')
      .itemPluralName('Cards')
      .minItems(1)
      .variant('table'), // Use table variant instead of card
  ],
  'Main hero section with title, subtitle, and CTA button',
  'hero', // Unique key for CMS injection
  <Sparkles size={18} />
);
