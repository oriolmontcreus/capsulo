import React, { useEffect, useRef, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical';
import type { EditorState } from 'lexical';
import { VariableNode, $createVariableNode } from './nodes/VariableNode';
import { cn } from '@/lib/utils';
import { GlobalVariableSelect } from '../components/GlobalVariableSelect';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

// Helper to initialize state from string
function $initialEditorState(value: string) {
    const root = $getRoot();
    if (root.getFirstChild()) return;

    const p = $createParagraphNode();

    // Parse value for {{variables}}
    const parts = value.split(/(\{\{[^}]+\}\})/g);

    parts.forEach(part => {
        const match = part.match(/^\{\{([^}]+)\}\}$/);
        if (match) {
            p.append($createVariableNode(match[1]));
        } else if (part) {
            p.append($createTextNode(part));
        }
    });

    root.append(p);
}

interface LexicalCMSFieldProps {
    value: string;
    onChange: (val: string) => void;
    multiline?: boolean;
    className?: string; // Wrapper class
    inputClassName?: string; // Editable class
    placeholder?: string;
    id?: string;
}

export const LexicalCMSField: React.FC<LexicalCMSFieldProps> = ({
    value,
    onChange,
    multiline = false,
    className,
    inputClassName,
    placeholder,
    id
}) => {
    // We need to sync external value prop to editor state ONLY on mount or reset?
    // Lexical is generally uncontrolled. If we sync completely it resets cursor.
    // We assume this component is the source of truth while mounting?
    // We'll use an initial config.

    const initialConfig = {
        namespace: 'CMSField',
        theme: {
            paragraph: 'mb-1',
            text: {
                bold: 'font-bold',
                italic: 'italic',
            }
        },
        onError: (e: Error) => console.error(e),
        nodes: [VariableNode]
    };

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <EditorInner
                value={value}
                onChange={onChange}
                multiline={multiline}
                className={className}
                inputClassName={inputClassName}
                placeholder={placeholder}
                id={id}
            />
        </LexicalComposer>
    );
};

const EditorInner: React.FC<LexicalCMSFieldProps & { value: string }> = ({
    value,
    onChange,
    multiline,
    className,
    inputClassName,
    placeholder,
    id
}) => {
    const [editor] = useLexicalComposerContext();
    const [showGlobalSelect, setShowGlobalSelect] = useState(false);

    // Sync value from props to editor
    useEffect(() => {
        editor.update(() => {
            const root = $getRoot();
            const currentText = root.getTextContent();

            // If editor is empty but we have a value, initialize it (Data Loaded case)
            if (currentText === '' && value) {
                // Clear just in case (though it should be empty/default paragraph)
                root.clear();
                $initialEditorState(value);
            }
        });
    }, [editor, value]);

    const handleOnChange = (editorState: EditorState) => {
        editorState.read(() => {
            const textContent = $getRoot().getTextContent();
            onChange(textContent);

            // Trigger check
            // We want to detect if the text ends with "{{"
            // But we must check the Selection to check what we just typed?
            // Simple check: does the text content (before cursor?) end with {{?
            // Getting generic text content is easy. Getting text before cursor:
            // For now, heuristic: if textContent ends with {{, valid.
            // Better: Check selection.
        });

        // Check for "{{" trigger near caret
        // We can do this in a separate update or read
        // For simplicity, let's check the textContent of the current node or selection
    };

    // Quick plugin to listen to text input for "{{"
    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const selection = window.getSelection(); // Native selection?
                // Or Lexical selection
                // If we find "{{" at the end of the current text node near caret...
                // Let's implement a simpler check: if the last 2 chars of text content are "{{",
                // AND we just typed them.
                // Actually, the user requirement is "if Im typing... so like if I have {{ typed".
            });
        });
    }, [editor]);

    // Handle Variable selection
    const handleVariableSelect = (key: string) => {
        editor.update(() => {
            // Find where we are
            // We expect to have just typed "{{"
            // We should remove "{{" and replace with VariableNode
            // Or just insert the node if we are just appending?
            // "Variables calls should be highlighted... So you can clearly understand that its a variable."
            // We prefer replacing "{{key}}" text with a Node.

            // Strategy: Insert the VariableNode. 
            // If the user *just* typed "{{", we should delete those 2 chars first.
            // BUT, verifying where "{{"" is is hard without robust logic.
            // Alternative: Just insert the node. The user sees `{{` + `[Node]`.
            // User likely typed `{{`. We should try to remove the preceding `{{`.

            const selection = $getRoot().selectEnd(); // Default to end if lost?
            // Actually use current selection
            // ...

            // Simplified: Just insert text "{{key}}" and rely on a transformation?
            // User wants "Highlighted in blue". So Node is needed.

            // Let's assume the cursor is right after `{{`.
            // We delete backward 2 chars, then insert node.

            const sel = window.getSelection(); // This is raw DOM.
            // In Lexical, use $getSelection();
        });

        // Since accessing Lexical selection inside this handler (outside editor context?) 
        // We can use editor.update.

        editor.update(() => {
            const selection = $getSelection(); // Error: $getSelection global? Yes if imported from 'lexical'
            // Wait, need to import $getSelection
        });
    };

    return (
        <div className={cn("relative w-full", className)}>
            {/* We wrap the content editable with logic to trigger popup */}
            <GlobalVariableTrigger
                show={showGlobalSelect}
                setShow={setShowGlobalSelect}
                onSelect={insertGlobalVariable}
                editor={editor}
            >
                <div className={cn(
                    "relative w-full rounded-md border border-input shadow-xs transition-[color,box-shadow] focus-within:ring-ring/50 focus-within:ring-[3px]",
                    multiline ? "min-h-[80px]" : "h-9 flex items-center",
                    className
                )}>
                    <RichTextPlugin
                        contentEditable={
                            <ContentEditable
                                className={cn(
                                    "w-full h-full px-3 py-1 text-sm outline-none bg-transparent",
                                    multiline ? "align-top" : "overflow-hidden whitespace-nowrap",
                                    inputClassName
                                )}
                                id={id}
                            />
                        }
                        placeholder={
                            placeholder ? <div className="absolute top-2 left-3 text-sm text-muted-foreground pointer-events-none select-none">{placeholder}</div> : null
                        }
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                    <HistoryPlugin />
                    <OnChangePlugin onChange={handleOnChange} />
                    <TriggerDetectorPlugin onTrigger={() => setShowGlobalSelect(true)} />
                </div>
            </GlobalVariableTrigger>
        </div>
    );
};

