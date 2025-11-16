import type { Schema } from './types';

const schemas = new Map<string, Schema>();

export const registerSchema = (schema: Schema): void => {
  schemas.set(schema.name, schema);
};

export const getSchema = (name: string): Schema | undefined => schemas.get(name);

export const getAllSchemas = (): Schema[] => Array.from(schemas.values());

export const getSchemaNames = (): string[] => Array.from(schemas.keys());


