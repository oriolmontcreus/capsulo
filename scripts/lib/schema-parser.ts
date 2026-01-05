/**
 * Schema Parser - Shared module for parsing .schema.tsx files
 * Used by both the CLI script and Vite plugin
 */
import fs from 'node:fs';
import ts from 'typescript';

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

function parseFieldCall(callExpr: ts.CallExpression, fields: FieldDefinition[], ctx: ParseContext) {
    // We walk up the chain to find the Root call (Input) and any modifiers (.itemName, .tab, etc)

    let current: ts.Expression = callExpr;
    let rootFunctionName = '';
    let rootArgs: ts.NodeArray<ts.Expression> | null = null;

    // Modifiers we care about
    let itemName: string | null = null;
    let subTabFields: FieldDefinition[] = [];
    let isRequired = false;
    let hasDefaultValue = false;

    // Walk the chain "up" (from outermost .method() down to Input())
    let depth = 0;
    while (depth < 50) {
        depth++;

        if (ts.isCallExpression(current)) {
            const expr = current.expression;

            if (ts.isPropertyAccessExpression(expr)) {
                // Method call: .label(), .options(), .itemName()
                const methodName = expr.name.text;

                // Detect .required() modifier
                if (methodName === 'required') {
                    // Check if it has arguments
                    if (current.arguments.length > 0) {
                        const arg = current.arguments[0];
                        // If it's a function or arrow function, it's conditionally required -> treat as optional
                        if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
                            isRequired = false;
                        } else if (arg.kind === ts.SyntaxKind.FalseKeyword) {
                            isRequired = false;
                        } else {
                            // strictly required (true or no args usually implies true)
                            isRequired = true;
                        }
                    } else {
                        // .required() with no args -> strictly required
                        isRequired = true;
                    }
                }

                // Detect .defaultValue() modifier
                if (methodName === 'defaultValue') {
                    hasDefaultValue = true;
                }

                // Repeater .itemName('Card')
                if (methodName === 'itemName' && current.arguments.length > 0) {
                    if (ts.isStringLiteral(current.arguments[0])) {
                        itemName = current.arguments[0].text;
                    }
                }

                // Tabs .tab('Name', [ ... ])
                if (methodName === 'tab' && current.arguments.length >= 2) {
                    const arg2 = current.arguments[1];
                    if (ts.isArrayLiteralExpression(arg2)) {
                        const extracted = parseFields(arg2, ctx);
                        subTabFields.push(...extracted);
                    }
                }

                // Grid .contains([ ... ])
                if (methodName === 'contains' && current.arguments.length >= 1) {
                    const arg1 = current.arguments[0];
                    if (ts.isArrayLiteralExpression(arg1)) {
                        const extracted = parseFields(arg1, ctx);
                        subTabFields.push(...extracted);
                    }
                }

                current = expr.expression;
            } else if (ts.isIdentifier(expr)) {
                // Root call: Input(...)
                rootFunctionName = expr.text;
                rootArgs = current.arguments;
                break;
            } else {
                break;
            }
        } else {
            // Handle unwrapped PropertyAccess (unlikely if we start from CallExpression but possible)
            if (ts.isPropertyAccessExpression(current)) {
                current = current.expression;
            } else {
                break;
            }
        }
    }

    // Ensure we process if we found a root function
    if (rootFunctionName) {
        // Handle Layouts containing fields (Tabs)
        if (subTabFields.length > 0) {
            fields.push(...subTabFields);
        }

        // Handle Fields - check if 1st arg is a string (name)
        if (rootArgs && rootArgs.length > 0 && ts.isStringLiteral(rootArgs[0])) {
            const fieldName = rootArgs[0].text;
            let type = 'any';

            if (rootFunctionName === 'Repeater') {
                // Check if we have 2nd arg (fields array) AND an itemName
                // Note: Repeater(name, [fields])
                if (itemName && rootArgs.length >= 2 && ts.isArrayLiteralExpression(rootArgs[1])) {
                    // Extract sub-schema
                    const subFields = parseFields(rootArgs[1], ctx);
                    const subInterfaceName = `${itemName}Data`; // e.g. CardData

                    // Add nested schema to context (explicit, not hidden)
                    ctx.schemas.push({
                        name: itemName, // Will look for Card -> CardData
                        fields: subFields
                    });

                    type = `${subInterfaceName}[]`;
                } else if (rootArgs.length >= 2 && ts.isArrayLiteralExpression(rootArgs[1])) {
                    // Anonymous repeater?
                    type = 'any[]';
                } else {
                    type = 'any[]';
                }
            } else {
                type = getFieldType(rootFunctionName);
            }

            fields.push({ name: fieldName, type, isRequired, hasDefaultValue });
        }
    }
}

function getFieldType(typeFn: string): string {
    switch (typeFn) {
        case 'Input':
        case 'Textarea':
        case 'RichEditor':
        case 'ColorPicker':
        case 'Select':
        case 'FileUpload':
            return 'string';
        case 'Switch':
            return 'boolean';
        case 'DateField':
            return 'Date';
        default:
            return 'any';
    }
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
