import { TextInput, Textarea } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

export const FooterSchema = createSchema(
  'Footer',
  [
    TextInput('companyName')
      .label('Company Name')
      .required()
      .placeholder('Your Company'),
    
    Textarea('description')
      .label('Company Description')
      .rows(2)
      .maxLength(200)
      .placeholder('A brief description of your company'),
    
    TextInput('email')
      .label('Contact Email')
      .inputType('email')
      .required()
      .placeholder('contact@example.com'),
    
    TextInput('phone')
      .label('Phone Number')
      .placeholder('+1 (555) 123-4567'),
    
    TextInput('address')
      .label('Address')
      .placeholder('123 Main St, City, State 12345')
  ],
  'Footer section with company info and contact details'
);

