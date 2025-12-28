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
        <div className={`space-y-4 ${className}`}>
            <Textarea
                placeholder="Your commit message..."
                className={`resize-none h-24 text-sm ${textareaClassName}`}
                value={commitMessage}
                onChange={(e) => onCommitMessageChange(e.target.value)}
            />
            <Button
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                onClick={onPublish}
            >
                Commit changes
            </Button>
        </div>
    );
}
