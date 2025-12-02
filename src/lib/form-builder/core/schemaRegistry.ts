import type { Schema } from './types';

const schemas = new Map<string, Schema>();
const globalSchemas = new Map<string, Schema>();

export const registerSchema = (schema: Schema, isGlobal: boolean = false): void => {
  if (isGlobal) {
    globalSchemas.set(schema.name, schema);
  } else {
    schemas.set(schema.name, schema);
  }
};

export const getSchema = (name: string): Schema | undefined => schemas.get(name);

export const getAllSchemas = (): Schema[] => Array.from(schemas.values());

export const getSchemaNames = (): string[] => Array.from(schemas.keys());

// Global variable schema functions
export const getAllGlobalSchemas = (): Schema[] => Array.from(globalSchemas.values());

