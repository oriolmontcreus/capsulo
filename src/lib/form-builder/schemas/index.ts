import { registerSchema } from '../core/schemaRegistry';

// Auto-discover and register schemas from component directories
const componentSchemas = import.meta.glob('../../../components/capsulo/**/*.schema.{ts,tsx}', { eager: true });

export const schemas: Record<string, any> = {};

// Register component schemas
Object.entries(componentSchemas).forEach(([path, module]: [string, any]) => {
  const fileName = path.split('/').pop()?.replace(/\.schema\.(ts|tsx)$/, '') || '';
  const schemaName = fileName.charAt(0).toUpperCase() + fileName.slice(1) + 'Schema';

  const schema = module[schemaName];

  if (schema) {
    registerSchema(schema);
    schemas[schema.name] = schema;
  }
});


