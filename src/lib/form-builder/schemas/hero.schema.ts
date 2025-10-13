import { Input, Select, Textarea } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

export const HeroSchema = createSchema(
  'Hero',
  [
    Input('title')
      .label('Hero title')
      .description('The main headline that appears at the top of your page')
      .required()
      .placeholder('Enter the main title'),

    Textarea('subtitle')
      .label('Subtitle')
      .description('Supporting text that provides more context about your offering')
      .rows(3)
      .placeholder('Supporting text'),

    Input('ctaButton')
      .label('CTA text')
      .description('The text that appears on your call-to-action button')
      .placeholder('Get Started'),

    Select('ctaLinkType')
      .label('CTA link')
      .description('Choose whether the button links to an internal page or external URL')
      .options([
        { label: 'Internal', value: 'internal' },
        { label: 'External', value: 'external' },
      ])
  ],
  'Main hero section with title, subtitle, and CTA button',
  'hero' // Unique key for CMS injection
);

