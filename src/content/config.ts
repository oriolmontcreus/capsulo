import { defineCollection, z } from 'astro:content';

const pagesCollection = defineCollection({
    type: 'data', // This tells Astro to look for JSON/YAML files instead of Markdown
    schema: z.object({
        components: z.array(
            z.object({
                id: z.string(),
                schemaName: z.string(),
                data: z.record(z.any()),
            })
        ),
    }),
});

export const collections = {
    pages: pagesCollection,
};
