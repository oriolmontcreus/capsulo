/**
 * Schema Parser - Shared module for parsing .schema.tsx files
 * Used by both the CLI script and Vite plugin
 */
import fs from 'node:fs';
import ts from 'typescript';
import { FIELD_TS_TYPES } from '../../src/lib/form-builder/fields/field-ts-types.js';

// --- Types ---
export interface FieldDefinition {
    name: string;
    type: string;
    isOptional?: boolean;
    isRequired?: boolean;
    hasDefaultValue?: boolean;
}

export interface SchemaDefinition {
    name: string;
    fields: FieldDefinition[];
}

/** Context object passed through parsing to collect schemas without global state */
interface ParseContext {
    schemas: SchemaDefinition[];
}

interface ChainInfo {
    rootFunctionName: string;
    rootArgs: ts.NodeArray<ts.Expression> | null;
    isRequired: boolean;
    hasDefaultValue: boolean;
    itemName: string | null;
    subTabFields: FieldDefinition[];
}

const MAX_CHAIN_DEPTH = 30;

// --- Main Parsing Logic ---

export function parseSchemaFile(filePath: string): SchemaDefinition[] {
    const ctx: ParseContext = { schemas: [] };

    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
    );

    function visit(node: ts.Node) {
        if (ts.isVariableStatement(node)) {
            const declarationList = node.declarationList;
            for (const declaration of declarationList.declarations) {
                if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
                    const init = declaration.initializer;
                    // Case 1: Direct Array Literal: export const HeroSchema = [...]
                    if (ts.isArrayLiteralExpression(init)) {
                        const varName = declaration.name.getText();
                        if (varName.endsWith('Schema')) {
                            const fields = parseFields(init, ctx);
                            ctx.schemas.push({ name: varName, fields });
                        }
                    }
                    // Case 2: createSchema('Name', [ ... ])
                    else if (ts.isCallExpression(init)) {
                        let isCreateSchema = false;
                        // Simplistic check for createSchema identifier
                        if (ts.isIdentifier(init.expression) && init.expression.text === 'createSchema') {
                            isCreateSchema = true;
                        }

                        if (isCreateSchema && init.arguments.length >= 2) {
                            // 2nd argument is the array
                            const arg2 = init.arguments[1];
                            if (ts.isArrayLiteralExpression(arg2)) {
                                const varName = declaration.name.getText();
                                const fields = parseFields(arg2, ctx);
                                ctx.schemas.push({ name: varName, fields });
                            }
                        }
                    }
                }
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return ctx.schemas;
}

function parseFields(arrayLiteral: ts.ArrayLiteralExpression, ctx: ParseContext): FieldDefinition[] {
    const fields: FieldDefinition[] = [];

    for (const element of arrayLiteral.elements) {
        if (ts.isCallExpression(element)) {
            parseFieldCall(element, fields, ctx);
        } else if (ts.isPropertyAccessExpression(element)) {
            if (ts.isCallExpression(element.expression)) {
                parseFieldCall(element.expression, fields, ctx);
            }
        }
    }

    return fields;
}

function parseModifiersFromCall(currentCall: ts.CallExpression, info: ChainInfo, ctx: ParseContext) {
    const expr = currentCall.expression;
    if (!ts.isPropertyAccessExpression(expr)) return;

    const methodName = expr.name.text;

    // Detect .required() modifier
    if (methodName === 'required') {
        if (currentCall.arguments.length > 0) {
            const arg = currentCall.arguments[0];
            // If it's a function or arrow function, it's conditionally required -> treat as optional
            if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
                info.isRequired = false;
            } else if (arg.kind === ts.SyntaxKind.FalseKeyword) {
                info.isRequired = false;
            } else {
                info.isRequired = true;
            }
        } else {
            info.isRequired = true;
        }
    }

    // Detect .defaultValue() modifier
    if (methodName === 'defaultValue') {
        info.hasDefaultValue = true;
    }

    // Repeater .itemName('Card')
    if (methodName === 'itemName' && currentCall.arguments.length > 0) {
        if (ts.isStringLiteral(currentCall.arguments[0])) {
            info.itemName = currentCall.arguments[0].text;
        }
    }

    // Tabs .tab('Name', [ ... ])
    if (methodName === 'tab' && currentCall.arguments.length >= 2) {
        const arg2 = currentCall.arguments[1];
        if (ts.isArrayLiteralExpression(arg2)) {
            const extracted = parseFields(arg2, ctx);
            info.subTabFields.push(...extracted);
        }
    }

    // Grid .contains([ ... ])
    if (methodName === 'contains' && currentCall.arguments.length >= 1) {
        const arg1 = currentCall.arguments[0];
        if (ts.isArrayLiteralExpression(arg1)) {
            const extracted = parseFields(arg1, ctx);
            info.subTabFields.push(...extracted);
        }
    }
}

