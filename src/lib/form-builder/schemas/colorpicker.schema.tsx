import { ColorPicker, Input } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

/**
 * Example schema demonstrating the ColorPicker field
 */
export const ColorpickerSchema = createSchema(
    'ColorPicker Showcase',
    [
        Input('title')
            .label('Title')
            .placeholder('Enter a title')
            .required()
            .defaultValue('Brand Colors'),

        ColorPicker('primaryColor')
            .label('Primary Color')
            .description('Choose your primary brand color')
            .required()
            .defaultValue('#3B82F6')
            .presetColors(['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']),

        ColorPicker('backgroundColor')
            .label('Background Color')
            .description('Choose a background color with transparency')
            .showAlpha(true)
            .defaultValue('#FFFFFF')
            .presetColors(['#FFFFFF', '#F3F4F6', '#E5E7EB', '#D1D5DB', '#000000']),

        ColorPicker('accentColor')
            .label('Accent Color')
            .description('Optional accent color')
            .defaultValue('#EC4899'),
    ],
    'Example component with color picker fields',
    'colorpicker'
);
