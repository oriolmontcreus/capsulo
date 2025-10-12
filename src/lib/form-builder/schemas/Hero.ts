import { Input, Select, Textarea } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

export const HeroSchema = createSchema(
  'Hero',
  [
    Input('title')
      .label('Hero Title')
      .required()
      .placeholder('Enter the main title'),

    Textarea('subtitle')
      .label('Subtitle')
      .rows(3)
      .placeholder('Supporting text'),

    Input('ctaButton')
      .label('Call to Action Button')
      .placeholder('Get Started'),

      Select('ctaLinkType')
      .label('CTA Link Type')
      .options([
        { label: 'Internal', value: 'internal' },
        { label: 'External', value: 'external' },
      ])
  ],
  'Main hero section with title, subtitle, and CTA button'
);

