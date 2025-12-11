import { Input, Textarea } from '@/lib/form-builder/fields';
import { Tabs } from '@/lib/form-builder/layouts';
import { createSchema } from '@/lib/form-builder/builders/SchemaBuilder';
import { Globe, Share2, Phone } from 'lucide-react';

export const GlobalsSchema = createSchema(
    'Global Variables',
    [
        Tabs()
            .tab('Site Settings', [
                Input('siteName')
                    .label('Site Name')
                    .description('The name of your website')
                    .required()
                    .translatable()
                    .placeholder('My Awesome Site')
                    .defaultValue('My Awesome Site'),

                Input('siteEmail')
                    .label('Contact Email')
                    .type('email')
                    .description('Primary contact email address')
                    .placeholder('contact@example.com')
                    .defaultValue('contact@example.com'),

                Textarea('siteDescription')
                    .label('Site Description')
                    .description('A brief description of your website')
                    .rows(3)
                    .translatable()
                    .placeholder('Enter a description of your site')
                    .defaultValue('A modern website built with Capsulo CMS'),
            ], { prefix: <Globe size={16} /> })
            .tab('Social Media', [
                Input('facebookUrl')
                    .label('Facebook URL')
                    .description('Your Facebook page or profile URL')
                    .placeholder('https://facebook.com/yourpage')
                    .defaultValue(''),

                Input('twitterUrl')
                    .label('Twitter/X URL')
                    .description('Your Twitter/X profile URL')
                    .placeholder('https://twitter.com/yourhandle')
                    .defaultValue(''),

                Input('instagramUrl')
                    .label('Instagram URL')
                    .description('Your Instagram profile URL')
                    .placeholder('https://instagram.com/yourhandle')
                    .defaultValue(''),

                Input('linkedinUrl')
                    .label('LinkedIn URL')
                    .description('Your LinkedIn profile or company page URL')
                    .placeholder('https://linkedin.com/company/yourcompany')
                    .defaultValue(''),

                Input('youtubeUrl')
                    .label('YouTube URL')
                    .description('Your YouTube channel URL')
                    .placeholder('https://youtube.com/@yourchannel')
                    .defaultValue(''),
            ], { prefix: <Share2 size={16} /> })
            .tab('Contact Information', [
                Input('phone')
                    .label('Phone Number')
                    .description('Primary contact phone number')
                    .placeholder('+1 (555) 123-4567')
                    .defaultValue(''),

                Input('email')
                    .label('Email Address')
                    .description('Primary contact email')
                    .placeholder('contact@example.com')
                    .defaultValue('contact@example.com'),

                Textarea('address')
                    .label('Physical Address')
                    .description('Street address or mailing address')
                    .rows(3)
                    .translatable()
                    .placeholder('123 Main St, City, State 12345')
                    .defaultValue(''),

                Input('city')
                    .label('City')
                    .description('City name')
                    .translatable()
                    .placeholder('New York')
                    .defaultValue(''),

                Input('country')
                    .label('Country')
                    .description('Country name')
                    .translatable()
                    .placeholder('United States')
                    .defaultValue(''),
            ], { prefix: <Phone size={16} /> }),
    ],
    'Global site-wide settings, social media links, and contact information',
    'globals',
    <Globe size={18} />,
    'blue'
);

