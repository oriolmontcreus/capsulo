import { TextInput, Textarea } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

export const HeroSchema = createSchema(
  'Hero Section',
  [
    TextInput('title')
      .label('Hero Title')
      .required()
      .placeholder('Enter the main title'),
    
    Textarea('subtitle')
      .label('Subtitle')
      .rows(3)
      .placeholder('Supporting text'),
    
    TextInput('ctaButton')
      .label('Call to Action Button')
      .placeholder('Get Started')
  ],
  'Main hero section with title, subtitle, and CTA button'
);

