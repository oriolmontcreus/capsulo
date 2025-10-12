import { Input, Textarea } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

export const FooterSchema = createSchema(
  'Footer',
  [
    Input('companyName')
      .label('Company name')
      .required()
      .placeholder('Your Company'),
    
    Textarea('description')
      .label('Company description')
      .rows(2)
      .maxLength(200)
      .placeholder('A brief description of your company'),
    
    Input('email')
      .label('Contact email')
      .inputType('email')
      .required()
      .placeholder('contact@example.com'),
    
    Input('phone')
      .label('Phone number')
      .placeholder('+1 (555) 123-4567'),
    
    Input('address')
      .label('Address')
      .placeholder('123 Main St, City, State 12345')
  ],
  'Footer section with company info and contact details'
);

