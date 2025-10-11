import { registerSchema } from '../core/schemaRegistry';
import { HeroSchema } from './Hero';
import { FooterSchema } from './Footer';

registerSchema(HeroSchema);
registerSchema(FooterSchema);

export const schemas = {
  Hero: HeroSchema,
  Footer: FooterSchema,
};

