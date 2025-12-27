import { capsuloConfig } from './config';

const SHARED_DRAFT_BRANCH = 'cms-draft';

/**
 * Standardized UTF-8 Base64 encoding for GitHub content
 */
export const encodeContent = (content: string): string => {
  return btoa(unescape(encodeURIComponent(content)));
};

/**
 * Standardized UTF-8 Base64 decoding for GitHub content
 */
export const decodeContent = (base64Content: string): string => {
  return decodeURIComponent(escape(atob(base64Content.replace(/\n/g, ''))));
};

/**
 * Centrally managed GitHub API client
 */
export class GitHubAPI {
  private token: string;
  private owner: string;
  private repo: string;
  private baseUrl: string;

  // Static cache for user info and branch checks to avoid redundant API hits
  private static cache: {
    username: string | null;
    branchExists: Record<string, { value: boolean; timestamp: number }>;
  } = {
      username: null,
      branchExists: {},
    };

  private static CACHE_TTL = 30000; // 30 seconds

  constructor(token?: string, owner?: string, repo?: string) {
    // Priority: Explicit token > localStorage (client side) > empty
    this.token = token || (typeof window !== 'undefined' ? localStorage.getItem('github_access_token') : null) || '';

    // Priority: Explicit owner/repo > capsuloConfig
    this.owner = owner || capsuloConfig.github.owner;
    this.repo = repo || capsuloConfig.github.repo;

    this.baseUrl = `https://api.github.com/repos/${this.owner}/${this.repo}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < GitHubAPI.CACHE_TTL;
  }

  /**
   * Clears the internal branch cache
   */
  public clearBranchCache(branchName?: string): void {
    if (branchName) {
      delete GitHubAPI.cache.branchExists[branchName];
    } else {
      GitHubAPI.cache.branchExists = {};
    }
  }

  private async fetch(endpoint: string, options: RequestInit = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
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
      // Special handling for 404 to avoid throwing on common "not found" checks
      if (response.status === 404) {
        const err = new Error('Not found');
        (err as any).status = 404;
        throw err;
      }
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Retrieves the authenticated user's login name
   */
  async getAuthenticatedUser(): Promise<string> {
    if (GitHubAPI.cache.username) return GitHubAPI.cache.username;

    const user = await this.fetch('https://api.github.com/user');

    if (!user.login) {
      throw new Error('User login not found');
    }

    GitHubAPI.cache.username = user.login;
    return GitHubAPI.cache.username as string;
  }

  /**
   * Returns the shared draft branch name (same for all users)
   * All CMS users collaborate on the same draft branch to avoid merge conflicts.
   */
  getDraftBranch(): string {
    return SHARED_DRAFT_BRANCH;
  }

  /**
   * @deprecated Use getDraftBranch() instead. Kept for backward compatibility.
   */
  async getUserDraftBranch(): Promise<string> {
    return SHARED_DRAFT_BRANCH;
  }

  /**
   * Checks if a branch exists, using cache for performance
   */
  async checkBranchExists(branchName: string): Promise<boolean> {
    const cached = GitHubAPI.cache.branchExists[branchName];
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.value;
    }

    try {
      await this.fetch(`/git/ref/heads/${branchName}`);
      GitHubAPI.cache.branchExists[branchName] = { value: true, timestamp: Date.now() };
      return true;
    } catch (error: any) {
      GitHubAPI.cache.branchExists[branchName] = { value: false, timestamp: Date.now() };
      return false;
    }
  }

  /**
   * Ensures a branch exists. Creates it from main if it doesn't.
   */
  async ensureBranch(branchId: string): Promise<string> {
    const exists = await this.checkBranchExists(branchId);
    if (exists) return branchId;

    const mainBranch = await this.getMainBranch();
    const ref = await this.fetch(`/git/ref/heads/${mainBranch}`);
    const sha = ref.object.sha;

    await this.fetch('/git/refs', {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchId}`,
        sha,
      }),
    });

    this.clearBranchCache(branchId);
    return branchId;
  }

  /**
   * Gets the default branch of the repository
   */
  async getMainBranch(): Promise<string> {
    const repo = await this.fetch('');
    return repo.default_branch;
  }

  /**
   * Fetches the SHA of a file on a specific branch
   */
  async getFileSha(path: string, branch: string): Promise<string | null> {
    try {
      const file = await this.fetch(`/contents/${path}?ref=${branch}`);
      return file.sha;
    } catch (error: any) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  /**
   * Atomic commit: ensures branch and commits file with SHA handling
   */
  async commitContent(options: {
    path: string;
    content: string;
    message: string;
    branch: string;
    ensureBranch?: boolean;
  }): Promise<void> {
    const { path, content, message, branch, ensureBranch = true } = options;

    if (ensureBranch) {
      await this.ensureBranch(branch);
    }

    const sha = await this.getFileSha(path, branch);
    const contentBase64 = encodeContent(content);

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

  /**
   * Merges one branch into another
   */
  async mergeBranch(fromBranch: string, toBranch: string): Promise<void> {
    await this.fetch('/merges', {
      method: 'POST',
      body: JSON.stringify({
        base: toBranch,
        head: fromBranch,
        commit_message: `Publish changes from ${fromBranch}`,
      }),
    });
  }

  /**
   * Deletes a branch and clears cache
   */
  async deleteBranch(branchName: string): Promise<void> {
    await this.fetch(`/git/refs/heads/${branchName}`, {
      method: 'DELETE',
    });
    this.clearBranchCache(branchName);
  }

  /**
   * Checks if the shared draft branch exists
   */
  async listDraftBranches(): Promise<string[]> {
    const exists = await this.checkBranchExists(SHARED_DRAFT_BRANCH);
    return exists ? [SHARED_DRAFT_BRANCH] : [];
  }

  /**
   * Gets and decodes file content
   */
  async getFileContent(path: string, branch: string): Promise<any> {
    try {
      const file = await this.fetch(`/contents/${path}?ref=${branch}`);
      if (!file.content) return null;
      const content = decodeContent(file.content);
      return JSON.parse(content);
    } catch (error: any) {
      if (error.status === 404) return null;
      console.error(`Failed to get file content: ${path}`, error);
      return null;
    }
  }
}
