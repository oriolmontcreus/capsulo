import { registerSchema } from '../core/schemaRegistry';

// Auto-discover and register all schemas
const schemaModules = import.meta.glob('./*.schema.ts', { eager: true });
export const schemas: Record<string, any> = {};

Object.entries(schemaModules).forEach(([path, module]: [string, any]) => {
  // Extract schema name from filename (e.g., './hero.schema.ts' -> 'HeroSchema')
  const fileName = path.split('/').pop()?.replace('.schema.ts', '') || '';
  const schemaName = fileName.charAt(0).toUpperCase() + fileName.slice(1) + 'Schema';

  const schema = module[schemaName];

  if (schema) {
    registerSchema(schema);
    schemas[schema.name] = schema;
  }
});

