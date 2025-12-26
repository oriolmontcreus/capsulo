import { GitCommitIcon } from 'lucide-react';
import type { PageInfo } from '@/components/admin/AppWrapper';
import { CommitForm } from './CommitForm';
import { PagesList } from './PagesList';

interface ChangesSidebarProps {
    availablePages: PageInfo[];
    selectedPage: string;
    onPageSelect: (pageId: string) => void;
    commitMessage: string;
    onCommitMessageChange: (message: string) => void;
    onPublish: () => void;
}

export function ChangesSidebar({
    availablePages,
    selectedPage,
    onPageSelect,
    commitMessage,
    onCommitMessageChange,
    onPublish
}: ChangesSidebarProps) {
    return (
        <div className="flex bg-sidebar h-full flex-col border-r w-[250px] min-w-[250px]">
            <div className="p-4 font-semibold text-sidebar-foreground flex items-center gap-2 border-b">
                <GitCommitIcon className="w-4 h-4" />
                Commit
            </div>

            <div className="p-4 border-b">
                <CommitForm
                    commitMessage={commitMessage}
                    onCommitMessageChange={onCommitMessageChange}
                    onPublish={onPublish}
                />
            </div>

            <PagesList
                pages={availablePages}
                selectedPage={selectedPage}
                onPageSelect={onPageSelect}
            />
        </div>
    );
}
