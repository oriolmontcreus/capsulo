/**
 * Server-side GitHub API for development mode
 * Accepts a token passed from the client (from their localStorage)
 */

const DRAFT_BRANCH = 'cms-draft';
const DEFAULT_MAIN_BRANCH = 'main';

interface RepoConfig {
    owner: string;
    repo: string;
}

// Import config dynamically to get owner/repo
let _repoConfig: RepoConfig | null = null;

const getRepoConfig = async (): Promise<RepoConfig> => {
    if (_repoConfig) return _repoConfig;

    // Dynamic import of config
    const config = await import('@/../capsulo.config').then(m => m.default);
    _repoConfig = {
        owner: config.github.owner,
        repo: config.github.repo
    };
    return _repoConfig;
};

export class GitHubServerAPI {
    private token: string;
    private baseUrl: string = '';
    private initialized: boolean = false;

    constructor(token: string) {
        this.token = token;
        console.log(`[GitHubServerAPI] Initialized with token length: ${token?.length || 0}`);
    }

    private async ensureInitialized() {
        if (this.initialized) return;
        const { owner, repo } = await getRepoConfig();
        this.baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
        this.initialized = true;
    }

    private async fetch(endpoint: string, options: RequestInit = {}) {
        await this.ensureInitialized();

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Capsulo-CMS',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`[GitHubServerAPI] API error at ${endpoint}: ${response.status}`);
            console.error(`[GitHubServerAPI] Error response: ${error}`);
            throw new Error(`GitHub API error: ${response.status} - ${error}`);
        }

        console.log(`[GitHubServerAPI] Success: ${endpoint}`);

        return response.json();
    }

    async getMainBranch(): Promise<string> {
        try {
            const repo = await this.fetch('');
            return repo.default_branch || DEFAULT_MAIN_BRANCH;
        } catch {
            return DEFAULT_MAIN_BRANCH;
        }
    }

    async checkBranchExists(branchName: string): Promise<boolean> {
        try {
            await this.fetch(`/git/ref/heads/${branchName}`);
            return true;
        } catch {
            return false;
        }
    }

    async createBranch(branchName: string, fromBranch: string = 'main'): Promise<string> {
        const ref = await this.fetch(`/git/ref/heads/${fromBranch}`);
        const sha = ref.object.sha;

        await this.fetch('/git/refs', {
            method: 'POST',
            body: JSON.stringify({
                ref: `refs/heads/${branchName}`,
                sha,
            }),
        });

        return branchName;
    }

    async getFileSha(path: string, branch: string): Promise<string | null> {
        try {
            const file = await this.fetch(`/contents/${path}?ref=${branch}`);
            return file.sha;
        } catch {
            return null;
        }
    }

    async commitFile(path: string, content: string, message: string, branch: string): Promise<void> {
        const sha = await this.getFileSha(path, branch);
        const contentBase64 = Buffer.from(content, 'utf-8').toString('base64');

        await this.fetch(`/contents/${path}`, {
            method: 'PUT',
            body: JSON.stringify({
                message,
                content: contentBase64,
                branch,
                ...(sha ? { sha } : {}),
            }),
        });
    }

    async getFileContent(path: string, branch: string): Promise<any> {
        try {
            const file = await this.fetch(`/contents/${path}?ref=${branch}`);
            const content = Buffer.from(file.content, 'base64').toString('utf-8');
            return JSON.parse(content);
        } catch (error: any) {
            if (error.message?.includes('404')) {
                return null;
            }
            console.error(`Failed to get file content: ${path}`, error);
            return null;
        }
    }

    /**
     * Ensure the draft branch exists, creating it from main if needed
     */
    async ensureDraftBranch(): Promise<string> {
        console.log(`[GitHubServerAPI] Checking if draft branch '${DRAFT_BRANCH}' exists...`);
        const exists = await this.checkBranchExists(DRAFT_BRANCH);
        if (!exists) {
            console.log(`[GitHubServerAPI] Draft branch not found, creating from main...`);
            const mainBranch = await this.getMainBranch();
            await this.createBranch(DRAFT_BRANCH, mainBranch);
            console.log(`[GitHubServerAPI] Created draft branch '${DRAFT_BRANCH}'`);
        } else {
            console.log(`[GitHubServerAPI] Draft branch '${DRAFT_BRANCH}' already exists`);
        }
        return DRAFT_BRANCH;
    }

    /**
     * Commit page data to the draft branch
     */
    async commitPageToDraft(pageName: string, data: any): Promise<void> {
        const branch = await this.ensureDraftBranch();
        const filePath = `src/content/pages/${pageName}.json`;
        const content = JSON.stringify(data, null, 2);
        const message = `Update ${pageName} via CMS (dev mode)`;

        await this.commitFile(filePath, content, message, branch);
    }

    /**
     * Commit globals data to the draft branch
     */
    async commitGlobalsToDraft(data: any): Promise<void> {
        const branch = await this.ensureDraftBranch();
        const filePath = `src/content/globals.json`;
        const content = JSON.stringify(data, null, 2);
        const message = `Update global variables via CMS (dev mode)`;

        await this.commitFile(filePath, content, message, branch);
    }

    /**
     * Get the draft branch name
     */
    static getDraftBranch(): string {
        return DRAFT_BRANCH;
    }
}