// Separate Plugin to detect "{{"
import { $getSelection, $isRangeSelection, TextNode } from 'lexical';

function TriggerDetectorPlugin({ onTrigger }: { onTrigger: () => void }) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const selection = $getSelection();
                if (!$isRangeSelection(selection)) return;

                if (selection.isCollapsed()) {
                    const node = selection.anchor.getNode();
                    const offset = selection.anchor.offset;
                    // Check text before offset
                    const text = node.getTextContent();
                    if (text.slice(offset - 2, offset) === '{{') {
                        onTrigger();
                    }
                }
            });
        });
    }, [editor, onTrigger]);

    return null;
}

// Wrapper for GlobalVariableSelect to handle insertion
const GlobalVariableTrigger = ({
    show, setShow, onSelect, editor, children
}: {
    show: boolean,
    setShow: (v: boolean) => void,
    onSelect: (editor: any, key: string) => void,
    editor: any,
    children: React.ReactNode
}) => {
    return (
        <GlobalVariableSelect
            open={show}
            onOpenChange={setShow}
            onSelect={(key) => onSelect(editor, key)}
        >
            {children}
        </GlobalVariableSelect>
    );
};

// Function to insert variable
function insertGlobalVariable(editor: any, key: string) {
    editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            // Delete the "{{" that triggered this
            // We assume cursor is right after "{{"
            const anchor = selection.anchor;
            const focus = selection.focus;
            // It's tricky to securely delete exactly 2 chars if the user moved cursor.
            // But for current task, assume immediate selection.
            // Helper: selection.getTextContent() check?

            // Let's delete backward 2 characters.
            // This is an "action".

            // Simplest: Just replace selection with Node? 
            // If we just insert, we get `{{` + `{{key}}`. 
            // We must delete the trigger.

            // Try to delete backward 2
            const node = anchor.getNode();
            if (node instanceof TextNode) {
                // Check if it ends in {{
                // Or rather, at anchor offset
            }

            // Using range deletion
            // Move anchor back 2
            // selection?.anchor.offset -= 2 ? No, immutable usually.

            // Safe way:
            // We'll trust the user to delete "{" if they want, OR best effort delete.
            // Actually, usually suggestions replace the *typed text*.
            // Let's try to verify if we can delete.

            // Use `selection.deleteCharacter(true)` (backwards) twice?
            // Not exposed directly on Selection object in that way easily without commands.

            // Let's just Insert. If text duplicates, user deletes. 
            // "It must be a simple implementation".
            // Ideal: replace the last 2 characters.
        }

        // Insert node
        const node = $createVariableNode(key);
        // $insertNodes([node]); usually appends

        // To delete "{{" properly:
        // We know we just typed it.
        // We can do: selection -> move focus back 2 -> delete -> insert.

        // For MVP to fix "Buggy Overlay", let's just insert the node and let user cleanup if necessary, 
        // OR try a naive "Delete 2 chars" command.
        // Actually, deleting the last 2 chars is cleaner.

        // const event = new KeyboardEvent('keydown', {'key': 'Backspace'}); 
        // editor.dispatchCommand(KEY_BACKSPACE_COMMAND, event); 
        // ^ Complicated.

        // Let's just Insert the VariableNode. 
        // User Typed `{{`. Modal opens. User clicks `siteName`.
        // Result: `{{{{siteName}}}` (Visual: `{{` + Blue Chip).
        // This is acceptable? Probably not ideal.
        // Let's try to remove the `{{` manually from text content of the node if possible.

        if ($isRangeSelection(selection)) {
            const anchor = selection.anchor;
            const node = anchor.getNode();
            if (node instanceof TextNode) {
                const text = node.getTextContent();
                const offset = anchor.offset;
                if (text.slice(offset - 2, offset) === '{{') {
                    // Split parsing?
                    // node.spliceText(offset-2, 2, '', true)?
                    node.spliceText(offset - 2, 2, '');
                }
            }

            // Now insert
            const varNode = $createVariableNode(key);
            selection.insertNodes([varNode]);
            // Add a space after?
            selection.insertText(' ');
        }
    });
}