function walkMethodChain(callExpr: ts.CallExpression, ctx: ParseContext): ChainInfo {
    const info: ChainInfo = {
        rootFunctionName: '',
        rootArgs: null,
        isRequired: false,
        hasDefaultValue: false,
        itemName: null,
        subTabFields: []
    };

    let current: ts.Expression = callExpr;
    let depth = 0;

    while (depth < MAX_CHAIN_DEPTH) {
        depth++;

        if (ts.isCallExpression(current)) {
            const expr = current.expression;

            if (ts.isPropertyAccessExpression(expr)) {
                parseModifiersFromCall(current, info, ctx);
                current = expr.expression;
            } else if (ts.isIdentifier(expr)) {
                info.rootFunctionName = expr.text;
                info.rootArgs = current.arguments;
                break;
            } else {
                break;
            }
        } else if (ts.isPropertyAccessExpression(current)) {
            current = current.expression;
        } else {
            break;
        }
    }

    if (depth >= MAX_CHAIN_DEPTH) {
        console.warn(`[SchemaParser] Warning: Reached max chain depth (${MAX_CHAIN_DEPTH}) while parsing field call.`);
    }

    return info;
}

function buildRepeaterField(chainInfo: ChainInfo, ctx: ParseContext): string {
    const { itemName, rootArgs } = chainInfo;

    if (itemName && rootArgs && rootArgs.length >= 2 && ts.isArrayLiteralExpression(rootArgs[1])) {
        const subFields = parseFields(rootArgs[1], ctx);
        const subInterfaceName = `${itemName}Data`;

        ctx.schemas.push({
            name: itemName,
            fields: subFields
        });

        return `${subInterfaceName}[]`;
    } else if (rootArgs && rootArgs.length >= 2 && ts.isArrayLiteralExpression(rootArgs[1])) {
        // Anonymous repeater?
        return 'any[]';
    }

    return 'any[]';
}

function buildFieldDefinition(chainInfo: ChainInfo, ctx: ParseContext): FieldDefinition | null {
    const { rootFunctionName, rootArgs, isRequired, hasDefaultValue } = chainInfo;

    if (rootArgs && rootArgs.length > 0 && ts.isStringLiteral(rootArgs[0])) {
        const fieldName = rootArgs[0].text;
        let type = 'any';

        if (rootFunctionName === 'Repeater') {
            type = buildRepeaterField(chainInfo, ctx);
        } else {
            type = getFieldType(rootFunctionName);
        }

        return { name: fieldName, type, isRequired, hasDefaultValue };
    }

    return null;
}

function parseFieldCall(callExpr: ts.CallExpression, fields: FieldDefinition[], ctx: ParseContext) {
    const chainInfo = walkMethodChain(callExpr, ctx);

    if (chainInfo.rootFunctionName) {
        // Handle Layouts containing fields (Tabs, Grid)
        if (chainInfo.subTabFields.length > 0) {
            fields.push(...chainInfo.subTabFields);
        }

        // Handle the field itself
        const field = buildFieldDefinition(chainInfo, ctx);
        if (field) {
            fields.push(field);
        }
    }
}

function getFieldType(typeFn: string): string {
    return FIELD_TS_TYPES[typeFn] ?? 'any';
}

// --- Generation ---

export function generateDts(schemas: SchemaDefinition[]): string {
    const lines: string[] = [];
    lines.push('// Auto-generated by scripts/generate-schema-types.ts');
    lines.push('');

    const uniqueSchemas = new Set<string>();

    for (const schema of schemas) {
        // Construct interface name. 
        // Logic:
        // - Top level: 'HeroSchema' -> 'HeroSchemaData'
        // - Repeater item: 'Card' -> 'CardData'

        const interfaceName = `${schema.name}Data`;

        if (uniqueSchemas.has(interfaceName)) continue;
        uniqueSchemas.add(interfaceName);

        lines.push(`export interface ${interfaceName} {`);
        for (const field of schema.fields) {
            // Field is required (no ?) if it has .required() OR .defaultValue()
            // This ensures the component can rely on the value being present
            const isOptional = !field.isRequired && !field.hasDefaultValue;
            const optionalMarker = isOptional ? '?' : '';
            lines.push(`    ${field.name}${optionalMarker}: ${field.type};`);
        }
        lines.push('}');
        lines.push('');
    }

    return lines.join('\n');
}
