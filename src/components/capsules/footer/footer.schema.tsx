import { Input, Textarea } from '@/lib/form-builder/fields';
import { Grid } from '@/lib/form-builder/layouts';
import { createSchema } from '@/lib/form-builder/builders/SchemaBuilder';
import { Building2, Mail, MapPin, Phone, LayoutTemplate } from 'lucide-react';

export const FooterSchema = createSchema(
    'Footer',
    [
        Input('companyName')
            .label('Company name')
            .description('Your business or organization name as it should appear in the footer')
            .required()
            .placeholder('Your Company')
            .prefix(<Building2 size={16} />),

        Textarea('description')
            .label('Company description')
            .description('A brief description that will appear in your footer (max 200 characters)')
            .rows(2)
            .maxLength(200)
            .placeholder('A brief description of your company'),

        // Responsive grid: 2 columns on mobile, 3 on large screens
        Grid({ base: 2, lg: 3 })
            .gap({ base: 4, lg: 6 })
            .contains([
                Input('email')
                    .label('Contact email')
                    .description('Primary email address for customer inquiries')
                    .type('email')
                    .required()
                    .placeholder('contact@example.com')
                    .prefix(<Mail size={16} />),

                Input('phone')
                    .label('Phone number')
                    .description('Business phone number for customer contact')
                    .placeholder('(555) 123-4567')
                    .prefix(<Phone size={16} />),

                Input('address')
                    .label('Address')
                    .description('Physical business address or location')
                    .placeholder('123 Main St, City, State 12345')
                    .prefix(<MapPin size={16} />)
            ])
    ],
    'Footer section with company info and contact details',
    'footer',
    <LayoutTemplate size={18} />,
);
