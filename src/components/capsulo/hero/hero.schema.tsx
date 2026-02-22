import { Input, Textarea } from '@/lib/form-builder/fields';
import { Tabs } from '@/lib/form-builder/layouts';
import { createSchema } from '@/lib/form-builder/builders/SchemaBuilder';
import { SendIcon, Sparkles } from 'lucide-react';

export const HeroSchema = createSchema(
  'Hero',
  [
    Tabs()
      .tab('Content', [
        Textarea('subtitle')
          .label('Subtitle')
          .description('Supporting text that provides more context about your offering')
          .rows(3)
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
        ],
        { prefix: <SendIcon size={16} /> }
      ),
  ],
  'Main hero section with title, subtitle, and CTA button',
  'hero', // Unique key for CMS injection
  <Sparkles size={18} />
);
