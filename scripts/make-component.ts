import path from 'path';
import fs from 'fs/promises';
import { intro, outro, spinner, colors, p } from './lib/cli.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function main() {
    intro('Create New CMS Component');

    const componentName = await p.text({
        message: 'What is the name of your component?',
        placeholder: 'e.g. HeroSection, ContactForm',
        validate(value: string) {
            if (value.length === 0) return 'Name is required!';
            if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) return 'Name must be PascalCase (e.g. MyComponent)';
        },
    });

    if (typeof componentName !== 'string') return;

    const framework = await p.select({
        message: 'Which framework/extension?',
        options: [
            { value: 'astro', label: 'Astro (.astro)' },
            { value: 'react', label: 'React (.tsx)' },
            { value: 'preact', label: 'Preact (.tsx)' },
            { value: 'solid', label: 'Solid JS (.tsx)' },
            { value: 'svelte', label: 'Svelte (.svelte)' },
            { value: 'vue', label: 'Vue (.vue)' },
            { value: 'alpine', label: 'Alpine JS (.astro)' },
        ],
    });

    if (typeof framework !== 'string') return;

    const s = spinner();
    s.start('Scaffolding component...');

    // kebab-case conversion
    const kebabName = componentName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

    // Directory paths
    const baseDir = path.resolve(process.cwd(), 'src/components/capsulo');
    const componentDir = path.join(baseDir, kebabName);

    try {
        await fs.access(componentDir);
        s.stop(colors.error('Directory already exists!'));
        process.exit(1);
    } catch {
        // Directory doesn't exist, proceed
    }

    await fs.mkdir(componentDir, { recursive: true });

    // 1. Create Schema File
    const schemaContent = `import { Input, Textarea } from '@/lib/form-builder/fields';
import { createSchema } from '@/lib/form-builder/builders/SchemaBuilder';
import { LayoutTemplate } from 'lucide-react';
import type { ${componentName}SchemaData } from './${kebabName}.schema.d';

export const ${componentName}Schema = createSchema(
    '${componentName}',
    [
        Input('title')
            .label('Title')
            .description('The main title of this section')
            .translatable(),
            
        Textarea('description')
            .label('Description')
            .rows(3)
            .translatable(),
    ],
    '${componentName} component',
    '${kebabName}',
    <LayoutTemplate size={18} />
);
`;

    await fs.writeFile(path.join(componentDir, `${kebabName}.schema.tsx`), schemaContent);

    // 2. Create Component File
    let componentContent = '';
    const extension = ['react', 'preact', 'solid'].includes(framework) ? 'tsx' :
        framework === 'svelte' ? 'svelte' :
            framework === 'vue' ? 'vue' : 'astro';

    const componentFile = path.join(componentDir, `${componentName}.${extension}`);

    if (framework === 'astro') {
        componentContent = `---
import { getCMSPropsWithDefaults } from "@/lib/cms-component-utils";
import type { ${componentName}SchemaData } from './${kebabName}.schema.d';

export interface Props extends ${componentName}SchemaData {}

const cmsProps = getCMSPropsWithDefaults<${componentName}SchemaData>(
    import.meta.url,
    Astro.props,
);

const {
    title = "${componentName}",
    description = "Component description...",
} = cmsProps;
---

<section class="py-12">
    <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold mb-4">{title}</h2>
        <p class="text-gray-600">{description}</p>
    </div>
</section>
`;
    } else if (framework === 'react') {
        componentContent = `import type { ${componentName}SchemaData } from './${kebabName}.schema.d';

export default function ${componentName}({ title, description }: ${componentName}SchemaData) {
    return (
        <section className="py-12">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold mb-4">{title}</h2>
                <p className="text-gray-600">{description}</p>
            </div>
        </section>
    );
}
`;
    } else if (framework === 'preact') {
        componentContent = `/** @jsxImportSource preact */
import type { ${componentName}SchemaData } from './${kebabName}.schema.d';

export default function ${componentName}({ title, description }: ${componentName}SchemaData) {
    return (
        <section className="py-12">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold mb-4">{title}</h2>
                <p className="text-gray-600">{description}</p>
            </div>
        </section>
    );
}
`;
    } else if (framework === 'solid') {
        componentContent = `/** @jsxImportSource solid-js */
import type { ${componentName}SchemaData } from './${kebabName}.schema.d';

export default function ${componentName}(props: ${componentName}SchemaData) {
    return (
        <section class="py-12">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold mb-4">{props.title}</h2>
                <p className="text-gray-600">{props.description}</p>
            </div>
        </section>
    );
}
`;
    } else if (framework === 'svelte') {
        componentContent = `<script lang="ts">
   import type { ${componentName}SchemaData } from './${kebabName}.schema.d';

   export let title: string;
   export let description: string;
</script>

<section class="py-12">
    <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold mb-4">{title}</h2>
        <p class="text-gray-600">{description}</p>
    </div>
</section>
`;
    } else if (framework === 'vue') {
        componentContent = `<script setup lang="ts">
import type { ${componentName}SchemaData } from './${kebabName}.schema.d';

defineProps<${componentName}SchemaData>();
</script>

<template>
    <section class="py-12">
        <div class="container mx-auto px-4">
            <h2 class="text-3xl font-bold mb-4">{{ title }}</h2>
            <p class="text-gray-600">{{ description }}</p>
        </div>
    </section>
</template>
`;
    } else if (framework === 'alpine') {
        componentContent = `---
import { getCMSPropsWithDefaults } from "@/lib/cms-component-utils";
import type { ${componentName}SchemaData } from './${kebabName}.schema.d';

export interface Props extends ${componentName}SchemaData {}

const cmsProps = getCMSPropsWithDefaults<${componentName}SchemaData>(
    import.meta.url,
    Astro.props,
);

const {
    title = "${componentName}",
    description = "Component description...",
} = cmsProps;
---

<section 
    class="py-12"
    x-data={\`{ title: '\${title}', description: '\${description}' }\`}
>
    <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold mb-4" x-text="title">{title}</h2>
        <p class="text-gray-600" x-text="description">{description}</p>
    </div>
</section>
`;
    }


    await fs.writeFile(componentFile, componentContent);

    s.stop(colors.success(`Created ${componentDir}`));

    // 3. Run type generation for the NEW component only
    const schemaFileRelative = path.relative(process.cwd(), path.join(componentDir, `${kebabName}.schema.tsx`));
    const s2 = spinner();
    s2.start(`Generating types for ${colors.info(path.basename(schemaFileRelative))}`);

    try {
        await execAsync(`npx tsx scripts/generate-schema-types.ts ${schemaFileRelative}`);
        s2.stop(colors.success('Types generated!'));
    } catch (err) {
        s2.stop(colors.error('Failed to generate types. Check the console.'));
        console.error(err);
    }

    outro('Done! Happy coding!');
}

main().catch(console.error);
