import { Input, RichEditor } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

/**
 * Example schema demonstrating the RichEditor field
 * This shows how to use the PlateJS rich text editor in your CMS
 */
export const BlogPostSchema = createSchema(
    'Blog Post',
    [
        Input('title')
            .label('Post Title')
            .description('The title of your blog post')
            .required()
            .placeholder('Enter post title')
            .maxLength(100),

        RichEditor('content')
            .label('Post Content')
            .description('The main content of your blog post with rich text formatting')
            .placeholder('Start writing your blog post...')
            .required()
            .minLength(100)
            .maxLength(10000),

        RichEditor('excerpt')
            .label('Excerpt')
            .description('A short summary of your blog post')
            .placeholder('Write a brief summary...')
            .maxLength(500)
            .variant('default'),
    ],
    'Blog post with rich text editor for content',
    'blog-post'
);
