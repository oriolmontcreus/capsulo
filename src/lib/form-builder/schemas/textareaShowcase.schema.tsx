import { Textarea } from '../fields';
import { Tabs, Tab } from '../layouts';
import { createSchema } from '../builders/SchemaBuilder';
import {
    MessageSquare,
    FileText,
    Code,
    Hash,
    Star,
    User,
    Mail,
    Calendar,
    AlertCircle
} from 'lucide-react';

/**
 * Comprehensive Textarea Showcase Schema
 * Demonstrates all available textarea configurations and features
 */
export const TextareaShowcaseSchema = createSchema(
    'Textarea Showcase',
    [
        Tabs()
            .tab('Basic Examples', [
                Textarea('simple')
                    .label('Simple Textarea')
                    .description('A basic textarea with default settings')
                    .placeholder('Enter your text here...')
                    .rows(3),

                Textarea('with_validation')
                    .label('With Validation')
                    .description('Required field with min/max length validation')
                    .placeholder('Must be between 10 and 200 characters...')
                    .required(true)
                    .minLength(10)
                    .maxLength(200),

                Textarea('with_counter')
                    .label('Character Counter')
                    .description('Shows character count when maxLength is set')
                    .placeholder('Type to see the character counter...')
                    .maxLength(150)
                    .rows(4),

                Textarea('with_default')
                    .label('With Default Value')
                    .description('Textarea pre-filled with default content')
                    .defaultValue('This is some default content that appears when the form loads.')
                    .rows(3),
            ])
            .tab('Auto-Resize', [
                Textarea('auto_resize_basic')
                    .label('Auto-Resize (Basic)')
                    .description('Automatically grows and shrinks based on content')
                    .placeholder('Start typing and watch it grow...')
                    .autoResize(true),

                Textarea('auto_resize_constrained')
                    .label('Auto-Resize (Constrained)')
                    .description('Auto-resize with minimum and maximum row limits')
                    .placeholder('This will grow from 2 rows up to 8 rows maximum...')
                    .autoResize(true)
                    .minRows(2)
                    .maxRows(8),

                Textarea('auto_resize_single_line')
                    .label('Auto-Resize (Single Line Start)')
                    .description('Starts as a single line and expands as needed')
                    .placeholder('Starts small, grows as you type...')
                    .autoResize(true)
                    .minRows(1)
                    .maxRows(6),

                Textarea('auto_resize_with_max_chars')
                    .label('Auto-Resize + Character Limit')
                    .description('Combines auto-resize with character counting')
                    .placeholder('Auto-resizing textarea with 280 character limit...')
                    .autoResize(true)
                    .minRows(2)
                    .maxRows(5)
                    .maxLength(280),
            ])
            .tab('Manual Resize Control', [
                Textarea('resize_none')
                    .label('No Resize')
                    .description('Manual resizing is completely disabled')
                    .placeholder('You cannot manually resize this textarea...')
                    .resize('none')
                    .rows(4),

                Textarea('resize_vertical')
                    .label('Vertical Resize (Default)')
                    .description('Can only be resized vertically (up and down)')
                    .placeholder('Drag the bottom edge to resize vertically...')
                    .resize('vertical')
                    .rows(4),

                Textarea('resize_horizontal')
                    .label('Horizontal Resize')
                    .description('Can only be resized horizontally (left and right)')
                    .placeholder('Drag the right edge to resize horizontally...')
                    .resize('horizontal')
                    .rows(4),

                Textarea('resize_both')
                    .label('Resize Both Directions')
                    .description('Can be resized both vertically and horizontally')
                    .placeholder('Drag the bottom-right corner to resize in any direction...')
                    .resize('both')
                    .rows(4),
            ])
            .tab('Prefix & Suffix', [
                Textarea('with_prefix_icon')
                    .label('With Prefix Icon')
                    .description('Textarea with an icon at the start')
                    .prefix(<MessageSquare size={16} />)
                    .placeholder('Type your message here...')
                    .autoResize(true)
                    .minRows(2)
                    .maxRows(6),

                Textarea('with_suffix_icon')
                    .label('With Suffix Icon')
                    .description('Textarea with an icon at the end')
                    .suffix(<Hash size={16} />)
                    .placeholder('Enter tags or keywords...')
                    .rows(3),

                Textarea('with_both_icons')
                    .label('With Prefix & Suffix')
                    .description('Textarea with icons on both sides')
                    .prefix(<User size={16} />)
                    .suffix(<Star size={16} />)
                    .placeholder('Write a featured bio...')
                    .autoResize(true)
                    .minRows(3)
                    .maxRows(8),

                Textarea('with_text_prefix')
                    .label('With Text Prefix')
                    .description('Textarea with text prefix instead of icon')
                    .prefix(<span className="text-xs font-semibold">NOTE:</span>)
                    .placeholder('Add your note here...')
                    .autoResize(true)
                    .minRows(2)
                    .maxRows(5),

                Textarea('with_badge_suffix')
                    .label('With Badge Suffix')
                    .description('Textarea with a status badge as suffix')
                    .suffix(<span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">Draft</span>)
                    .placeholder('Draft your content...')
                    .rows(5),
            ])
            .tab('Real-World Examples', [
                Textarea('product_review')
                    .label('Product Review')
                    .description('Share your experience with this product')
                    .placeholder('What did you think about this product?')
                    .prefix(<Star size={16} />)
                    .required(true)
                    .minLength(50)
                    .maxLength(1000)
                    .autoResize(true)
                    .minRows(4)
                    .maxRows(15),

                Textarea('code_snippet')
                    .label('Code Snippet')
                    .description('Paste your code here (supports manual resizing)')
                    .placeholder('// Paste your code here...')
                    .prefix(<Code size={16} />)
                    .resize('both')
                    .rows(10)
                    .maxLength(5000),

                Textarea('quick_comment')
                    .label('Quick Comment')
                    .description('Add a short comment (Twitter-style, 280 chars)')
                    .placeholder('Share your thoughts...')
                    .autoResize(true)
                    .minRows(1)
                    .maxRows(5)
                    .maxLength(280),

                Textarea('email_message')
                    .label('Email Message')
                    .description('Compose your email message')
                    .prefix(<Mail size={16} />)
                    .placeholder('Dear [Name],\n\nI hope this message finds you well...')
                    .required(true)
                    .minLength(20)
                    .autoResize(true)
                    .minRows(6)
                    .maxRows(20),

                Textarea('event_description')
                    .label('Event Description')
                    .description('Describe your event in detail')
                    .prefix(<Calendar size={16} />)
                    .placeholder('Provide a detailed description of the event...')
                    .required(true)
                    .minLength(100)
                    .maxLength(2000)
                    .rows(8),

                Textarea('feedback_form')
                    .label('Feedback or Concerns')
                    .description('We value your feedback! Let us know how we can improve.')
                    .prefix(<AlertCircle size={16} />)
                    .placeholder('Please share your feedback or concerns...')
                    .autoResize(true)
                    .minRows(3)
                    .maxRows(10)
                    .maxLength(500),

                Textarea('social_bio')
                    .label('Social Media Bio')
                    .description('Write a compelling bio (160 chars max)')
                    .prefix(<User size={16} />)
                    .placeholder('Describe yourself in a few words...')
                    .maxLength(160)
                    .autoResize(true)
                    .minRows(2)
                    .maxRows(4),

                Textarea('article_notes')
                    .label('Article Notes')
                    .description('Draft notes for your article')
                    .prefix(<FileText size={16} />)
                    .suffix(<span className="text-xs text-muted-foreground">Autosave</span>)
                    .placeholder('Start drafting your notes...')
                    .autoResize(true)
                    .minRows(5)
                    .maxRows(25),
            ])
            .tab('Feature Combinations', [
                Textarea('feature_combo_1')
                    .label('Combo: Auto-resize + Validation + Icon')
                    .description('Auto-resizing with character limits and validation')
                    .prefix(<MessageSquare size={16} />)
                    .required(true)
                    .minLength(20)
                    .maxLength(500)
                    .autoResize(true)
                    .minRows(3)
                    .maxRows(10)
                    .placeholder('Required: 20-500 characters, auto-resizing...'),

                Textarea('feature_combo_2')
                    .label('Combo: Fixed Size + No Resize + Counter')
                    .description('Locked size with character counter')
                    .resize('none')
                    .rows(5)
                    .maxLength(300)
                    .placeholder('Fixed height, cannot resize, 300 char limit...'),

                Textarea('feature_combo_3')
                    .label('Combo: Both Icons + Auto-resize + Validation')
                    .description('Full-featured textarea with all options')
                    .prefix(<Code size={16} />)
                    .suffix(<Hash size={16} />)
                    .required(true)
                    .minLength(10)
                    .maxLength(1000)
                    .autoResize(true)
                    .minRows(2)
                    .maxRows(12)
                    .placeholder('Feature-rich textarea with everything enabled...'),
            ])
    ],
    'Comprehensive showcase of all textarea field configurations and features',
    'textarea-showcase'
);
