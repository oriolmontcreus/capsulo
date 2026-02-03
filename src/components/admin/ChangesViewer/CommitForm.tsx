import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CommitFormProps {
    commitMessage: string;
    onCommitMessageChange: (message: string) => void;
    onPublish: () => void;
    className?: string;
    textareaClassName?: string;
}

export function CommitForm({
    commitMessage,
    onCommitMessageChange,
    onPublish,
    className = '',
    textareaClassName = ''
}: CommitFormProps) {
    return (
        <div className={`space-y-4 ${className} relative`}>
            <Textarea
                placeholder="Your commit message..."
                className={`resize-none h-24 text-sm ${textareaClassName}`}
                value={commitMessage}
                onChange={(e) => onCommitMessageChange(e.target.value)}
                maxLength={50}
            />
            <div className="text-xs text-right text-muted-foreground absolute bottom-10 right-2"
                aria-live="polite"
                aria-atomic="true">
                {commitMessage.length}/50
            </div>
            <Button
                className="w-full text-white font-semibold"
                onClick={onPublish}
            >
                Commit changes
            </Button>
        </div>
    );
}
