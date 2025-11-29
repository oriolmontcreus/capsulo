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
    // Extract folder name from path
    // e.g., ../../../components/capsulo/hero/hero.schema.tsx -> hero
    const folderMatch = path.match(/\/([^\/]+)\/[^\/]+\.schema\.(ts|tsx)$/);
    const folderName = folderMatch ? folderMatch[1] : null;

    // Validate that schema key matches folder name
    if (schema.key && folderName && schema.key !== folderName) {
      throw new Error(
        `[Schema Registration] Schema key mismatch in "${path}": ` +
        `folder name is "${folderName}" but schema key is "${schema.key}". ` +
        `Schema keys must match their folder names in @/components/capsulo/.`
      );
    }

    // If no key is provided, auto-assign from folder name
    if (!schema.key && folderName) {
      console.warn(
        `[Schema Registration] Schema in "${path}" has no key. Auto-assigning key "${folderName}" from folder name.`
      );
      schema.key = folderName;
    }

    registerSchema(schema);
    schemas[schema.name] = schema;
  }
});


