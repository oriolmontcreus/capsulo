import { CommitViewer } from '@/components/admin/HistoryViewer';
import { useAdminNavigation } from '@/lib/stores';

/**
 * History page wrapper for /admin/history
 * 
 * The HistoryList is already rendered in the sidebar by AppSidebar when activeView === 'history'.
 * This component renders the CommitViewer for the selected commit from the Zustand store.
 */
export default function HistoryPage() {
    const { selectedCommit } = useAdminNavigation();

    if (!selectedCommit) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-41px)] text-muted-foreground">
                <div className="text-center">
                    <p className="text-lg font-medium">Select a commit from the list</p>
                    <p className="text-sm mt-1">Use the sidebar to browse commit history</p>
                </div>
            </div>
        );
    }

    return <CommitViewer commitSha={selectedCommit} />;
}
