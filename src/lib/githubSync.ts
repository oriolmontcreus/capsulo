import { GitHubAPI } from './github-api';

const DEFAULT_DRAFT_BRANCH = 'cms-draft';

export interface GitHubSyncOptions {
    /** GitHub access token for authentication */
    githubToken: string;
    /** The data to commit (will be JSON stringified) */
    data: unknown;
    /** The file path relative to repo root (e.g., 'src/content/pages/home.json') */
    path: string;
    /** The commit message */
    commitMessage: string;
    /** Optional: The draft branch name. Defaults to 'cms-draft' */
    draftBranch?: string;
}

export interface GitHubSyncResult {
    /** Whether the file was successfully synced to GitHub */
    githubSynced: boolean;
    /** The draft branch name if synced, null otherwise */
    draftBranch: string | null;
}

/**
 * Syncs a file to GitHub on a draft branch.
 * Ensures the draft branch exists (creating it from main if needed) and commits the file.
 *
 * @param options - The sync options
 * @returns The sync result with githubSynced flag and draftBranch name
 */
export async function syncToGitHub(options: GitHubSyncOptions): Promise<GitHubSyncResult> {
    const {
        githubToken,
        data,
        path,
        commitMessage,
        draftBranch = DEFAULT_DRAFT_BRANCH,
    } = options;

    try {
        const github = new GitHubAPI(githubToken);

        // Ensure draft branch exists
        const exists = await github.checkBranchExists(draftBranch);
        if (!exists) {
            const mainBranch = await github.getMainBranch();
            await github.createBranch(draftBranch, mainBranch);
            console.log(`[GitHub Sync] Created draft branch: ${draftBranch}`);
        }

        // Commit the file
        const content = JSON.stringify(data, null, 2);
        await github.commitFile(path, content, commitMessage, draftBranch);
        console.log(`[GitHub Sync] Synced ${path} to branch: ${draftBranch}`);

        return {
            githubSynced: true,
            draftBranch,
        };
    } catch (error: any) {
        console.warn(`[GitHub Sync] Failed to sync ${path}: ${error.message}`);
        return {
            githubSynced: false,
            draftBranch: null,
        };
    }
}
