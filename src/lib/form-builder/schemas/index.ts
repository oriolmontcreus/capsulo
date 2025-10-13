import { registerSchema } from '../core/schemaRegistry';
import { HeroSchema } from './hero.schema';
import { FooterSchema } from './footer.schema';

registerSchema(HeroSchema);
registerSchema(FooterSchema);

export const schemas = {
  Hero: HeroSchema,
  Footer: FooterSchema,
};

