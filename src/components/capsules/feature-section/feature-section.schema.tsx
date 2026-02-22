import { Input, FileUpload } from '@/lib/form-builder/fields';
import { createSchema } from '@/lib/form-builder/builders/SchemaBuilder';
import { LayoutTemplate } from 'lucide-react';
import type { FeatureSectionSchemaData } from './feature-section.schema.d';

export const FeatureSectionSchema = createSchema(
    'FeatureSection',
    [
        Input('title')
            .label('Title')
            .required()
            .description('The main title of this section')
            .translatable(),

        Input('subtitle')
            .label('Subtitle')
            .required()
            .description('The subtitle of this section')
            .translatable(),

        FileUpload('media')
            .label('Media')
            .description('Upload an image or video')
            .media(),
    ],
    'FeatureSection component',
    'feature-section',
    <LayoutTemplate size={18} />
);
