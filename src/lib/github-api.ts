const DRAFT_BRANCH_PREFIX = 'cms-draft-';

const getGitHubToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('github_access_token');
};

let _repoOwner = 'oriolmontcreus';
let _repoName = 'capsulo';

export const setRepoInfo = (owner: string, repo: string) => {
  _repoOwner = owner;
  _repoName = repo;
};

const getRepoInfo = () => {
  return { owner: _repoOwner, repo: _repoName };
};

// Cache for user info and branch checks
const cache: {
  username: string | null;
  branchExists: Record<string, { value: boolean; timestamp: number }>;
} = {
  username: null,
  branchExists: {},
};

const CACHE_TTL = 30000; // 30 seconds

const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_TTL;
};

export class GitHubAPI {
  private token: string;
  private owner: string;
  private repo: string;
  private baseUrl: string;

  constructor(token?: string) {
    this.token = token || getGitHubToken() || '';
    const { owner, repo } = getRepoInfo();
    this.owner = owner;
    this.repo = repo;
    this.baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
  }

  async getAuthenticatedUser(): Promise<string> {
    // Check cache first
    if (cache.username) return cache.username;

    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get authenticated user');
    }

    const user = await response.json();

    if (!user.login) {
      throw new Error('User login not found');
    }

    // Cache the username
    cache.username = user.login as string;
    return cache.username;
  }

  async getUserDraftBranch(): Promise<string> {
    const username = await this.getAuthenticatedUser();
    return `${DRAFT_BRANCH_PREFIX}${username}`;
  }

  async checkBranchExists(branchName: string): Promise<boolean> {
    // Check cache first
    const cached = cache.branchExists[branchName];
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.value;
    }

    try {
      await this.fetch(`/git/ref/heads/${branchName}`);
      // Cache the result
      cache.branchExists[branchName] = { value: true, timestamp: Date.now() };
      return true;
    } catch {
      // Cache the result
      cache.branchExists[branchName] = { value: false, timestamp: Date.now() };
      return false;
    }
  }

  // Clear cache when changes are made
  clearBranchCache(branchName?: string): void {
    if (branchName) {
      delete cache.branchExists[branchName];
    } else {
      cache.branchExists = {};
    }
  }

  private async fetch(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getMainBranch() {
    const repo = await this.fetch('');
    return repo.default_branch;
  }

  async getFileSha(path: string, branch: string) {
    try {
      const file = await this.fetch(`/contents/${path}?ref=${branch}`);
      return file.sha;
    } catch {
      return null;
    }
  }

  async createBranch(branchName: string, fromBranch: string = 'main') {
    const ref = await this.fetch(`/git/ref/heads/${fromBranch}`);
    const sha = ref.object.sha;

    await this.fetch('/git/refs', {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha,
      }),
    });

    // Clear cache as we just created the branch
    this.clearBranchCache(branchName);
    return branchName;
  }

  async commitFile(path: string, content: string, message: string, branch: string) {
    const sha = await this.getFileSha(path, branch);
    const contentBase64 = btoa(unescape(encodeURIComponent(content)));

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

  async mergeBranch(fromBranch: string, toBranch: string) {
    await this.fetch('/merges', {
      method: 'POST',
      body: JSON.stringify({
        base: toBranch,
        head: fromBranch,
        commit_message: `Publish changes from ${fromBranch}`,
      }),
    });
  }

  async deleteBranch(branchName: string) {
    await this.fetch(`/git/refs/heads/${branchName}`, {
      method: 'DELETE',
    });

    // Clear cache as we just deleted the branch
    this.clearBranchCache(branchName);
  }

  async listBranches() {
    const branches = await this.fetch('/branches');
    return branches
      .filter((b: any) => b.name.startsWith(DRAFT_BRANCH_PREFIX))
      .map((b: any) => b.name);
  }

  async getFileContent(path: string, branch: string): Promise<any> {
    try {
      const file = await this.fetch(`/contents/${path}?ref=${branch}`);
      const content = atob(file.content.replace(/\n/g, ''));
      return JSON.parse(content);
    } catch (error: any) {
      // Don't log 404 errors as they're expected when files don't exist
      if (error.message && error.message.includes('404')) {
        return null;
      }
      console.error(`Failed to get file content: ${path}`, error);
      return null;
    }
  }
}

// No longer needed - we derive the branch name from the authenticated user
export const generateDraftBranchName = async (): Promise<string> => {
  const api = new GitHubAPI();
  return await api.getUserDraftBranch();
};
