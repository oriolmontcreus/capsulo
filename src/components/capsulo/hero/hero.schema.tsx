import { Input, Select, Textarea, DateField, Repeater, RichEditor } from '@/lib/form-builder/fields';
import { Tabs, Tab } from '@/lib/form-builder/layouts';
import { createSchema } from '@/lib/form-builder/builders/SchemaBuilder';
import { SendIcon, CalendarIcon, Sparkles } from 'lucide-react';
import type { HeroSchemaData } from './hero.schema.d';

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
                    .hidden((formData: HeroSchemaData) => formData.ctaLinkType !== 'internal')
                    .required((formData: HeroSchemaData) => formData.ctaLinkType === 'internal')
                    .defaultValue('/'),

                Input('ctaExternalLink')
                    .label('External URL')
                    .description('Enter the full URL including https://')
                    .placeholder('https://example.com')
                    .hidden((formData: HeroSchemaData) => formData.ctaLinkType !== 'external')
                    .required((formData: HeroSchemaData) => formData.ctaLinkType === 'external'),
            ], { prefix: <SendIcon size={16} /> })
            .tab('Date Examples', [
                // Basic date field
                DateField('launchDate')
                    .label('Launch Date')
                    .description('When this hero section becomes active')
                    .placeholder('Select launch date')
                    .locale('es-ES')
                    .format('long'), // e.g., "November 16, 2025"

                // Date with constraints (no past dates)
                // Special marker 'today' is evaluated at runtime
                DateField('eventDate')
                    .label('Event Date')
                    .description('Future events only - past dates are disabled')
                    .required()
                    .minDate('today')
                    .format('medium'), // e.g., "Nov 16, 2025"

                // Date with weekends disabled
                DateField('workdayDate')
                    .label('Workday Date')
                    .description('Weekends are disabled - only weekdays selectable')
                    .placeholder('Select a weekday')
                    .disabled({
                        dayOfWeek: [0, 6], // Disable Sunday (0) and Saturday (6)
                    })
                    .weekStartsOn(1) // Week starts on Monday
                    .format('full'), // e.g., "Monday, November 16, 2025"

                // Date with custom format
                DateField('customDate')
                    .label('Custom Format Date')
                    .description('Custom date format example')
                    .customFormat({
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    }) // e.g., "Mon, Nov 16, 2025"
                    .captionLayout('dropdown-months'),

                // Date with year range (for birth dates)
                // Special marker 'today' is evaluated at runtime
                DateField('birthDate')
                    .label('Date of Birth')
                    .description('Year dropdown limited to 1950-2010')
                    .yearRange(1950, 2010)
                    .maxDate('today')
                    .format('short') // e.g., "11/16/2025"
                    .captionLayout('dropdown'),

                // Input variant - typed date entry
                DateField('typedDate')
                    .label('Typed Date Input')
                    .description('Enter date by typing (MM/DD/YYYY format)')
                    .variant('input') // Use input variant instead of calendar
                    .required()
                    .placeholder('Type date'),

                // Date range picker
                DateField('eventDateRange')
                    .label('Event Date Range')
                    .description('Select a date range with both input and calendar')
                    .mode('range') // Enable range mode
                    .required(),
            ], { prefix: <CalendarIcon size={16} /> }),
        Textarea('subtitle_test')
            .label('Subtitle but translatable')
            .translatable()
            .placeholder('Supporting text')
            .defaultValue('A content management system for developers'),

        Repeater('cards', [
            Input('title')
                .label('Card Title')
                .required()
                .placeholder('Enter card title')
                .translatable(),
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
    <Sparkles size={18} />,
    'purple'
);
